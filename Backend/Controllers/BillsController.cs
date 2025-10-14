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
    public class BillsController(WaterBillingDbContext context, IEmailService emailService) : ControllerBase
    {
        private readonly WaterBillingDbContext _context = context;
        private readonly IEmailService _emailService = emailService;

        /// <summary>
        /// Get all bills with pagination - Clean CRUD pattern like Users
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin,MeterReader,Client,Customer")]
        public async Task<ActionResult<IEnumerable<object>>> GetAllBills(
            [FromQuery] int page = 1, 
            [FromQuery] int pageSize = 20,
            [FromQuery] string? status = null)
        {
            try
            {
                // Simple, clean query - avoid problematic Client table for now
                var query = _context.Bills
                    .Include(b => b.Client)
                    .ThenInclude(c => c.User)
                    .AsNoTracking()
                    .Where(b => b.Status != "Deleted") // Exclude deleted bills
                    .AsQueryable();

                // Filter by user role - clients only see their own bills
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
                if (userRole == "Client" || userRole == "Customer")
                {
                    var username = User.Identity?.Name;
                    var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
                    if (user != null)
                    {
                        query = query.Where(b => b.ClientId == user.Id);
                    }
                }

                if (!string.IsNullOrEmpty(status))
                {
                    query = query.Where(b => b.Status == status);
                }

                // Simple bill data without Client table joins
                var bills = await query
                    .OrderByDescending(b => b.BillDate)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(b => new
                    {
                        id = b.Id,
                        clientId = b.ClientId,
                        clientName = b.Client?.User?.Username ?? "Unknown Client",
                        billDate = b.BillDate,
                        dueDate = b.DueDate,
                        previousReading = b.PreviousReading,
                        currentReading = b.CurrentReading,
                        consumption = b.Consumption,
                        amount = b.Amount,
                        status = b.Status ?? "Pending",
                        isPaid = b.IsPaid,
                        paidDate = b.PaidDate,
                        createdDate = b.CreatedDate
                    })
                    .ToListAsync();

                return Ok(bills);
            }
            catch (Exception ex)
            {
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    $"Error retrieving bills: {ex.Message}");
            }
        }

        /// <summary>
        /// Get client bills with role-based access control
        /// </summary>
        [HttpGet("client/{clientId}")]
        public async Task<ActionResult<IEnumerable<BillResponseDto>>> GetClientBills(int clientId)
        {
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            // Verify client exists
            var client = await _context.Clients.FindAsync(clientId);
            if (client == null) return NotFound("Client not found");

            // If client role, ensure they can only see their own bills
            if (userRole == "Client" || userRole == "Customer")
            {
                var clientRecord = await _context.Clients
                    .FirstOrDefaultAsync(c => c.CreatedByUserId == userId && c.Id == clientId);
                if (clientRecord == null) return Forbid("Access denied: You can only view your own bills");
            }

            var bills = await _context.Bills
                .Include(b => b.Client)
                .Include(b => b.Payments)
                .Where(b => b.ClientId == clientId && b.Status != "Deleted") // Exclude deleted bills
                .OrderByDescending(b => b.BillDate)
                .Select(b => new BillResponseDto
                {
                    Id = b.Id,
                    ClientId = b.ClientId,
                    ClientName = b.Client.FullName,
                    BillNumber = b.BillNumber,
                    UnitsUsed = b.UnitsUsed,
                    RatePerUnit = b.RatePerUnit,
                    Amount = b.Amount,
                    PenaltyAmount = b.PenaltyAmount,
                    TotalAmount = b.TotalAmount,
                    BillDate = b.BillDate,
                    DueDate = b.DueDate,
                    Status = b.Status,
                    AmountPaid = b.Payments.Sum(p => p.Amount),
                    Balance = b.TotalAmount - b.Payments.Sum(p => p.Amount)
                })
                .ToListAsync();

            return Ok(bills);
        }


        /// <summary>
        /// Get bill details with payments
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<BillDetailResponseDto>> GetBillDetails(int id)
        {
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            var bill = await _context.Bills
                .Include(b => b.Client)
                .Include(b => b.Payments)
                .ThenInclude(p => p.RecordedByUser)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (bill == null) return NotFound("Bill not found");

            // Role-based access control
            if (userRole == "Client")
            {
                var clientRecord = await _context.Clients
                    .FirstOrDefaultAsync(c => c.CreatedByUserId == userId && c.Id == bill.ClientId);
                if (clientRecord == null) return Forbid("Access denied");
            }

            var totalPaid = bill.Payments.Sum(p => p.Amount);
            var balance = bill.TotalAmount - totalPaid;

            var response = new BillDetailResponseDto
            {
                Id = bill.Id,
                ClientId = bill.ClientId,
                ClientName = bill.Client.FullName,
                BillNumber = bill.BillNumber,
                UnitsUsed = bill.UnitsUsed,
                RatePerUnit = bill.RatePerUnit,
                Amount = bill.Amount,
                PenaltyAmount = bill.PenaltyAmount,
                TotalAmount = bill.TotalAmount,
                BillDate = bill.BillDate,
                DueDate = bill.DueDate,
                Status = bill.Status,
                AmountPaid = totalPaid,
                Balance = balance,
                Payments = bill.Payments.Select(p => new PaymentResponseDto
                {
                    Id = p.Id,
                    BillId = p.BillId,
                    BillNumber = bill.BillNumber,
                    ClientName = bill.Client.FullName,
                    Amount = p.Amount,
                    PaymentDate = p.PaymentDate,
                    PaymentMethod = p.PaymentMethod,
                    Reference = p.Reference,
                    RecordedByUsername = p.RecordedByUser.Username ?? "Unknown"
                }).OrderByDescending(p => p.PaymentDate).ToList()
            };

            return Ok(response);
        }

        /// <summary>
        /// Send bill reminder email to client
        /// </summary>
        [HttpPost("{id}/remind")]
        [Authorize(Roles = "Admin,MeterReader")]
        public async Task<IActionResult> SendBillReminder(int id)
        {
            try
            {
                var bill = await _context.Bills
                    .Include(b => b.Client)
                    .FirstOrDefaultAsync(b => b.Id == id);

                if (bill == null)
                    return NotFound("Bill not found");

                if (bill.Status == "Paid")
                    return BadRequest("Cannot send reminder for paid bills");

                if (string.IsNullOrEmpty(bill.Client.Email))
                    return BadRequest("Client email not found");

                // Create BillResponseDto for email
                var billDto = new BillResponseDto
                {
                    Id = bill.Id,
                    ClientId = bill.ClientId,
                    ClientName = bill.Client.FullName,
                    BillNumber = bill.BillNumber,
                    UnitsUsed = bill.UnitsUsed,
                    RatePerUnit = bill.RatePerUnit,
                    Amount = bill.Amount,
                    PenaltyAmount = bill.PenaltyAmount,
                    TotalAmount = bill.TotalAmount,
                    BillDate = bill.BillDate,
                    DueDate = bill.DueDate,
                    Status = bill.Status,
                    AmountPaid = bill.Payments?.Sum(p => p.Amount) ?? 0,
                    Balance = bill.TotalAmount - (bill.Payments?.Sum(p => p.Amount) ?? 0)
                };

                var emailSent = await _emailService.SendBillReminderEmailAsync(
                    bill.Client.Email, 
                    bill.Client.FullName, 
                    billDto);

                if (emailSent)
                {
                    return Ok(new { message = "Bill reminder sent successfully", email = bill.Client.Email });
                }
                else
                {
                    return StatusCode(500, "Failed to send bill reminder email");
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error sending bill reminder: {ex.Message}");
            }
        }

        /// <summary>
        /// Delete a bill (Admin only)
        /// </summary>
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteBill(int id)
        {
            try
            {
                Console.WriteLine($"[DELETE BILL] Attempting to delete bill with ID: {id}");
                
                var bill = await _context.Bills
                    .Include(b => b.Payments)
                    .FirstOrDefaultAsync(b => b.Id == id);
                    
                if (bill == null)
                {
                    Console.WriteLine($"[DELETE BILL] Bill with ID {id} not found");
                    return NotFound(new { Message = $"Bill with ID {id} not found" });
                }

                Console.WriteLine($"[DELETE BILL] Found bill: {bill.BillNumber}, Status: {bill.Status}, Payments: {bill.Payments?.Count ?? 0}");

                // Check if bill has payments
                if (bill.Payments != null && bill.Payments.Any())
                {
                    Console.WriteLine($"[DELETE BILL] Cannot delete bill {bill.BillNumber} - has {bill.Payments.Count} payments");
                    return BadRequest(new { Message = "Cannot delete bill with existing payments. Please delete payments first or contact system administrator." });
                }

                // Soft delete - set status to "Deleted" instead of removing from database
                var oldStatus = bill.Status;
                bill.Status = "Deleted";
                
                await _context.SaveChangesAsync();
                
                Console.WriteLine($"[DELETE BILL] Successfully deleted bill {bill.BillNumber} (changed status from {oldStatus} to Deleted)");
                
                return Ok(new { 
                    Message = "Bill deleted successfully", 
                    BillId = id,
                    BillNumber = bill.BillNumber,
                    PreviousStatus = oldStatus
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DELETE BILL] Error deleting bill {id}: {ex.Message}");
                Console.WriteLine($"[DELETE BILL] Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { Message = $"Error deleting bill: {ex.Message}" });
            }
        }


    }
}
