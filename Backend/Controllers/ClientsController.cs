using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyApi.Data;
using MyApi.Models;
using System.Security.Claims;

namespace MyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ClientsController(WaterBillingDbContext context, IPasswordHasher<Users> passwordHasher) : ControllerBase
    {
        private readonly WaterBillingDbContext _context = context;
        private readonly IPasswordHasher<Users> _passwordHasher = passwordHasher;

        /// <summary>
        /// Get current client's info (for logged-in clients)
        /// </summary>
        [HttpGet("my-info")]
        [Authorize(Roles = "Client,Customer")]
        public async Task<ActionResult<object>> GetMyClientInfo()
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
            {
                return Unauthorized("User not authenticated");
            }

            // Find the user and their client details
            var user = await _context.Users
                .Where(u => u.Username == username && u.IsActive)
                .FirstOrDefaultAsync();

            if (user == null)
            {
                return NotFound("User not found");
            }

            // Find client details by matching user info
            var clientDetails = await _context.Clients
                .Where(c => c.Email == user.Email || c.FirstName + " " + c.LastName == user.FirstName + " " + user.LastName)
                .FirstOrDefaultAsync();

            if (clientDetails == null)
            {
                return NotFound("Client details not found. Please contact administrator.");
            }

            return Ok(new
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
            });
        }

        /// <summary>
        /// Get all clients
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin,MeterReader")]
        public async Task<ActionResult<IEnumerable<object>>> GetAllClients()
        {
            // Get all users with Client role and their corresponding client details
            var clientUsers = await _context.Users
                .Where(u => u.Role == "Client" && u.IsActive)
                .Select(u => new {
                    Username = u.Username,
                    UserId = u.Id,
                    ClientDetails = _context.Clients
                        .Where(c => c.CreatedByUserId == u.Id && c.IsActive)
                        .FirstOrDefault()
                })
                .ToListAsync();

            // Filter out users without valid client details to avoid ID = 0
            var result = clientUsers
                .Where(cu => cu.ClientDetails != null) // Only include users with client details
                .Select(cu => new {
                    Id = cu.ClientDetails!.Id, // Safe to use ! since we filtered null values
                    Username = cu.Username,
                    FirstName = cu.ClientDetails.FirstName,
                    MiddleName = cu.ClientDetails.MiddleName,
                    LastName = cu.ClientDetails.LastName,
                    FullName = cu.ClientDetails.FullName,
                    Email = cu.ClientDetails.Email,
                    Phone = cu.ClientDetails.Phone,
                    MeterNumber = cu.ClientDetails.MeterNumber,
                    Location = cu.ClientDetails.Location,
                    ConnectionStatus = cu.ClientDetails.ConnectionStatus,
                    HasFullDetails = true,
                    CreatedByUserId = cu.UserId,
                    CreatedDate = cu.ClientDetails.CreatedDate,
                    IsActive = cu.ClientDetails.IsActive
                }).OrderBy(c => c.FullName).ToList();

            return Ok(result);
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
