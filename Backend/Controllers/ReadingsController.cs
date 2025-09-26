using Microsoft.AspNetCore.Authorization;
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
    public class ReadingsController(WaterBillingDbContext context) : ControllerBase
    {
        private readonly WaterBillingDbContext _context = context;

        /// <summary>
        /// Add meter reading
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin,MeterReader")]
        public async Task<ActionResult<MeterReadingResponseDto>> AddReading(MeterReadingCreateDto dto)
        {
            var client = await _context.Clients.FindAsync(dto.ClientId);
            if (client == null) return NotFound("Client not found");

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            var lastReading = await _context.MeterReadings
                .Where(r => r.ClientId == dto.ClientId)
                .OrderByDescending(r => r.ReadingDate)
                .FirstOrDefaultAsync();

            var previousReading = lastReading?.CurrentReading ?? 0;

            // VALIDATION: New reading cannot be less than previous reading
            if (dto.CurrentReading < previousReading)
            {
                return BadRequest($"New reading ({dto.CurrentReading}) cannot be less than previous reading ({previousReading}). Please verify the meter reading.");
            }

            var unitsUsed = dto.CurrentReading - previousReading;

            var reading = new MeterReading
            {
                ClientId = dto.ClientId,
                CurrentReading = dto.CurrentReading,
                PreviousReading = previousReading,
                UnitsUsed = unitsUsed,
                RecordedByUserId = userId,
                Status = "Approved"
            };

            _context.MeterReadings.Add(reading);
            await _context.SaveChangesAsync();

            // Auto-generate bill only if units were used
            if (unitsUsed > 0)
            {
                await GenerateBill(reading);
            }

            // Return DTO instead of entity to prevent cycles
            var responseDto = new MeterReadingResponseDto
            {
                Id = reading.Id,
                ClientId = reading.ClientId,
                ClientName = client.FullName,
                MeterNumber = client.MeterNumber,
                CurrentReading = reading.CurrentReading,
                PreviousReading = reading.PreviousReading,
                UnitsUsed = reading.UnitsUsed,
                ReadingDate = reading.ReadingDate,
                Status = reading.Status,
                RecordedByUsername = User.Identity?.Name ?? "Unknown"
            };

            return CreatedAtAction(nameof(GetReadings), responseDto);
        }

        /// <summary>
        /// Get all readings
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<MeterReadingResponseDto>>> GetReadings()
        {
            var readings = await _context.MeterReadings
                .Include(r => r.Client)
                .Include(r => r.RecordedByUser)
                .OrderByDescending(r => r.ReadingDate)
                .Select(r => new MeterReadingResponseDto
                {
                    Id = r.Id,
                    ClientId = r.ClientId,
                    ClientName = r.Client.FullName,
                    MeterNumber = r.Client.MeterNumber,
                    CurrentReading = r.CurrentReading,
                    PreviousReading = r.PreviousReading,
                    UnitsUsed = r.UnitsUsed,
                    ReadingDate = r.ReadingDate,
                    Status = r.Status,
                    RecordedByUsername = r.RecordedByUser.Username ?? "Unknown"
                })
                .ToListAsync();

            return Ok(readings);
        }

        /// <summary>
        /// Get readings for a specific client
        /// </summary>
        [HttpGet("client/{clientId}")]
        [Authorize(Roles = "Admin,MeterReader,Client")]
        public async Task<ActionResult<IEnumerable<MeterReadingResponseDto>>> GetClientReadings(int clientId)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // Check if client exists
            var client = await _context.Clients.FindAsync(clientId);
            if (client == null) return NotFound("Client not found");

            // Clients can only view their own readings
            if (currentUserRole == "Client" && client.CreatedByUserId != currentUserId)
                return Forbid("You can only view your own readings");

            var readings = await _context.MeterReadings
                .Include(r => r.Client)
                .Include(r => r.RecordedByUser)
                .Where(r => r.ClientId == clientId)
                .OrderByDescending(r => r.ReadingDate)
                .Select(r => new MeterReadingResponseDto
                {
                    Id = r.Id,
                    ClientId = r.ClientId,
                    ClientName = r.Client.FullName,
                    MeterNumber = r.Client.MeterNumber,
                    CurrentReading = r.CurrentReading,
                    PreviousReading = r.PreviousReading,
                    UnitsUsed = r.UnitsUsed,
                    ReadingDate = r.ReadingDate,
                    Status = r.Status,
                    RecordedByUsername = r.RecordedByUser.Username ?? "System"
                })
                .ToListAsync();

            return Ok(readings);
        }

        private async Task GenerateBill(MeterReading reading)
        {
            var settings = await _context.SystemSettings.FirstOrDefaultAsync() 
                ?? new SystemSettings { RatePerUnit = 50, PenaltyRate = 10, GracePeriodDays = 30 };

            var amount = reading.UnitsUsed * settings.RatePerUnit;
            var dueDate = DateTime.UtcNow.AddDays(settings.GracePeriodDays);

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            var bill = new Bill
            {
                ClientId = reading.ClientId,
                BillNumber = $"WB{DateTime.Now:yyyyMM}{reading.Id:D4}",
                UnitsUsed = reading.UnitsUsed,
                RatePerUnit = settings.RatePerUnit,
                Amount = amount,
                PenaltyAmount = 0, // No penalty on new bills
                TotalAmount = amount,
                DueDate = dueDate,
                CreatedByUserId = userId,
                Status = "Unpaid"
            };

            _context.Bills.Add(bill);
            await _context.SaveChangesAsync();
        }
    }
}
