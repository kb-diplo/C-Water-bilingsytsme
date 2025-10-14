using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyApi.Data;
using MyApi.Models;
using MyApi.Services;
using System.Security.Claims;

namespace MyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ClientsController(WaterBillingDbContext context, IPasswordHasher<Users> passwordHasher, ICacheService cacheService) : ControllerBase
    {
        private readonly WaterBillingDbContext _context = context;
        private readonly IPasswordHasher<Users> _passwordHasher = passwordHasher;
        private readonly ICacheService _cacheService = cacheService;

        /// <summary>
        /// Get current client's info (for logged-in clients)
        /// </summary>
        [HttpGet("my-info")]
        [Authorize(Roles = "Client,Customer")]
        [ResponseCache(Duration = 300)] // Cache for 5 minutes
        public async Task<ActionResult<object>> GetMyClientInfo()
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
            {
                return Unauthorized("User not authenticated");
            }

            // Check cache first
            var cacheKey = $"client_info:{username}";
            var cachedInfo = await _cacheService.GetAsync<object>(cacheKey);
            if (cachedInfo != null)
            {
                return Ok(cachedInfo);
            }

            // Find the user and their client details
            var user = await _context.Users
                .Where(u => u.Username == username && u.IsActive)
                .FirstOrDefaultAsync();

            if (user == null)
            {
                return NotFound("User not found");
            }

            // Find client details by matching user info - try multiple approaches
            var clientDetails = await _context.Clients
                .Where(c => c.CreatedByUserId == user.Id && c.IsActive)
                .FirstOrDefaultAsync();

            // Fallback: try matching by email or name if direct user ID match fails
            if (clientDetails == null)
            {
                clientDetails = await _context.Clients
                    .Where(c => c.IsActive && (c.Email == user.Email || 
                        (c.FirstName + " " + c.LastName) == (user.FirstName + " " + user.LastName)))
                    .FirstOrDefaultAsync();
            }

            if (clientDetails == null)
            {
                return NotFound("Client details not found. Please contact administrator.");
            }

            var result = new
            {
                id = clientDetails.Id,
                username = user.Username,
                email = user.Email,
                firstName = user.FirstName,
                lastName = user.LastName,
                fullName = clientDetails.FullName,
                meterNumber = clientDetails.MeterNumber,
                location = clientDetails.Location,
                connectionStatus = clientDetails.ConnectionStatus
            };

            // Cache the result for 5 minutes
            await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(5));

            return Ok(result);
        }

        /// <summary>
        /// Get all clients - Clean CRUD pattern like Users
        /// </summary>
        [HttpGet("all")]
        [Authorize(Policy = "RequireAdminOrMeterReader")]
        public async Task<IActionResult> GetAllClients()
        {
            try
            {
                var currentUsername = User.Identity?.Name ?? "Unknown";
                var currentUserRole = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value ?? "No Role";
                
                _logger.LogInformation("GetAllClients called by {Username} (Role: {Role})", currentUsername, currentUserRole);
                
                var userRoles = User.FindAll(ClaimTypes.Role)
                    .Select(c => c.Value.ToLowerInvariant())
                    .ToHashSet();
                
                if (!userRoles.Contains("admin") && !userRoles.Contains("meterreader"))
                {
                    _logger.LogWarning("Unauthorized access attempt by {Username}. User roles: {UserRoles}", 
                        currentUsername, string.Join(", ", userRoles));
                    return Forbid("Insufficient permissions");
                }

                // Query Clients table with User information
                var clients = await _context.Clients
                    .Include(c => c.User)
                    .AsNoTracking()
                    .OrderBy(c => c.User.Username)
                    .ToListAsync();

                var clientDtos = clients.Select(c => new
                {
                    id = c.Id,
                    userId = c.UserId,
                    name = c.User?.Username ?? "N/A",
                    email = c.User?.Email ?? "No Email",
                    phone = c.Phone ?? "Not provided",
                    location = c.Location ?? "Not specified",
                    connectionStatus = c.ConnectionStatus ?? "Pending",
                    isActive = c.IsActive,
                    createdDate = c.CreatedDate,
                    // Note: InitialReading is not included in client list as per requirements
                    // Only admins can view/set initial readings through separate endpoints
                }).ToList();

                _logger.LogInformation("Successfully retrieved {Count} clients", clientDtos.Count);
                return Ok(clientDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving clients. Error: {ErrorMessage}", ex.Message);
                return StatusCode(
                    StatusCodes.Status500InternalServerError, 
                    "An error occurred while retrieving clients. Please try again later.");
            }
        }

        /// <summary>
        /// Get client by ID - Admin/MeterReader can view any, Clients can only view their own
        /// </summary>
        [HttpGet("{id:int}")]
        public async Task<ActionResult<object>> GetClientById(int id)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var client = await _context.Clients
                .Include(c => c.CreatedBy)
                .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);

            if (client == null)
                return NotFound($"Client with ID {id} not found");

            // Clients can only view their own data
            if (currentUserRole == "Client" && client.CreatedByUserId != currentUserId)
                return Forbid("You can only view your own client information");

            var result = new {
                Id = client.Id,
                Username = client.CreatedBy?.Username,
                FirstName = client.FirstName,
                MiddleName = client.MiddleName,
                LastName = client.LastName,
                FullName = client.FullName,
                Email = client.Email,
                Phone = client.Phone,
                MeterNumber = client.MeterNumber,
                Location = client.Location,
                ConnectionStatus = client.ConnectionStatus,
                CreatedByUserId = client.CreatedByUserId,
                CreatedDate = client.CreatedDate,
                IsActive = client.IsActive
            };

            return Ok(result);
        }

        /// <summary>
        /// Create new client
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin,MeterReader")]
        public async Task<ActionResult<object>> CreateClient(ClientCreateFullDto dto)
        {
            try
            {
                var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

                // Check if meter number already exists
                if (!string.IsNullOrEmpty(dto.MeterNumber))
                {
                    var existingClient = await _context.Clients
                        .FirstOrDefaultAsync(c => c.MeterNumber.ToLower() == dto.MeterNumber.ToLower() && c.IsActive);
                    if (existingClient != null)
                        return BadRequest($"Meter number '{dto.MeterNumber}' already exists");
                }

                // Check if username already exists
                if (!string.IsNullOrEmpty(dto.Username))
                {
                    var existingUsername = await _context.Users
                        .FirstOrDefaultAsync(u => u.Username.ToLower() == dto.Username.ToLower());
                    if (existingUsername != null)
                        return BadRequest($"Username '{dto.Username}' already exists");
                }

                // Check if email already exists
                if (!string.IsNullOrEmpty(dto.Email))
                {
                    var existingUser = await _context.Users
                        .FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower());
                    if (existingUser != null)
                        return BadRequest($"Email '{dto.Email}' already exists");
                }

                // Create user account first
                var user = new Users
                {
                    Username = dto.Username,
                    Email = dto.Email ?? "",
                    Role = "Client",
                    IsActive = true,
                    CreatedDate = DateTime.UtcNow
                };

                if (!string.IsNullOrEmpty(dto.Password))
                {
                    user.PasswordHash = _passwordHasher.HashPassword(user, dto.Password);
                }

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                // Create client details
                var client = new Client
                {
                    FirstName = dto.FirstName ?? "",
                    MiddleName = dto.MiddleName,
                    LastName = dto.LastName ?? "",
                    Email = dto.Email ?? "",
                    Phone = dto.Phone ?? "",
                    MeterNumber = dto.MeterNumber ?? "",
                    Location = dto.Location ?? "",
                    ConnectionStatus = dto.ConnectionStatus ?? "Connected",
                    CreatedByUserId = user.Id,
                    CreatedDate = DateTime.UtcNow,
                    IsActive = true
                };

                _context.Clients.Add(client);
                await _context.SaveChangesAsync();

                // Create initial meter reading of 0 for new clients
                var initialReading = new MeterReading
                {
                    ClientId = client.Id,
                    CurrentReading = 0,
                    PreviousReading = 0,
                    UnitsUsed = 0,
                    ReadingDate = DateTime.UtcNow,
                    RecordedByUserId = currentUserId,
                    Status = "Approved"
                };

                _context.MeterReadings.Add(initialReading);
                await _context.SaveChangesAsync();

                var result = new {
                    Id = client.Id,
                    Username = user.Username,
                    FirstName = client.FirstName,
                    MiddleName = client.MiddleName,
                    LastName = client.LastName,
                    FullName = client.FullName,
                    Email = client.Email,
                    Phone = client.Phone,
                    MeterNumber = client.MeterNumber,
                    Location = client.Location,
                    ConnectionStatus = client.ConnectionStatus,
                    CreatedDate = client.CreatedDate
                };

                return CreatedAtAction(nameof(GetClientById), new { id = client.Id }, result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error creating client: {ex.Message}");
            }
        }

        /// <summary>
        /// Update client details
        /// </summary>
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,MeterReader")]
        public async Task<IActionResult> UpdateClientDetails(int id, ClientUpdateFullDto dto)
        {
            try
            {
                // Find client by ID
                var client = await _context.Clients
                    .Include(c => c.CreatedBy)
                    .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);
                    
                if (client == null)
                    return NotFound($"Client with ID {id} not found");

                var updatedFields = new List<string>();

                // Allow updating all fields
                if (dto.FirstName != null && dto.FirstName != client.FirstName)
                {
                    client.FirstName = dto.FirstName;
                    updatedFields.Add("FirstName");
                }
                
                if (dto.MiddleName != client.MiddleName)
                {
                    client.MiddleName = dto.MiddleName;
                    updatedFields.Add("MiddleName");
                }
                
                if (dto.LastName != null && dto.LastName != client.LastName)
                {
                    client.LastName = dto.LastName;
                    updatedFields.Add("LastName");
                }
                
                if (dto.Email != null && dto.Email != client.Email)
                {
                    client.Email = dto.Email;
                    updatedFields.Add("Email");
                }
                
                if (dto.Phone != null && dto.Phone != client.Phone)
                {
                    client.Phone = dto.Phone;
                    updatedFields.Add("Phone");
                }
                
                if (dto.MeterNumber != null && dto.MeterNumber != client.MeterNumber)
                {
                    // Check if new meter number already exists
                    var existingClient = await _context.Clients
                        .FirstOrDefaultAsync(c => c.Id != client.Id && c.MeterNumber.ToLower() == dto.MeterNumber.ToLower() && c.IsActive);
                    if (existingClient != null)
                        return BadRequest($"Meter number '{dto.MeterNumber}' already exists for client '{existingClient.FullName}'");
                    
                    client.MeterNumber = dto.MeterNumber;
                    updatedFields.Add("MeterNumber");
                }
                
                if (dto.Location != null && dto.Location != client.Location)
                {
                    client.Location = dto.Location;
                    updatedFields.Add("Location");
                }
                
                if (dto.ConnectionStatus != null && dto.ConnectionStatus != client.ConnectionStatus)
                {
                    // Validate connection status
                    var validStatuses = new[] { "Connected", "Disconnected", "Pending" };
                    if (!validStatuses.Contains(dto.ConnectionStatus, StringComparer.OrdinalIgnoreCase))
                        return BadRequest($"Invalid connection status. Valid options are: {string.Join(", ", validStatuses)}");
                    
                    client.ConnectionStatus = dto.ConnectionStatus;
                    updatedFields.Add("ConnectionStatus");
                }

                if (updatedFields.Count == 0)
                    return Ok(new { message = "No changes detected", client });

                await _context.SaveChangesAsync();
                
                return Ok(new {
                    message = $"Client updated successfully. Updated fields: {string.Join(", ", updatedFields)}",
                    client,
                    updatedFields
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error updating client: {ex.Message}");
            }
        }

        /// <summary>
        /// Delete client
        /// </summary>
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteClient(int id)
        {
            var client = await _context.Clients
                .Include(c => c.CreatedBy)
                .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);
                
            if (client == null)
                return NotFound($"Client with ID {id} not found");

            // Soft delete the client
            client.IsActive = false;
            
            // Also deactivate the associated user account
            if (client.CreatedBy != null)
            {
                client.CreatedBy.IsActive = false;
            }
            
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Client deactivated successfully" });
        }

    }
}
