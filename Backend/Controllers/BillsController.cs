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
    public class BillsController(WaterBillingDbContext context) : ControllerBase
    {
        private readonly WaterBillingDbContext _context = context;

        /// <summary>
        /// Get all bills with pagination
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<BillResponseDto>>> GetAllBills(
            [FromQuery] int page = 1, 
            [FromQuery] int pageSize = 20,
            [FromQuery] string? status = null)
        {
            var query = _context.Bills
                .Include(b => b.Client)
                .Include(b => b.Payments)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(b => b.Status == status);
            }

            var bills = await query
                .OrderByDescending(b => b.BillDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
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
            if (userRole == "Client")
            {
                var clientRecord = await _context.Clients
                    .FirstOrDefaultAsync(c => c.CreatedByUserId == userId && c.Id == clientId);
                if (clientRecord == null) return Forbid("Access denied: You can only view your own bills");
            }

            var bills = await _context.Bills
                .Include(b => b.Client)
                .Include(b => b.Payments)
                .Where(b => b.ClientId == clientId)
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


    }
}
