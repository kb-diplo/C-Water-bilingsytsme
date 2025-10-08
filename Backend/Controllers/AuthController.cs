using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using MyApi.Data;
using MyApi.Models;
using MyApi.Services;

namespace MyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly WaterBillingDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IPasswordHasher<Users> _passwordHasher;
        private readonly ILogger<AuthController> _logger;
        private readonly IEmailService _emailService;

        public AuthController(
            WaterBillingDbContext context, 
            IConfiguration configuration, 
            IPasswordHasher<Users> passwordHasher,
            ILogger<AuthController> logger,
            IEmailService emailService) =>
            (_context, _configuration, _passwordHasher, _logger, _emailService) = 
            (context, configuration, passwordHasher, logger, emailService);
        

        // REGISTER (Admin or MeterReader only)
        [HttpPost("register")]
        [Authorize]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            var currentUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Username != null && u.Username.ToLower() == User.Identity!.Name!.ToLower());
                
            if (currentUser is null) 
                return Unauthorized("Invalid user.");
                
            // Admin can create any role, MeterReader can only create Client
            if (currentUser.Role == "MeterReader" && dto.Role != "Client") 
                return Forbid("MeterReader can only register Client users.");
                
            if (await _context.Users.AnyAsync(u => u.Username != null && u.Username.ToLower() == dto.Username.ToLower())) 
                return BadRequest("Username already exists.");

            var user = new Users
            {
                Username = dto.Username,
                Email = dto.Email,
                Role = dto.Role,
                IsActive = true,
                PasswordHash = _passwordHasher.HashPassword(null!, dto.Password)
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync(); // Save user first to get ID

            // If registering as Client, automatically create Client record
            if (dto.Role.Equals("Client", StringComparison.OrdinalIgnoreCase))
            {
                var client = new Client
                {
                    FirstName = dto.Username, // Use username as placeholder for FirstName
                    LastName = "Client", // Placeholder - can be updated later
                    Email = dto.Email,
                    Phone = "", 
                    MeterNumber = "", 
                    Location = "", 
                    ConnectionStatus = "Pending",
                    CreatedByUserId = user.Id,
                    CreatedDate = DateTime.UtcNow,
                    IsActive = true
                };

                _context.Clients.Add(client);
            }
            
            // Remove bootstrap admin if creating a new admin
            if (dto.Role == "Admin")
            {
                var bootstrapAdmins = await _context.Users
                    .Where(u => u.IsBootstrap)
                    .ToListAsync();
                    
                if (bootstrapAdmins.Count > 0)
                {
                    _context.Users.RemoveRange(bootstrapAdmins);
                }
            }
            
            await _context.SaveChangesAsync();
            
            var message = dto.Role.Equals("Client", StringComparison.OrdinalIgnoreCase) 
                ? $"User '{dto.Username}' registered as {dto.Role} and added to Clients"
                : $"User '{dto.Username}' registered as {dto.Role}";
            
            return Ok(new UserResponse(message, user.Username, user.Role));
        }

        // LOGIN
        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            try
            {
                _logger.LogInformation("Login attempt for username: {Username}", dto.Username);
                
                // Validate input
                if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
                {
                    _logger.LogWarning("Login attempt with empty username or password");
                    return Unauthorized("Username and password are required.");
                }

                // Check database connection
                if (!await _context.Database.CanConnectAsync())
                {
                    _logger.LogError("Database connection failed during login attempt");
                    return StatusCode(500, "Database connection error. Please try again later.");
                }

                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Username != null && u.Username.ToLower() == dto.Username.ToLower());
                    
                if (user is null) 
                {
                    _logger.LogWarning("Login failed: User not found for username: {Username}", dto.Username);
                    return Unauthorized("Invalid username or password.");
                }
                    
                if (!user.IsActive) 
                {
                    _logger.LogWarning("Login failed: Inactive user: {Username}", dto.Username);
                    return Unauthorized("This account has been deactivated. Please contact an administrator.");
                }
                    
                var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);
                
                if (result == PasswordVerificationResult.Failed) 
                {
                    _logger.LogWarning("Login failed: Invalid password for username: {Username}", dto.Username);
                    return Unauthorized("Invalid username or password.");
                }
                
                var token = GenerateJwtToken(user);
                
                // Get dashboard data based on role - ADD SPECIFIC ERROR LOGGING HERE
                object? dashboardData = null;
                try 
                {
                    dashboardData = user.Role switch
                    {
                        "Admin" => await GetAdminDashboard(),
                        "MeterReader" => await GetMeterReaderDashboard(),
                        "Client" => await GetClientDashboard(user.Id),
                        _ => null
                    };
                }
                catch (Exception dashEx)
                {
                    _logger.LogError(dashEx, "DASHBOARD ERROR for user {Username} with role {Role}: {Message}", 
                        user.Username, user.Role, dashEx.Message);
                    // Continue without dashboard data - don't fail the login
                }
                
                _logger.LogInformation("Login successful for user: {Username} with role: {Role}", user.Username, user.Role);
                
                return Ok(new UserResponse(
                    $"Login successful as {user.Role}",
                    user.Username,
                    user.Role)
                {
                    Token = token,
                    Email = user.Email,
                    DashboardData = dashboardData
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CRITICAL LOGIN ERROR for username: {Username}. Error: {ErrorMessage}", dto.Username, ex.Message);
                return StatusCode(500, "An error occurred during login. Please try again later.");
            }
        }

        // FORGOT PASSWORD
        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower() && u.IsActive);

                // Always return success for security (don't reveal if email exists)
                var response = new { message = "If an account with that email exists, a password reset link has been sent." };

                if (user != null)
                {
                    // Generate secure reset token
                    var resetToken = GenerateSecureToken();
                    user.ResetToken = resetToken;
                    user.ResetTokenExpiry = DateTime.UtcNow.AddMinutes(15);

                    await _context.SaveChangesAsync();

                    // Get first name from client record or use username
                    var client = await _context.Clients
                        .FirstOrDefaultAsync(c => c.CreatedByUserId == user.Id);
                    var firstName = client?.FirstName ?? user.Username;

                    // Send email
                    var emailSent = await _emailService.SendPasswordResetEmailAsync(user.Email, firstName, resetToken);
                    
                    if (emailSent)
                    {
                        _logger.LogInformation("Password reset email sent successfully to {Email}", user.Email);
                    }
                    else
                    {
                        _logger.LogError("Failed to send password reset email to {Email}", user.Email);
                    }
                }

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing forgot password request for email: {Email}", dto.Email);
                return StatusCode(500, "An error occurred while processing your request. Please try again later.");
            }
        }

        // RESET PASSWORD
        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword(ResetPasswordDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.ResetToken == dto.Token && u.IsActive);

                if (user == null)
                {
                    return BadRequest("Invalid or expired reset token.");
                }

                // Check if token has expired
                if (user.ResetTokenExpiry == null || user.ResetTokenExpiry < DateTime.UtcNow)
                {
                    return BadRequest("Reset token has expired. Please request a new password reset.");
                }

                // Update password and clear reset token
                user.PasswordHash = _passwordHasher.HashPassword(user, dto.NewPassword);
                user.ResetToken = null;
                user.ResetTokenExpiry = null;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Password successfully reset for user: {Email}", user.Email);

                return Ok(new { message = "Password has been successfully reset. You can now log in with your new password." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting password for token: {Token}", dto.Token);
                return StatusCode(500, "An error occurred while resetting your password. Please try again later.");
            }
        }

        // List all users (Admin and MeterReader only) - Case insensitive role check
        [HttpGet("users")]
        [Authorize(Policy = "RequireAdminOrMeterReader")]
        public async Task<IActionResult> GetUsers()
        {
            try 
            {
                var currentUsername = User.Identity?.Name ?? "Unknown";
                var currentUserRole = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value ?? "No Role";
                
                _logger.LogInformation("GetUsers called by {Username} (Role: {Role})", currentUsername, currentUserRole);
                
                // Check if user is authorized (case-insensitive role check)
                var userRoles = User.FindAll(ClaimTypes.Role)
                    .Select(c => c.Value.ToLowerInvariant())
                    .ToHashSet();
                    
                if (!userRoles.Contains("admin") && !userRoles.Contains("meterreader"))
                {
                    _logger.LogWarning("Unauthorized access attempt by {Username}. User roles: {UserRoles}", 
                        currentUsername, string.Join(", ", userRoles));
                    return Forbid("Insufficient permissions");
                }

                // Get users with error handling
                var users = await _context.Users
                    .AsNoTracking()
                    .OrderBy(u => u.Username)
                    .ToListAsync();

                // Map to anonymous objects with camelCase properties
                var userDtos = users.Select(u => new
                {
                    id = u.Id,
                    username = u.Username ?? "N/A",
                    email = u.Email ?? "No Email",
                    role = u.Role ?? "No Role",
                    isBootstrap = u.IsBootstrap,
                    isActive = u.IsActive,
                    createdDate = u.CreatedDate
                }).ToList();

                _logger.LogInformation("Successfully retrieved {Count} users", userDtos.Count);
                return Ok(userDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving users. Error: {ErrorMessage}", ex.Message);
                return StatusCode(
                    StatusCodes.Status500InternalServerError, 
                    "An error occurred while retrieving users. Please try again later.");
            }
        }

        // Delete user by username (Admin only)
        [HttpDelete("users/{username}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteUser(string username)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("DeleteUser called for username: {Username}", username);

                if (string.IsNullOrWhiteSpace(username))
                    return BadRequest("Username is required");

                // Get user with all related data that might cause foreign key constraint
                var user = await _context.Users
                    .Include(u => u.Clients)
                    .Include(u => u.MeterReadings)
                    .Include(u => u.Bills)
                    .Include(u => u.Payments)
                    .FirstOrDefaultAsync(u => u.Username != null && u.Username.ToLower() == username.ToLower());

                if (user == null)
                    return NotFound($"User '{username}' not found");

                // Prevent deleting own account
                var currentUsername = User.Identity?.Name;
                if (user.Username != null && currentUsername != null && user.Username.ToLower() == currentUsername.ToLower())
                    return BadRequest("You cannot delete your own account");

                _logger.LogInformation("Found user with ID: {UserId}, Role: {UserRole}", user.Id, user.Role);

                // If user has related data, handle it appropriately
                if (user.Clients?.Any() == true)
                {
                    _logger.LogInformation("User has {Count} related clients. Updating...", user.Clients.Count);
                    // Find another admin to reassign the clients to
                    var adminUser = await _context.Users
                        .FirstOrDefaultAsync(u => u.Role == "Admin" && u.Id != user.Id);
                    
                    foreach (var client in user.Clients)
                    {
                        client.CreatedByUserId = adminUser?.Id ?? 1; // Default to admin with ID 1 if no other admin found
                    }
                }

                if (user.MeterReadings?.Any() == true)
                {
                    _logger.LogInformation("User has {Count} related meter readings. Updating...", user.MeterReadings.Count);
                    // Find another admin to reassign the readings to
                    var adminUser = await _context.Users
                        .FirstOrDefaultAsync(u => u.Role == "Admin" && u.Id != user.Id);
                    
                    var newUserId = adminUser?.Id ?? 1; // Default to admin with ID 1 if no other admin found
                    
                    foreach (var reading in user.MeterReadings)
                    {
                        reading.RecordedByUserId = newUserId;
                    }
                }

                // Save changes before deleting the user
                await _context.SaveChangesAsync();

                
                _context.Users.Remove(user);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                _logger.LogInformation("User {Username} deleted by {CurrentUser}", username, currentUsername);
                return Ok($"User '{username}' has been deleted successfully");
            }
            catch (DbUpdateException dbEx)
            {
                await transaction.RollbackAsync();
                _logger.LogError(dbEx, "Database error deleting user {Username}. Error: {ErrorMessage}", username, dbEx.InnerException?.Message ?? dbEx.Message);
                return StatusCode(StatusCodes.Status500InternalServerError, 
                    $"Database error: {dbEx.InnerException?.Message ?? dbEx.Message}");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error deleting user {Username}. Error: {ErrorMessage}", username, ex.Message);
                return StatusCode(StatusCodes.Status500InternalServerError, 
                    $"An error occurred while deleting the user: {ex.Message}");
            }
        }

        // JWT Generator
        private string GenerateJwtToken(Users user)
        {
            var keyString = _configuration["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY") ?? "DenkamWaters2024SecretKeyMinimum32Characters!";
            var keyBytes = Encoding.UTF8.GetBytes(keyString);
            var key = new SymmetricSecurityKey(keyBytes);
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            
            var claims = new List<Claim>
            {
                new(ClaimTypes.Name, user.Username ?? string.Empty),
                new(ClaimTypes.Role, user.Role ?? "User"),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new(ClaimTypes.NameIdentifier, user.Id.ToString())
            };

            var jwtIssuer = _configuration["Jwt:Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "DenkamWaters";
            var jwtAudience = _configuration["Jwt:Audience"] ?? Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "DenkamWatersUsers";
            var expireMinutes = _configuration["Jwt:ExpireMinutes"] ?? Environment.GetEnvironmentVariable("JWT_EXPIRE_MINUTES") ?? "30";

            var token = new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: jwtAudience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(Convert.ToDouble(expireMinutes)),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        // Generate secure reset token
        private static string GenerateSecureToken()
        {
            using var rng = RandomNumberGenerator.Create();
            var tokenBytes = new byte[32];
            rng.GetBytes(tokenBytes);
            return Convert.ToBase64String(tokenBytes).Replace("+", "-").Replace("/", "_").Replace("=", "");
        }

        // Dashboard methods 
        private async Task<object> GetAdminDashboard()
        {
            // Count clients using same logic as ClientsController to ensure consistency
            var totalCustomers = await _context.Users
                .Where(u => u.Role == "Client" && u.IsActive)
                .Where(u => _context.Clients.Any(c => c.CreatedByUserId == u.Id && c.IsActive))
                .CountAsync();
                
            var totalBills = await _context.Bills.CountAsync();
            var totalRevenue = await _context.Payments.SumAsync(p => (decimal?)p.Amount) ?? 0;
            var unpaidBills = await _context.Bills.CountAsync(b => b.Status != "Paid");
            
            // Calculate total outstanding amount using current penalty rates
            var settings = await _context.SystemSettings.FirstOrDefaultAsync();
            var outstandingAmount = await CalculateOutstandingAmounts(settings);

            return new AdminDashboardStats(totalCustomers, totalBills, totalRevenue + outstandingAmount, unpaidBills);
        }

        private async Task<decimal> CalculateOutstandingAmounts(SystemSettings? settings)
        {
            if (settings == null) return 0;

            var unpaidBills = await _context.Bills
                .Where(b => b.Status != "Paid")
                .ToListAsync();

            decimal totalOutstanding = 0;
            foreach (var bill in unpaidBills)
            {
                var amount = bill.TotalAmount;
                
                // Apply penalty if overdue
                if (bill.DueDate < DateTime.UtcNow)
                {
                    var penaltyAmount = amount * (settings.PenaltyRate / 100);
                    amount += penaltyAmount;
                }
                
                totalOutstanding += amount;
            }

            return totalOutstanding;
        }

        private async Task<object> GetMeterReaderDashboard()
        {
            var totalReadings = await _context.MeterReadings.CountAsync();
            var todayReadings = await _context.MeterReadings.CountAsync(r => r.ReadingDate.Date == DateTime.Today);
            
            // Count clients using same logic as ClientsController to ensure consistency
            var totalCustomers = await _context.Users
                .Where(u => u.Role == "Client" && u.IsActive)
                .Where(u => _context.Clients.Any(c => c.CreatedByUserId == u.Id && c.IsActive))
                .CountAsync();

            return new MeterReaderDashboardStats(totalReadings, todayReadings, totalCustomers);
        }

        private async Task<object> GetClientDashboard(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return new CustomerDashboardStats(0, 0, null);

            var client = await _context.Clients.FirstOrDefaultAsync(c => c.Email == user.Email);
            if (client == null)
            {
                return new CustomerDashboardStats(0, 0, null);
            }

            var currentBills = await _context.Bills
                .Where(b => b.ClientId == client.Id && b.Status != "Paid")
                .ToListAsync();

            var totalOwed = currentBills.Sum(b => b.TotalAmount);
            var lastPayment = await _context.Payments
                .Where(p => _context.Bills.Any(b => b.Id == p.BillId && b.ClientId == client.Id))
                .OrderByDescending(p => p.PaymentDate)
                .Select(p => (DateTime?)p.PaymentDate)
                .FirstOrDefaultAsync();

            return new CustomerDashboardStats(currentBills.Count, totalOwed, lastPayment);
        }

        // GET PROFILE
        [HttpGet("profile")]
        [Authorize]
        public async Task<IActionResult> GetProfile()
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
                return Unauthorized();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == username);

            if (user == null)
                return NotFound("User not found");

            return Ok(new
            {
                id = user.Id,
                username = user.Username,
                email = user.Email,
                firstName = user.FirstName,
                lastName = user.LastName,
                phone = user.Phone,
                role = user.Role
            });
        }

        // UPDATE PROFILE
        [HttpPut("profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
                return Unauthorized();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == username);

            if (user == null)
                return NotFound("User not found");

            // Update fields
            if (!string.IsNullOrEmpty(dto.Email))
                user.Email = dto.Email;
            
            if (!string.IsNullOrEmpty(dto.FirstName))
                user.FirstName = dto.FirstName;
            
            if (!string.IsNullOrEmpty(dto.LastName))
                user.LastName = dto.LastName;
            
            if (!string.IsNullOrEmpty(dto.Phone))
                user.Phone = dto.Phone;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Profile updated successfully" });
        }

        // CHANGE PASSWORD
        [HttpPut("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
                return Unauthorized();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == username);

            if (user == null)
                return NotFound("User not found");

            // Verify current password
            var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.CurrentPassword);
            if (result == PasswordVerificationResult.Failed)
                return BadRequest("Current password is incorrect");

            // Hash and update new password
            user.PasswordHash = _passwordHasher.HashPassword(user, dto.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password changed successfully" });
        }

        // UPDATE USER (Admin only) - Fixed version
        [HttpPut("users/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] JsonElement requestData)
        {
            try
            {
                Console.WriteLine($"UpdateUser endpoint reached for user ID: {id}");
                Console.WriteLine($"Request data: {System.Text.Json.JsonSerializer.Serialize(requestData)}");
                
                var user = await _context.Users.FindAsync(id);
                if (user == null)
                {
                    Console.WriteLine($"User with ID {id} not found");
                    return NotFound("User not found");
                }

                Console.WriteLine($"Found user: {user.Username}");

                // Parse the JsonElement directly
                
                if (requestData.TryGetProperty("Username", out var usernameElement))
                {
                    user.Username = usernameElement.GetString() ?? user.Username;
                    Console.WriteLine($"Updated username to: {user.Username}");
                }
                
                if (requestData.TryGetProperty("Email", out var emailElement))
                {
                    user.Email = emailElement.GetString() ?? user.Email;
                    Console.WriteLine($"Updated email to: {user.Email}");
                }
                
                if (requestData.TryGetProperty("Role", out var roleElement))
                {
                    user.Role = roleElement.GetString() ?? user.Role;
                    Console.WriteLine($"Updated role to: {user.Role}");
                }
                
                if (requestData.TryGetProperty("IsActive", out var isActiveElement))
                {
                    user.IsActive = isActiveElement.GetBoolean();
                    Console.WriteLine($"Updated isActive to: {user.IsActive}");
                }

                // Update password if provided
                if (requestData.TryGetProperty("Password", out var passwordElement))
                {
                    var password = passwordElement.GetString();
                    if (!string.IsNullOrEmpty(password))
                    {
                        Console.WriteLine("Updating password for user");
                        user.PasswordHash = _passwordHasher.HashPassword(user, password);
                    }
                }

                await _context.SaveChangesAsync();
                Console.WriteLine("User updated successfully in database");

                return Ok(new { message = "User updated successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating user: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return BadRequest($"Error updating user: {ex.Message}");
            }
        }
    }
}
