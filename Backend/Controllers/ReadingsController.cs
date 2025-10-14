using Microsoft.AspNetCore.Authorization;
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
    public class ReadingsController(WaterBillingDbContext context, IPriceService priceService) : ControllerBase
    {
        private readonly WaterBillingDbContext _context = context;
        private readonly IPriceService _priceService = priceService;

        /// <summary>
        /// Set initial reading for a client (Admin only) - This sets the baseline, not a regular reading
        /// </summary>
        [HttpPost("initial")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<object>> SetInitialReading(InitialReadingDto dto)
        {
            var client = await _context.Clients.FindAsync(dto.ClientId);
            if (client == null) return NotFound("Client not found");

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            // Check if client already has meter readings
            var existingReadings = await _context.MeterReadings
                .Where(r => r.ClientId == dto.ClientId)
                .AnyAsync();

            if (existingReadings)
            {
                return BadRequest($"Client {client.FullName} already has meter readings. Initial reading can only be set for clients without any readings.");
            }

            // Update client with initial reading information
            client.InitialReading = dto.InitialReading;
            // client.HasInitialReading = true; // TEMPORARILY COMMENTED OUT DUE TO DB SCHEMA MISMATCH
            client.InitialReadingDate = DateTime.UtcNow;
            client.InitialReadingSetByUserId = userId;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Initial reading of {dto.InitialReading} m³ set successfully for {client.FullName}",
                clientId = client.Id,
                clientName = client.FullName,
                initialReading = client.InitialReading,
                setDate = client.InitialReadingDate,
                setBy = User.Identity?.Name ?? "Admin"
            });
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

            // Use provided reading period or default to current month
            var billingPeriod = !string.IsNullOrEmpty(dto.ReadingPeriod) ? dto.ReadingPeriod : $"{DateTime.UtcNow:yyyy-MM}";
            
            // Validate reading period format (YYYY-MM)
            if (!string.IsNullOrEmpty(dto.ReadingPeriod))
            {
                if (!DateTime.TryParseExact(dto.ReadingPeriod + "-01", "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out _))
                {
                    return BadRequest("Invalid reading period format. Use YYYY-MM format (e.g., 2024-08).");
                }
            }

            // VALIDATION: Check if reading already exists for this billing period
            // Exclude placeholder/initial readings (readings with CurrentReading = 0 and PreviousReading = 0 and UnitsUsed = 0)
            var existingReadingThisPeriod = await _context.MeterReadings
                .Where(r => r.ClientId == dto.ClientId && 
                           r.BillingPeriod == billingPeriod &&
                           !(r.CurrentReading == 0 && r.PreviousReading == 0 && r.UnitsUsed == 0)) // Exclude placeholder readings
                .FirstOrDefaultAsync();

            if (existingReadingThisPeriod != null)
            {
                // Add debugging information
                var debugInfo = $"Existing reading found - ID: {existingReadingThisPeriod.Id}, " +
                               $"Date: {existingReadingThisPeriod.ReadingDate:yyyy-MM-dd HH:mm:ss}, " +
                               $"Current Reading: {existingReadingThisPeriod.CurrentReading}, " +
                               $"Recorded By: {existingReadingThisPeriod.RecordedByUserId}";
                
                Console.WriteLine($"Period reading validation failed for Client {dto.ClientId}: {debugInfo}");
                
                // Check if admin is overriding the monthly restriction
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;
                if (dto.OverrideMonthlyRestriction && currentUserRole == "Admin")
                {
                    Console.WriteLine($"Admin override applied for Client {dto.ClientId} by user {userId}");
                    // Continue with reading creation - skip the period restriction
                }
                else
                {
                    return BadRequest($"Reading already exists for {client.FullName} for period {billingPeriod}. Only one reading per period is allowed. " +
                                    $"Existing reading was recorded on {existingReadingThisPeriod.ReadingDate:yyyy-MM-dd} with value {existingReadingThisPeriod.CurrentReading}.");
                }
            }

            // Smart validation based on chronological order
            var allReadings = await _context.MeterReadings
                .Where(r => r.ClientId == dto.ClientId)
                .OrderBy(r => r.BillingPeriod)
                .ToListAsync();

            // Parse the billing period to compare chronologically
            var currentPeriodDate = DateTime.ParseExact(billingPeriod + "-01", "yyyy-MM-dd", null);
            
            // Find readings before and after this period
            var readingsBefore = allReadings.Where(r => 
            {
                var rDate = DateTime.ParseExact(r.BillingPeriod + "-01", "yyyy-MM-dd", null);
                return rDate < currentPeriodDate;
            }).OrderByDescending(r => r.BillingPeriod).ToList();

            var readingsAfter = allReadings.Where(r => 
            {
                var rDate = DateTime.ParseExact(r.BillingPeriod + "-01", "yyyy-MM-dd", null);
                return rDate > currentPeriodDate;
            }).OrderBy(r => r.BillingPeriod).ToList();

            // Determine the appropriate previous reading for calculation
            var previousReading = readingsBefore.FirstOrDefault()?.CurrentReading ?? client.InitialReading;

            // CHRONOLOGICAL VALIDATION
            // 1. Reading must be >= previous chronological reading (if any)
            if (readingsBefore.Any() && dto.CurrentReading < previousReading)
            {
                return BadRequest($"New reading ({dto.CurrentReading}) cannot be less than the previous chronological reading ({previousReading}) for period {readingsBefore.First().BillingPeriod}. Please verify the meter reading.");
            }

            // 2. Reading must be <= next chronological reading (if any)
            if (readingsAfter.Any() && dto.CurrentReading > readingsAfter.First().CurrentReading)
            {
                return BadRequest($"New reading ({dto.CurrentReading}) cannot be greater than the next chronological reading ({readingsAfter.First().CurrentReading}) for period {readingsAfter.First().BillingPeriod}. Please verify the meter reading.");
            }

            // 3. If no previous readings, must be >= initial reading
            if (!readingsBefore.Any() && dto.CurrentReading < client.InitialReading)
            {
                return BadRequest($"New reading ({dto.CurrentReading}) cannot be less than the initial reading ({client.InitialReading}). Please verify the meter reading.");
            }

            var unitsUsed = dto.CurrentReading - previousReading;
            // billingPeriod is already set above based on dto.ReadingPeriod or current month

            var reading = new MeterReading
            {
                ClientId = dto.ClientId,
                CurrentReading = dto.CurrentReading,
                PreviousReading = previousReading,
                UnitsUsed = unitsUsed,
                RecordedByUserId = userId,
                Status = "Approved",
                BillingPeriod = billingPeriod,
                ReadingDate = DateTime.UtcNow // Always use current date for when reading was actually recorded
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

            // Get the appropriate rate for the billing period
            var ratePerUnit = await _priceService.GetRateForPeriodAsync(reading.BillingPeriod);
            var amount = reading.UnitsUsed * ratePerUnit;

            // Get system settings for grace period (this doesn't change with price history)
            var settings = await _context.SystemSettings.FirstOrDefaultAsync() 
                ?? new SystemSettings { RatePerUnit = 50, PenaltyRate = 10, GracePeriodDays = 30 };
            var dueDate = DateTime.UtcNow.AddDays(settings.GracePeriodDays);
            var billNumber = await GenerateBillNumber();

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            var bill = new Bill
            {
                ClientId = reading.ClientId,
                MeterReadingId = reading.Id, // Link bill to the reading that generated it
                BillNumber = billNumber,
                UnitsUsed = reading.UnitsUsed,
                RatePerUnit = ratePerUnit,
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
