using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using MyApi.Data;
using MyApi.Models;
using MyApi.Services;

namespace MyApi;

public partial class Program
{
    public static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // EF Core + SQL Server - Water Billing System
        builder.Services.AddDbContext<WaterBillingDbContext>(options =>
            options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
            
        // Register PasswordHasher
        builder.Services.AddScoped<IPasswordHasher<Users>, PasswordHasher<Users>>();

        // Add database seeder
        builder.Services.AddScoped<DatabaseSeeder>();

        // Configure Email Settings
        builder.Services.Configure<EmailSettings>(
            builder.Configuration.GetSection("EmailSettings"));

        // Register Email Service
        builder.Services.AddScoped<IEmailService, EmailService>();

        // Configure Mpesa Settings
        builder.Services.Configure<MpesaSettings>(
            builder.Configuration.GetSection("MpesaSettings"));

        // Register Mpesa Service
        builder.Services.AddHttpClient<IMpesaService, MpesaService>();

        // Register Receipt Service
        builder.Services.AddScoped<IReceiptService, ReceiptService>();

        // Add CORS
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowAngularApp", policy =>
            {
                policy.WithOrigins("http://localhost:4200", "http://localhost:4201", "http://localhost:4202")
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials();
            });
        });

        // Add controllers and API explorer
        builder.Services.AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
                options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
            });
        builder.Services.AddEndpointsApiExplorer();
        
        // Configure Swagger
        builder.Services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
            {
                Title = "Water Billing System API",
                Version = "v1",
                Description = "Comprehensive API for billing system with user management, meter management, and reading operations. Supports Admin, Meter Reader, and Client roles with role-based access control.",
                Contact = new Microsoft.OpenApi.Models.OpenApiContact
                {
                    Name = "API Support",
                    Email = "mbugualawrencee@gmail.com"
                }
            });

            // Add JWT Authentication to Swagger
            c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Description = "JWT Authorization header using the Bearer scheme.\r\n\r\nEnter 'Bearer' [space] and then your token in the text input below.\r\n\r\nExample: \"Bearer 12345abcdef\"",
                Name = "Authorization",
                In = Microsoft.OpenApi.Models.ParameterLocation.Header,
                Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
                Scheme = "Bearer"
            });

            c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement()
            {
                {
                    new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                    {
                        Reference = new Microsoft.OpenApi.Models.OpenApiReference
                        {
                            Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        },
                        Scheme = "oauth2",
                        Name = "Bearer",
                        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
                    },
                    new List<string>()
                }
            });

            // Enable XML documentation
            var xmlFile = Path.Combine(AppContext.BaseDirectory, "MyApi.xml");
            if (File.Exists(xmlFile))
            {
                c.IncludeXmlComments(xmlFile, true);
            }

            // Custom operation ID to fix endpoint naming issues
            c.CustomOperationIds(apiDesc => 
            {
                var actionName = apiDesc.ActionDescriptor.RouteValues["action"];
                return actionName;
            });

            // Add security requirements
            c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
            {
                {
                    new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                    {
                        Reference = new Microsoft.OpenApi.Models.OpenApiReference
                        {
                            Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
[]
                }
            });

            // Simplified Swagger configuration
            c.DocInclusionPredicate((name, api) => true);
        });

        // Configure JWT Authentication
        var jwtSettings = builder.Configuration.GetSection("Jwt");
        var keyBytes = Encoding.UTF8.GetBytes(jwtSettings["Key"]!);
        var key = new SymmetricSecurityKey(keyBytes);
        
        // Configure JWT Bearer authentication
        builder.Services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtSettings["Issuer"],
                ValidAudience = jwtSettings["Audience"],
                IssuerSigningKey = key,
                RoleClaimType = ClaimTypes.Role,
                NameClaimType = ClaimTypes.Name,
                ClockSkew = TimeSpan.Zero
            };

            options.Events = new JwtBearerEvents
            {
                OnTokenValidated = context =>
                {
                    var role = context.Principal?.FindFirst(ClaimTypes.Role)?.Value;
                    Console.WriteLine($"[AUTH] Authenticated user with role: {role}");
                    return Task.CompletedTask;
                },
                OnAuthenticationFailed = context =>
                {
                    Console.WriteLine($"[AUTH] Failed: {context.Exception.Message}");
                    return Task.CompletedTask;
                }
            };

            // Use the new TokenHandlers API
            options.TokenHandlers.Clear();
            options.TokenHandlers.Add(new JwtSecurityTokenHandler
            {
                MapInboundClaims = false
            });
        });

        // Configure Authorization with case-insensitive role checks
        builder.Services.AddAuthorizationBuilder()
            .SetDefaultPolicy(new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme)
                .Build())
            .AddPolicy("RequireAdminRole", policy => 
                policy.RequireAuthenticatedUser()
                      .RequireRole("Admin")
                      .Build())
            .AddPolicy("RequireMeterReaderRole", policy =>
                policy.RequireAuthenticatedUser()
                      .RequireRole("MeterReader")
                      .Build())
            .AddPolicy("RequireClientRole", policy =>
                policy.RequireAuthenticatedUser()
                      .RequireRole("Client")
                      .Build())
            .AddPolicy("RequireAdminOrMeterReader", policy =>
                policy.RequireAuthenticatedUser()
                      .RequireRole("Admin", "MeterReader")
                      .Build())
            .SetFallbackPolicy(new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build());

        var app = builder.Build();

        // Apply migrations and seed initial admin user
        using (var scope = app.Services.CreateScope())
        {
            var services = scope.ServiceProvider;
            try
            {
                // Apply any pending migrations
                var context = services.GetRequiredService<WaterBillingDbContext>();
                await context.Database.MigrateAsync();
                
                // Seed the admin user and test clients
                var seeder = services.GetRequiredService<DatabaseSeeder>();
                await seeder.SeedAdminUserAsync();
                await seeder.SeedTestClientsAsync();
            }
            catch (Exception ex)
            {
                var logger = services.GetRequiredService<ILogger<Program>>();
                logger.LogError(ex, "An error occurred while initializing the database.");
            }
        }

        // Enable middleware to serve generated Swagger as a JSON endpoint.
        app.UseSwagger(c =>
        {
            c.RouteTemplate = "swagger/{documentName}/swagger.json";
            c.PreSerializeFilters.Add((swaggerDoc, httpReq) =>
            {
                swaggerDoc.Servers =
                [
                    new() { Url = $"{httpReq.Scheme}://{httpReq.Host.Value}" }
                ];
            });
        });

        // Enable middleware to serve swagger-ui (HTML, JS, CSS, etc.)
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "Water Billing API v1");
            c.RoutePrefix = "swagger";
            c.DocumentTitle = "Water Billing API Documentation";
            c.DisplayRequestDuration();
            c.EnableDeepLinking();
            c.EnableFilter();
            c.EnablePersistAuthorization();
            c.DisplayOperationId();
        });

        app.UseHttpsRedirection();
        
        // Use CORS
        app.UseCors("AllowAngularApp");
        
        app.UseAuthentication();
        app.UseAuthorization();

        app.MapControllers();

        app.Run();
    }
}
