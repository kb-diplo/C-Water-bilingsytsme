using MyApi.Models;

namespace MyApi.Services
{
    public interface ITokenService
    {
        string GenerateAccessToken(Users user);
        string GenerateRefreshToken();
        Task<bool> ValidateRefreshTokenAsync(string refreshToken, int userId);
        Task SaveRefreshTokenAsync(int userId, string refreshToken);
        Task RevokeRefreshTokenAsync(string refreshToken);
        Task RevokeAllUserTokensAsync(int userId);
    }
}
