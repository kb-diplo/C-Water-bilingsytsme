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
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Caching.StackExchangeRedis;
using Npgsql;

namespace MyApi;

public partial class Program
{
    public static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Configure Kestrel for Render deployment
        var port = Environment.GetEnvironmentVariable("PORT");
        if (!string.IsNullOrEmpty(port))
        {
            builder.WebHost.ConfigureKestrel(options =>
            {
                options.ListenAnyIP(int.Parse(port));
            });
        }

        // EF Core - Water Billing System (Support both SQL Server and PostgreSQL)
        ConfigureDatabase(builder);
        
        // Helper method to configure database based on environment
        static void ConfigureDatabase(WebApplicationBuilder builder)
        {
            var isProduction = builder.Environment.IsProduction();
            var renderDatabaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
            var configConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
            
            // Database configuration logging removed for production security
            
            if (isProduction && !string.IsNullOrEmpty(renderDatabaseUrl))
            {
                // Production: Use PostgreSQL from Render DATABASE_URL
                // Converting Render DATABASE_URL to connection string
                var npgsqlConnectionString = ConvertRenderPostgresUrl(renderDatabaseUrl);
                // Using PostgreSQL for production
                
                builder.Services.AddDbContext<WaterBillingDbContext>(options =>
                    options.UseNpgsql(npgsqlConnectionString, npgsqlOptions =>
                    {
                        npgsqlOptions.EnableRetryOnFailure(
                            maxRetryCount: 3,
                            maxRetryDelay: TimeSpan.FromSeconds(5),
                            errorCodesToAdd: null);
                    })
                    .UseSnakeCaseNamingConvention()); // PostgreSQL naming convention
            }
            else if (!string.IsNullOrEmpty(configConnectionString))
            {
                // Development: Use SQL Server from appsettings.json
                Console.WriteLine("Using SQL Server for development");
                
                builder.Services.AddDbContext<WaterBillingDbContext>(options =>
                    options.UseSqlServer(configConnectionString, sqlOptions =>
                    {
                        sqlOptions.EnableRetryOnFailure(
                            maxRetryCount: 3,
                            maxRetryDelay: TimeSpan.FromSeconds(5),
                            errorNumbersToAdd: null);
                    }));
            }
            else
            {
                throw new InvalidOperationException(
                    "No database connection string found. " +
                    "Please configure DATABASE_URL environment variable for production " +
                    "or DefaultConnection in appsettings.json for development.");
            }
        }
        
        // Convert Render PostgreSQL URL to standard connection string format
        static string ConvertRenderPostgresUrl(string databaseUrl)
        {
            try
            {
                var uri = new Uri(databaseUrl);
                var host = uri.Host;
                var port = uri.Port == -1 ? 5432 : uri.Port; // Default PostgreSQL port
                var database = uri.AbsolutePath.TrimStart('/');
                var userInfo = uri.UserInfo.Split(':');
                var username = userInfo[0];
                var password = userInfo.Length > 1 ? userInfo[1] : "";
                
                var connectionString = $"Host={host};Port={port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true;";
                
                Console.WriteLine($"[INFO] Database connection parsed successfully:");
                Console.WriteLine($"   Host: {host}");
                Console.WriteLine($"   Port: {port}");
                Console.WriteLine($"   Database: {database}");
                Console.WriteLine($"   Username: {username}");
                Console.WriteLine($"   SSL: Required");
                
                return connectionString;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error parsing DATABASE_URL: {ex.Message}");
                Console.WriteLine($"DATABASE_URL format should be: postgresql://username:password@host:port/database");
                throw new InvalidOperationException($"Invalid DATABASE_URL format: {databaseUrl}", ex);
            }
        }
            
        // Register PasswordHasher
        builder.Services.AddScoped<IPasswordHasher<Users>, PasswordHasher<Users>>();

        // Database seeder removed - clean setup

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

        // Register Price Service
        builder.Services.AddScoped<IPriceService, PriceService>();

        // ============ ENTERPRISE OPTIMIZATIONS ============
        
        // Memory Caching
        builder.Services.AddMemoryCache(options =>
        {
            options.SizeLimit = 1024; // Limit cache size
        });

