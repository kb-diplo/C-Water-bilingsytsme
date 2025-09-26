using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MyApi.Models;

namespace MyApi.Data
{
    public class DatabaseSeeder
    {
        private readonly WaterBillingDbContext _context;
        private readonly IPasswordHasher<Users> _passwordHasher;
        private readonly IConfiguration _configuration;

        public DatabaseSeeder(WaterBillingDbContext context, IPasswordHasher<Users> passwordHasher, IConfiguration configuration)
        {
            _context = context;
            _passwordHasher = passwordHasher;
            _configuration = configuration;
        }

        public async Task SeedAdminUserAsync()
        {
            // Check if the database exists and apply any pending migrations
            await _context.Database.MigrateAsync();

            // Check if admin user already exists
            var adminUsername = _configuration["BootstrapAdmin:Username"] ?? "admin";
            var adminPassword = _configuration["BootstrapAdmin:Password"] ?? "Admin123!";

            var adminExists = await _context.Users.AnyAsync(u => u.Username != null && u.Username.ToLower() == adminUsername.ToLower());
            
            if (!adminExists)
            {
                var admin = new Users
                {
                    Username = adminUsername,
                    Role = "Admin",
                    IsActive = true,
                    IsBootstrap = true  // Mark as bootstrap admin for tracking
                };

                // Hash the password
                admin.PasswordHash = _passwordHasher.HashPassword(admin, adminPassword);

                _context.Users.Add(admin);
                await _context.SaveChangesAsync();

                Console.WriteLine($"Created initial admin user: {adminUsername}");
            }
            else
            {
                Console.WriteLine("Admin user already exists");
            }
        }
    }
}
