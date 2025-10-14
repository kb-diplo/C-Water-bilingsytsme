using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MyApi.Models;
using System;
using System.Threading.Tasks;

namespace MyApi.Data
{
    public static class DbInitializer
    {
        public static async Task Initialize(IServiceProvider serviceProvider)
        {
            using (var scope = serviceProvider.CreateScope())
            {
                var services = scope.ServiceProvider;
                try
                {
                    var context = services.GetRequiredService<WaterBillingDbContext>();
                    var passwordHasher = new PasswordHasher<Users>();
                    
                    // Database migrations are handled in Program.cs
                    
                    // Check if any admin exists
                    if (!await context.Users.AnyAsync(u => u.Role == "Admin"))
                    {
                        var admin = new Users
                        {
                            Username = "admin",
                            Role = "Admin",
                            IsBootstrap = true
                        };
                        admin.PasswordHash = passwordHasher.HashPassword(admin, "Admin123");
                        
                        context.Users.Add(admin);
                        await context.SaveChangesAsync();
                        // Bootstrap admin user created successfully
                    }
                }
                catch (Exception ex)
                {
                    var logger = services.GetRequiredService<ILogger<Program>>();
                    logger.LogError(ex, "An error occurred while initializing the database.");
                    throw;
                }
            }
        }
    }
}