        // Redis Caching (if connection string provided)
        var redisConnection = builder.Configuration.GetConnectionString("Redis");
        if (!string.IsNullOrEmpty(redisConnection))
        {
            builder.Services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = redisConnection;
                options.InstanceName = "WaterBillingSystem";
            });
        }
        else
        {
            // Fallback to in-memory distributed cache
            builder.Services.AddDistributedMemoryCache();
        }

        // Register Cache Service
        builder.Services.AddScoped<ICacheService, CacheService>();

        // Token Service for JWT Refresh
        builder.Services.AddScoped<ITokenService, TokenService>();

        // Response Caching
        builder.Services.AddResponseCaching(options =>
        {
            options.MaximumBodySize = 1024 * 1024; // 1MB
            options.UseCaseSensitivePaths = false;
        });


        // Health Checks
        builder.Services.AddHealthChecks()
            .AddCheck("self", () => HealthCheckResult.Healthy());

        // Add CORS - Handle Vercel preview URLs and production
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowAngularApp", policy =>
            {
                policy.SetIsOriginAllowed(origin =>
                    {
                        // Allow localhost for development
                        if (origin.StartsWith("http://localhost:"))
                            return true;
                        
                        // Allow production Vercel domain
                        if (origin == "https://denkamwaterskenya.vercel.app")
                            return true;
                        
                        // Allow Vercel preview URLs (format: https://denkamwaterskenya-*.vercel.app)
                        if (origin.StartsWith("https://denkamwaterskenya-") && origin.EndsWith(".vercel.app"))
                            return true;
                        
                        // Allow Vercel project preview URLs (format: https://denkamwaterskenya-*-kb-diplos-projects.vercel.app)
                        if (origin.StartsWith("https://denkamwaterskenya-") && origin.Contains("-kb-diplos-projects.vercel.app"))
                            return true;
                        
                        return false;
                    })
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials()
                      .SetPreflightMaxAge(TimeSpan.FromMinutes(10));
            });
            
            // Keep permissive policy for emergency debugging
            options.AddPolicy("AllowAll", policy =>
            {
                policy.AllowAnyOrigin()
                      .AllowAnyHeader()
                      .AllowAnyMethod();
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
                if (apiDesc.ActionDescriptor.RouteValues.TryGetValue("action", out var actionName))
                {
                    return actionName?.ToString();
                }
                
                // Fallback for endpoints without action (like health check)
                return apiDesc.HttpMethod + "_" + apiDesc.RelativePath?.Replace("/", "_").Replace("{", "").Replace("}", "");
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

        // Configure JWT Authentication with fallback to environment variables
        var jwtKey = builder.Configuration["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY") ?? "DenkamWaters2024SecretKeyMinimum32Characters!";
        var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "DenkamWaters";
        var jwtAudience = builder.Configuration["Jwt:Audience"] ?? Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "DenkamWatersUsers";
        
        var keyBytes = Encoding.UTF8.GetBytes(jwtKey);
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
                ValidIssuer = jwtIssuer,
                ValidAudience = jwtAudience,
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
                Console.WriteLine("[INFO] Initializing database...");
                var context = services.GetRequiredService<WaterBillingDbContext>();
                
                // Check if database can be connected to
                Console.WriteLine("[INFO] Testing database connection...");
                var canConnect = await context.Database.CanConnectAsync();
                Console.WriteLine($"[INFO] Database connection: {(canConnect ? "SUCCESS" : "FAILED")}");
                
                if (canConnect)
                {
                    Console.WriteLine("[INFO] Checking database schema...");
                    
                    // Check if database exists and has tables
                    var tablesExist = false;
                    try
                    {
                        tablesExist = await context.Users.AnyAsync();
                        Console.WriteLine("[INFO] Database tables exist and accessible");
                    }
                    catch (Exception)
                    {
                        Console.WriteLine("[WARN] Database tables don't exist or not accessible - will create them");
                        tablesExist = false;
                    }
                    
                    // Always check for and apply pending migrations
                    Console.WriteLine("[INFO] Checking for pending migrations...");
                    
                    try
                    {
                        var pendingMigrations = await context.Database.GetPendingMigrationsAsync();
                        Console.WriteLine($"[INFO] Pending migrations: {pendingMigrations.Count()}");
                        
                        if (pendingMigrations.Any())
                        {
                            Console.WriteLine("[INFO] Applying pending migrations...");
                            foreach (var migration in pendingMigrations)
                            {
                                Console.WriteLine($"   - {migration}");
                            }
                            await context.Database.MigrateAsync();
                            Console.WriteLine("[INFO] Migrations applied successfully!");
                        }
                        else
                        {
                            Console.WriteLine("[INFO] Database schema is up to date!");
                        }
                    }
                    catch (Exception migrationEx)
                    {
                        Console.WriteLine($"[WARN] Migration failed: {migrationEx.Message}");
                        Console.WriteLine("[INFO] Attempting to recreate database schema...");
                        
                        try
                        {
                            // For PostgreSQL, drop and recreate schema
                            await context.Database.EnsureDeletedAsync();
                            Console.WriteLine("[INFO] Database dropped");
                            
                            await context.Database.EnsureCreatedAsync();
                            Console.WriteLine("[INFO] Database recreated successfully");
                        }
                        catch (Exception recreateEx)
                        {
                            Console.WriteLine($"[ERROR] Database recreation failed: {recreateEx.Message}");
                            throw;
                        }
                    }
                    
                    // Create bootstrap admin user if none exists
                    if (!await context.Users.AnyAsync(u => u.Role == "Admin"))
                    {
                        Console.WriteLine("[INFO] Creating bootstrap admin user...");
                        var passwordHasher = services.GetRequiredService<IPasswordHasher<Users>>();
                        
                        var admin = new Users
                        {
                            Username = "admin",
                            Email = "admin@denkamwaters.co.ke",
                            Role = "Admin",
                            IsBootstrap = true,
                            IsActive = true,
                            CreatedDate = DateTime.UtcNow
                        };
                        admin.PasswordHash = passwordHasher.HashPassword(admin, "Admin123");
                        
                        context.Users.Add(admin);
                        await context.SaveChangesAsync();
                        Console.WriteLine("[INFO] Bootstrap admin user created - Username: admin, Password: Admin123");
                    }
                    
                    Console.WriteLine("[INFO] Database initialization completed successfully!");
                }
                else
                {
                    Console.WriteLine("[ERROR] Cannot connect to database. Check connection string and database availability.");
                }
            }
            catch (Exception ex)
            {
                var logger = services.GetRequiredService<ILogger<Program>>();
                logger.LogError(ex, "[ERROR] An error occurred while initializing the database.");
                Console.WriteLine($"[ERROR] Database initialization failed: {ex.Message}");
                
                // Don't stop the application, let it run without database for now
                Console.WriteLine("[WARN] Application will continue without database initialization.");
            }
        }

        // Only use HTTPS redirection in development (Render handles HTTPS termination)
        if (!app.Environment.IsProduction())
        {
            app.UseHttpsRedirection();
        }
        
        // Use CORS (must be before Swagger) - using smart policy for Vercel URLs
        app.UseCors("AllowAngularApp");
        Console.WriteLine("[CORS] Using 'AllowAngularApp' policy with Vercel URL support");
        
        // Add CORS debugging middleware in development
        if (!app.Environment.IsProduction())
        {
            app.Use(async (context, next) =>
            {
                var origin = context.Request.Headers["Origin"].FirstOrDefault();
                if (!string.IsNullOrEmpty(origin))
                {
                    Console.WriteLine($"[CORS DEBUG] Request from origin: {origin}");
                }
                await next();
            });
        }

        // ============ ENTERPRISE MIDDLEWARE ============
        
        
        // Response Caching
        app.UseResponseCaching();
        
        // Health Checks
        app.UseHealthChecks("/health", new HealthCheckOptions
        {
            ResponseWriter = async (context, report) =>
            {
                context.Response.ContentType = "application/json";
                var response = new
                {
                    status = report.Status.ToString(),
                    checks = report.Entries.Select(x => new
                    {
                        name = x.Key,
                        status = x.Value.Status.ToString(),
                        exception = x.Value.Exception?.Message,
                        duration = x.Value.Duration.ToString()
                    }),
                    totalDuration = report.TotalDuration.ToString()
                };
                await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(response));
            }
        });

        // Enable Swagger in all environments (after CORS, before Auth)
        try
        {
            app.UseSwagger();
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "Water Billing API v1");
                c.RoutePrefix = "swagger";
                c.DocumentTitle = "Water Billing API Documentation";
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Swagger configuration error: {ex.Message}");
        }
        
        app.UseAuthentication();
        app.UseAuthorization();

        app.MapControllers();

        // Add health check endpoint for Render (no authentication required)
        app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
           .AllowAnonymous();
           
        // Redirect root URL to Swagger documentation
        app.MapGet("/", () => Results.Redirect("/swagger"))
           .AllowAnonymous();

        // Run database migrations on startup
        await RunDatabaseMigrations(app);

        app.Run();
    }

    /// <summary>
    /// Run database migrations on startup to ensure schema is up to date
    /// </summary>
    private static async Task RunDatabaseMigrations(WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        var context = scope.ServiceProvider.GetRequiredService<WaterBillingDbContext>();

        try
        {
            logger.LogInformation("[MIGRATION] Checking database schema...");

            // Check if we're using PostgreSQL by checking the provider
            var isPostgreSQL = context.Database.ProviderName?.Contains("Npgsql") == true;
            
            if (isPostgreSQL)
            {
                await RunPostgreSQLMigrations(context, logger);
            }
            else
            {
                logger.LogInformation("[MIGRATION] SQL Server detected - no custom migrations needed");
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[MIGRATION] Database migration failed - continuing startup");
            // Don't fail startup if migration fails - log and continue
        }
    }

    /// <summary>
    /// Run PostgreSQL-specific migrations for production
    /// </summary>
    private static async Task RunPostgreSQLMigrations(WaterBillingDbContext context, ILogger logger)
    {
        try
        {
            // Check if initial_reading columns exist
            var checkSql = @"
                SELECT COUNT(*) 
                FROM information_schema.columns 
                WHERE table_name = 'clients' 
                AND column_name IN ('initial_reading', 'initial_reading_date', 'initial_reading_set_by_user_id')";

            var existingColumns = await context.Database.ExecuteSqlRawAsync(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'clients' AND column_name IN ('initial_reading', 'initial_reading_date', 'initial_reading_set_by_user_id')");

            // Use a different approach - try to query the columns directly
            var columnCount = 0;
            try
            {
                var result = await context.Database.SqlQueryRaw<int>(checkSql).FirstOrDefaultAsync();
                columnCount = result;
            }
            catch
            {
                // If query fails, assume columns don't exist
                columnCount = 0;
            }

            if (columnCount < 3)
            {
                logger.LogInformation("[MIGRATION] Adding missing initial reading columns to clients table...");

                var migrationSql = @"
                    -- Add InitialReading columns to clients table
                    ALTER TABLE clients 
                    ADD COLUMN IF NOT EXISTS initial_reading DECIMAL(10,2) DEFAULT 0.0 NOT NULL,
                    ADD COLUMN IF NOT EXISTS initial_reading_date TIMESTAMP NULL,
                    ADD COLUMN IF NOT EXISTS initial_reading_set_by_user_id INTEGER NULL;

                    -- Add foreign key constraint for initial_reading_set_by_user_id
                    DO $$ 
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.table_constraints 
                            WHERE constraint_name = 'fk_clients_initial_reading_set_by_user'
                        ) THEN
                            ALTER TABLE clients 
                            ADD CONSTRAINT fk_clients_initial_reading_set_by_user 
                            FOREIGN KEY (initial_reading_set_by_user_id) REFERENCES users(id);
                        END IF;
                    END $$;

                    -- Add comments for documentation
                    COMMENT ON COLUMN clients.initial_reading IS 'Initial meter reading set by admin (defaults to 0)';
                    COMMENT ON COLUMN clients.initial_reading_date IS 'When initial reading was set';
                    COMMENT ON COLUMN clients.initial_reading_set_by_user_id IS 'User ID who set the initial reading';";

                await context.Database.ExecuteSqlRawAsync(migrationSql);

                logger.LogInformation("[MIGRATION] Successfully added initial reading columns to clients table");
            }
            else
            {
                logger.LogInformation("[MIGRATION] Initial reading columns already exist - no migration needed");
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[MIGRATION] PostgreSQL migration failed");
            throw;
        }
    }
}
