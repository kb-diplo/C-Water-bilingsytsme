using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MyApi.Data;
using MyApi.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace MyApi.Services
{
    public class TokenService : ITokenService
    {
        private readonly IConfiguration _configuration;
        private readonly WaterBillingDbContext _context;
        private readonly ICacheService _cacheService;
        private readonly ILogger<TokenService> _logger;

        public TokenService(
            IConfiguration configuration,
            WaterBillingDbContext context,
            ICacheService cacheService,
            ILogger<TokenService> logger)
        {
            _configuration = configuration;
            _context = context;
            _cacheService = cacheService;
            _logger = logger;
        }

        public string GenerateAccessToken(Users user)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["SecretKey"]!));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("firstName", user.FirstName ?? ""),
                new Claim("lastName", user.LastName ?? ""),
                new Claim("jti", Guid.NewGuid().ToString()) // JWT ID for tracking
            };

            var token = new JwtSecurityToken(
                issuer: jwtSettings["Issuer"],
                audience: jwtSettings["Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(int.Parse(jwtSettings["ExpirationMinutes"]!)),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public string GenerateRefreshToken()
        {
            var randomNumber = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);
            return Convert.ToBase64String(randomNumber);
        }

        public async Task<bool> ValidateRefreshTokenAsync(string refreshToken, int userId)
        {
            try
            {
                var cacheKey = $"refresh_token:{userId}:{refreshToken}";
                var cachedToken = await _cacheService.GetAsync<string>(cacheKey);
                
                if (cachedToken != null)
                {
                    return true;
                }

                // Fallback to database check
                var tokenExists = await _context.RefreshTokens
                    .AnyAsync(rt => rt.Token == refreshToken && 
                                   rt.UserId == userId && 
                                   rt.ExpiryDate > DateTime.UtcNow && 
                                   !rt.IsRevoked);

                return tokenExists;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating refresh token for user {UserId}", userId);
                return false;
            }
        }

        public async Task SaveRefreshTokenAsync(int userId, string refreshToken)
        {
            try
            {
                var expiryDate = DateTime.UtcNow.AddDays(7); // 7 days expiry

                // Save to database
                var refreshTokenEntity = new RefreshToken
                {
                    Token = refreshToken,
                    UserId = userId,
                    ExpiryDate = expiryDate,
                    CreatedDate = DateTime.UtcNow,
                    IsRevoked = false
                };

                _context.RefreshTokens.Add(refreshTokenEntity);
                await _context.SaveChangesAsync();

                // Cache for quick access
                var cacheKey = $"refresh_token:{userId}:{refreshToken}";
                await _cacheService.SetAsync(cacheKey, refreshToken, TimeSpan.FromDays(7));

                _logger.LogDebug("Saved refresh token for user {UserId}", userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving refresh token for user {UserId}", userId);
                throw;
            }
        }

        public async Task RevokeRefreshTokenAsync(string refreshToken)
        {
            try
            {
                var token = await _context.RefreshTokens
                    .FirstOrDefaultAsync(rt => rt.Token == refreshToken);

                if (token != null)
                {
                    token.IsRevoked = true;
                    token.RevokedDate = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    // Remove from cache
                    var cacheKey = $"refresh_token:{token.UserId}:{refreshToken}";
                    await _cacheService.RemoveAsync(cacheKey);
                }

                _logger.LogDebug("Revoked refresh token");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error revoking refresh token");
                throw;
            }
        }

        public async Task RevokeAllUserTokensAsync(int userId)
        {
            try
            {
                var userTokens = await _context.RefreshTokens
                    .Where(rt => rt.UserId == userId && !rt.IsRevoked)
                    .ToListAsync();

                foreach (var token in userTokens)
                {
                    token.IsRevoked = true;
                    token.RevokedDate = DateTime.UtcNow;

                    // Remove from cache
                    var cacheKey = $"refresh_token:{userId}:{token.Token}";
                    await _cacheService.RemoveAsync(cacheKey);
                }

                await _context.SaveChangesAsync();
                _logger.LogDebug("Revoked all refresh tokens for user {UserId}", userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error revoking all tokens for user {UserId}", userId);
                throw;
            }
        }
    }
}
