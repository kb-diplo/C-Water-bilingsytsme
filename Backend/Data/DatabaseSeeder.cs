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
            try
            {
                // Check if admin user already exists (migrations should be applied before calling this)
                var adminUsername = _configuration["BootstrapAdmin:Username"] ?? "admin";
                var adminPassword = _configuration["BootstrapAdmin:Password"] ?? "Admin123!";

                Console.WriteLine($"🔍 Checking for existing admin user: {adminUsername}");
                
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

                Console.WriteLine($"✅ Created initial admin user: {adminUsername}");
            }
            else
            {
                Console.WriteLine("✅ Admin user already exists");
            }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error seeding admin user: {ex.Message}");
                throw; // Re-throw to be handled by caller
            }
        }

        public async Task SeedTestClientsAsync()
        {
            try
            {
                Console.WriteLine("🔍 Checking for existing test clients...");
                
                // Check if test clients already exist
                if (await _context.Clients.AnyAsync(c => c.Email.Contains("testclient")))
                {
                    Console.WriteLine("✅ Test clients already exist");
                    return; // Test clients already exist
                }

            var testClients = new[]
            {
                new { FirstName = "John", LastName = "Doe", Email = "testclient1@example.com", Phone = "254712345001", MeterNumber = "MTR001", Location = "Nairobi CBD" },
                new { FirstName = "Jane", LastName = "Smith", Email = "testclient2@example.com", Phone = "254712345002", MeterNumber = "MTR002", Location = "Westlands" },
                new { FirstName = "Michael", LastName = "Johnson", Email = "testclient3@example.com", Phone = "254712345003", MeterNumber = "MTR003", Location = "Karen" },
                new { FirstName = "Sarah", LastName = "Williams", Email = "testclient4@example.com", Phone = "254712345004", MeterNumber = "MTR004", Location = "Kilimani" },
                new { FirstName = "David", LastName = "Brown", Email = "testclient5@example.com", Phone = "254712345005", MeterNumber = "MTR005", Location = "Parklands" }
            };

            foreach (var clientData in testClients)
            {
                // Create user account first
                var user = new Users
                {
                    Username = clientData.FirstName.ToLower() + clientData.LastName.ToLower(),
                    Email = clientData.Email,
                    Role = "Client",
                    IsActive = true,
                    PasswordHash = _passwordHasher.HashPassword(null!, "password"),
                    CreatedDate = DateTime.UtcNow
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync(); // Save to get user ID

                // Create client record
                var client = new Client
                {
                    FirstName = clientData.FirstName,
                    LastName = clientData.LastName,
                    Email = clientData.Email,
                    Phone = clientData.Phone,
                    MeterNumber = clientData.MeterNumber,
                    Location = clientData.Location,
                    ConnectionStatus = "Connected",
                    CreatedByUserId = user.Id,
                    CreatedDate = DateTime.UtcNow,
                    IsActive = true
                };

                _context.Clients.Add(client);
            }

            await _context.SaveChangesAsync();
            Console.WriteLine("✅ Test clients created successfully!");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error seeding test clients: {ex.Message}");
                throw; // Re-throw to be handled by caller
            }
        }
    }
}
