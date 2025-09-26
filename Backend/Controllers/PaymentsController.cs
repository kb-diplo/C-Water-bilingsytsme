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
    public class PaymentsController(WaterBillingDbContext context) : ControllerBase
    {
        private readonly WaterBillingDbContext _context = context;

        /// <summary>
        /// Record payment with validation
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<PaymentResponseDto>> RecordPayment(PaymentCreateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var bill = await _context.Bills
                .Include(b => b.Client)
                .FirstOrDefaultAsync(b => b.Id == dto.BillId);
            if (bill == null) return NotFound("Bill not found");

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // Role-based access control
            if (userRole == "Client")
            {
                var clientRecord = await _context.Clients
                    .FirstOrDefaultAsync(c => c.CreatedByUserId == userId && c.Id == bill.ClientId);
                if (clientRecord == null) return Forbid("Access denied: You can only pay your own bills");
            }

            // Validate payment amount
            var currentBalance = bill.TotalAmount - await _context.Payments
                .Where(p => p.BillId == dto.BillId)
                .SumAsync(p => p.Amount);
            
            if (dto.Amount > currentBalance)
            {
                return BadRequest($"Payment amount ({dto.Amount:C}) exceeds outstanding balance ({currentBalance:C})");
            }

            var payment = new Payment
            {
                BillId = dto.BillId,
                Amount = dto.Amount,
                PaymentMethod = dto.PaymentMethod,
                Reference = dto.Reference,
                RecordedByUserId = userId
            };

            _context.Payments.Add(payment);

            // Update bill status if fully paid
            var totalPaid = await _context.Payments
                .Where(p => p.BillId == dto.BillId)
                .SumAsync(p => p.Amount) + dto.Amount;

            if (totalPaid >= bill.TotalAmount)
            {
                bill.Status = "Paid";
            }

            await _context.SaveChangesAsync();

            // Return DTO response
            var user = await _context.Users.FindAsync(userId);
            var response = new PaymentResponseDto
            {
                Id = payment.Id,
                BillId = payment.BillId,
                BillNumber = bill.BillNumber,
                ClientName = bill.Client.FullName,
                Amount = payment.Amount,
                PaymentDate = payment.PaymentDate,
                PaymentMethod = payment.PaymentMethod,
                Reference = payment.Reference,
                RecordedByUsername = user?.Username ?? "Unknown"
            };

            return CreatedAtAction(nameof(GetPayments), response);
        }

        /// <summary>
        /// Get all payments with pagination
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<PaymentResponseDto>>> GetPayments(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? paymentMethod = null)
        {
            var query = _context.Payments
                .Include(p => p.Bill)
                .ThenInclude(b => b.Client)
                .Include(p => p.RecordedByUser)
                .AsQueryable();

            if (!string.IsNullOrEmpty(paymentMethod))
            {
                query = query.Where(p => p.PaymentMethod == paymentMethod);
            }

            var payments = await query
                .OrderByDescending(p => p.PaymentDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new PaymentResponseDto
                {
                    Id = p.Id,
                    BillId = p.BillId,
                    BillNumber = p.Bill.BillNumber,
                    ClientName = p.Bill.Client.FullName,
                    Amount = p.Amount,
                    PaymentDate = p.PaymentDate,
                    PaymentMethod = p.PaymentMethod,
                    Reference = p.Reference,
                    RecordedByUsername = p.RecordedByUser.Username ?? "Unknown"
                })
                .ToListAsync();

            return Ok(payments);
        }



        /// <summary>
        /// Get client payment history
        /// </summary>
        [HttpGet("client/{clientId}")]
        public async Task<ActionResult<IEnumerable<PaymentResponseDto>>> GetClientPayments(int clientId)
        {
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            var client = await _context.Clients.FindAsync(clientId);
            if (client == null) return NotFound("Client not found");

            // Role-based access control
            if (userRole == "Client")
            {
                var clientRecord = await _context.Clients
                    .FirstOrDefaultAsync(c => c.CreatedByUserId == userId && c.Id == clientId);
                if (clientRecord == null) return Forbid("Access denied");
            }

            var payments = await _context.Payments
                .Include(p => p.Bill)
                .Include(p => p.RecordedByUser)
                .Where(p => p.Bill.ClientId == clientId)
                .OrderByDescending(p => p.PaymentDate)
                .Select(p => new PaymentResponseDto
                {
                    Id = p.Id,
                    BillId = p.BillId,
                    BillNumber = p.Bill.BillNumber,
                    ClientName = client.FullName,
                    Amount = p.Amount,
                    PaymentDate = p.PaymentDate,
                    PaymentMethod = p.PaymentMethod,
                    Reference = p.Reference,
                    RecordedByUsername = p.RecordedByUser.Username ?? "Unknown"
                })
                .ToListAsync();

            return Ok(payments);
        }
    }
}
