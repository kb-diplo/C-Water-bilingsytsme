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
        /// Set initial reading for a client (Admin only)
        /// </summary>
        [HttpPost("initial")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<MeterReadingResponseDto>> SetInitialReading(MeterReadingCreateDto dto)
        {
            var client = await _context.Clients.FindAsync(dto.ClientId);
            if (client == null) return NotFound("Client not found");

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            // Check if client already has any actual readings (not placeholders)
            var existingActualReadings = await _context.MeterReadings
                .Where(r => r.ClientId == dto.ClientId &&
                           !(r.CurrentReading == 0 && r.PreviousReading == 0 && r.UnitsUsed == 0))
                .AnyAsync();

            if (existingActualReadings)
            {
                return BadRequest($"Client {client.FullName} already has actual meter readings. Initial reading can only be set for new clients.");
            }

            // Remove any existing placeholder readings for this client
            var placeholderReadings = await _context.MeterReadings
                .Where(r => r.ClientId == dto.ClientId &&
                           r.CurrentReading == 0 && r.PreviousReading == 0 && r.UnitsUsed == 0)
                .ToListAsync();

            if (placeholderReadings.Any())
            {
                _context.MeterReadings.RemoveRange(placeholderReadings);
            }

            var billingPeriod = $"{DateTime.UtcNow:yyyy-MM}";

            var initialReading = new MeterReading
            {
                ClientId = dto.ClientId,
                CurrentReading = dto.CurrentReading,
                PreviousReading = 0, // Initial reading always has 0 as previous
                UnitsUsed = dto.CurrentReading, // For initial reading, units used = current reading
                RecordedByUserId = userId,
                Status = "Approved",
                BillingPeriod = billingPeriod,
                ReadingDate = DateTime.UtcNow
            };

            _context.MeterReadings.Add(initialReading);
            await _context.SaveChangesAsync();

            // Auto-generate bill only if units were used
            if (initialReading.UnitsUsed > 0)
            {
                await GenerateBill(initialReading);
            }

            var response = new MeterReadingResponseDto
            {
                Id = initialReading.Id,
                ClientId = initialReading.ClientId,
                ClientName = client.FullName,
                MeterNumber = client.MeterNumber,
                CurrentReading = initialReading.CurrentReading,
                PreviousReading = initialReading.PreviousReading,
                UnitsUsed = initialReading.UnitsUsed,
                ReadingDate = initialReading.ReadingDate,
                RecordedByUsername = User.Identity?.Name ?? "System",
                Status = initialReading.Status,
                BillingPeriod = initialReading.BillingPeriod
            };

            return Ok(response);
        }

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

            var currentMonth = DateTime.UtcNow.Month;
            var currentYear = DateTime.UtcNow.Year;

            // VALIDATION: Check if reading already exists for this month
            // Exclude placeholder/initial readings (readings with CurrentReading = 0 and PreviousReading = 0 and UnitsUsed = 0)
            var existingReadingThisMonth = await _context.MeterReadings
                .Where(r => r.ClientId == dto.ClientId && 
                           r.ReadingDate.Month == currentMonth && 
                           r.ReadingDate.Year == currentYear &&
                           !(r.CurrentReading == 0 && r.PreviousReading == 0 && r.UnitsUsed == 0)) // Exclude placeholder readings
                .FirstOrDefaultAsync();

            if (existingReadingThisMonth != null)
            {
                // Add debugging information
                var debugInfo = $"Existing reading found - ID: {existingReadingThisMonth.Id}, " +
                               $"Date: {existingReadingThisMonth.ReadingDate:yyyy-MM-dd HH:mm:ss}, " +
                               $"Current Reading: {existingReadingThisMonth.CurrentReading}, " +
                               $"Recorded By: {existingReadingThisMonth.RecordedByUserId}";
                
                Console.WriteLine($"Monthly reading validation failed for Client {dto.ClientId}: {debugInfo}");
                
                // Check if admin is overriding the monthly restriction
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;
                if (dto.OverrideMonthlyRestriction && currentUserRole == "Admin")
                {
                    Console.WriteLine($"Admin override applied for Client {dto.ClientId} by user {userId}");
                    // Continue with reading creation - skip the monthly restriction
                }
                else
                {
                    return BadRequest($"Reading already exists for {client.FullName} for {DateTime.UtcNow:MMMM yyyy}. Only one reading per month is allowed. " +
                                    $"Existing reading was recorded on {existingReadingThisMonth.ReadingDate:yyyy-MM-dd} with value {existingReadingThisMonth.CurrentReading}.");
                }
            }

            // Get the last actual reading (not placeholder readings)
            var lastReading = await _context.MeterReadings
                .Where(r => r.ClientId == dto.ClientId &&
                           !(r.CurrentReading == 0 && r.PreviousReading == 0 && r.UnitsUsed == 0)) // Exclude placeholder readings
                .OrderByDescending(r => r.ReadingDate)
                .FirstOrDefaultAsync();

            var previousReading = lastReading?.CurrentReading ?? 0;

            // VALIDATION: New reading cannot be less than previous reading
            if (dto.CurrentReading < previousReading)
            {
                return BadRequest($"New reading ({dto.CurrentReading}) cannot be less than previous reading ({previousReading}). Please verify the meter reading.");
            }

            var unitsUsed = dto.CurrentReading - previousReading;
            var billingPeriod = $"{DateTime.UtcNow:yyyy-MM}"; // Format: 2024-01

            var reading = new MeterReading
            {
                ClientId = dto.ClientId,
                CurrentReading = dto.CurrentReading,
                PreviousReading = previousReading,
                UnitsUsed = unitsUsed,
                RecordedByUserId = userId,
                Status = "Approved",
                BillingPeriod = billingPeriod,
                ReadingDate = DateTime.UtcNow
            };

            _context.MeterReadings.Add(reading);
            await _context.SaveChangesAsync();

            // Auto-generate bill only if units were used
            if (unitsUsed > 0)
            {
                await GenerateBill(reading);
            }

            // Get the generated bill if any
            var generatedBill = await _context.Bills
                .Where(b => b.ClientId == reading.ClientId && b.BillingPeriod == reading.BillingPeriod)
                .FirstOrDefaultAsync();

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
                RecordedByUsername = User.Identity?.Name ?? "Unknown",
                BillingPeriod = reading.BillingPeriod,
                GeneratedBillId = generatedBill?.Id,
                GeneratedBillNumber = generatedBill?.BillNumber,
                BillAmount = generatedBill?.TotalAmount ?? 0
            };

            return CreatedAtAction(nameof(GetReadings), responseDto);
        }

        /// <summary>
        /// Get all readings
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin,MeterReader")]
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
                    RecordedByUsername = r.RecordedByUser.Username ?? "System",
                    BillingPeriod = r.BillingPeriod,
                    GeneratedBillId = _context.Bills.Where(b => b.ClientId == r.ClientId && b.BillingPeriod == r.BillingPeriod).Select(b => (int?)b.Id).FirstOrDefault(),
                    GeneratedBillNumber = _context.Bills.Where(b => b.ClientId == r.ClientId && b.BillingPeriod == r.BillingPeriod).Select(b => b.BillNumber).FirstOrDefault(),
                    BillAmount = _context.Bills.Where(b => b.ClientId == r.ClientId && b.BillingPeriod == r.BillingPeriod).Select(b => b.TotalAmount).FirstOrDefault()
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
            // VALIDATION: Check if bill already exists for this client in this billing period
            var existingBill = await _context.Bills
                .Where(b => b.ClientId == reading.ClientId && 
                           b.BillingPeriod == reading.BillingPeriod &&
                           b.Status != "Deleted")
                .FirstOrDefaultAsync();

            if (existingBill != null)
            {
                // Log the issue but don't throw exception to avoid breaking the reading process
                Console.WriteLine($"Warning: Bill already exists for Client {reading.ClientId} in period {reading.BillingPeriod}. Skipping bill generation.");
                return;
            }

            var settings = await _context.SystemSettings.FirstOrDefaultAsync() 
                ?? new SystemSettings { RatePerUnit = 50, PenaltyRate = 10, GracePeriodDays = 30 };

            var amount = reading.UnitsUsed * settings.RatePerUnit;
            var dueDate = DateTime.UtcNow.AddDays(settings.GracePeriodDays);
            var billNumber = await GenerateBillNumber();

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            var bill = new Bill
            {
                ClientId = reading.ClientId,
                MeterReadingId = reading.Id, // Link bill to the reading that generated it
                BillNumber = billNumber,
                UnitsUsed = reading.UnitsUsed,
                RatePerUnit = settings.RatePerUnit,
                Amount = amount,
                PenaltyAmount = 0, // No penalty on new bills
                TotalAmount = amount,
                DueDate = dueDate,
                CreatedByUserId = userId,
                BillingPeriod = reading.BillingPeriod,
                BillDate = DateTime.UtcNow
            };

            _context.Bills.Add(bill);
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Delete a meter reading (Admin only)
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteReading(int id)
        {
            try
            {
                Console.WriteLine($"Attempting to delete reading with ID: {id}");
                
                var reading = await _context.MeterReadings.FindAsync(id);
                if (reading == null)
                {
                    Console.WriteLine($"Reading with ID {id} not found");
                    return NotFound("Reading not found");
                }

                Console.WriteLine($"Found reading: Client {reading.ClientId}, Date {reading.ReadingDate}");

                // Check if this reading has generated bills and auto-delete them
                var associatedBills = await _context.Bills
                    .Where(b => b.MeterReadingId == id)
                    .ToListAsync();

                Console.WriteLine($"Found {associatedBills.Count} associated bills");

                if (associatedBills.Any())
                {
                    var billNumbers = string.Join(", ", associatedBills.Select(b => b.BillNumber));
                    Console.WriteLine($"Auto-deleting associated bills: {billNumbers}");
                    
                    // Automatically delete associated bills first
                    _context.Bills.RemoveRange(associatedBills);
                    await _context.SaveChangesAsync();
                    Console.WriteLine($"Successfully deleted {associatedBills.Count} associated bills");
                }

                Console.WriteLine("No associated bills found, proceeding with deletion");
                _context.MeterReadings.Remove(reading);
                await _context.SaveChangesAsync();
                Console.WriteLine("Reading deleted successfully");
                
                return Ok(new { message = "Reading deleted successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting reading {id}: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return BadRequest($"Error deleting reading: {ex.Message}");
            }
        }

        /// <summary>
        /// Generate a unique bill number
        /// </summary>
        private async Task<string> GenerateBillNumber()
        {
            var currentDate = DateTime.UtcNow;
            var prefix = $"BILL-{currentDate:yyyyMM}";
            
            // Get the count of bills created this month
            var billCount = await _context.Bills
                .Where(b => b.BillDate.Year == currentDate.Year && 
                           b.BillDate.Month == currentDate.Month)
                .CountAsync();
            
            // Generate bill number with sequential number
            var sequentialNumber = (billCount + 1).ToString("D4"); // 4-digit number with leading zeros
            
            return $"{prefix}-{sequentialNumber}";
        }

    }
}
