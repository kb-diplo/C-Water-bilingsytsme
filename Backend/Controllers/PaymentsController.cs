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
    public class PaymentsController(WaterBillingDbContext context, IMpesaService mpesaService, IReceiptService receiptService, IEmailService emailService, ILogger<PaymentsController> logger) : ControllerBase
    {
        private readonly WaterBillingDbContext _context = context;
        private readonly IMpesaService _mpesaService = mpesaService;
        private readonly IReceiptService _receiptService = receiptService;
        private readonly IEmailService _emailService = emailService;
        private readonly ILogger<PaymentsController> _logger = logger;

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
            if (userRole == "Client" || userRole == "Customer")
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
                Reference = dto.Reference ?? string.Empty,
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
                Reference = payment.Reference ?? string.Empty,
                RecordedByUsername = user?.Username ?? "Unknown"
            };

            // Send payment confirmation email if client has email
            if (!string.IsNullOrEmpty(bill.Client.Email))
            {
                try
                {
                    // Create updated bill DTO with current payment info
                    var updatedBillDto = new BillResponseDto
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
                        Balance = bill.TotalAmount - totalPaid
                    };

                    await _emailService.SendPaymentConfirmationEmailAsync(
                        bill.Client.Email,
                        bill.Client.FullName,
                        response,
                        updatedBillDto);
                }
                catch (Exception ex)
                {
                    // Log email error but don't fail the payment
                    // Failed to send payment confirmation email - continuing with payment processing
                }
            }

            return CreatedAtAction(nameof(GetPayments), response);
        }

        /// <summary>
        /// Get all payments with pagination - Clean CRUD pattern like Users
        /// </summary>
        [HttpGet]
        [Authorize(Policy = "RequireAdminOrMeterReader")]
        public async Task<IActionResult> GetPayments()
        {
            try
            {
                var currentUsername = User.Identity?.Name ?? "Unknown";
                var currentUserRole = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value ?? "No Role";
                
                _logger.LogInformation("GetPayments called by {Username} (Role: {Role})", currentUsername, currentUserRole);
                
                var userRoles = User.FindAll(ClaimTypes.Role)
                    .Select(c => c.Value.ToLowerInvariant())
                    .ToHashSet();
                
                if (!userRoles.Contains("admin") && !userRoles.Contains("meterreader"))
                {
                    _logger.LogWarning("Unauthorized access attempt by {Username}. User roles: {UserRoles}", 
                        currentUsername, string.Join(", ", userRoles));
                    return Forbid("Insufficient permissions");
                }

                // Query Payments with Bill and Client information
                var payments = await _context.Payments
                    .Include(p => p.Bill)
                    .ThenInclude(b => b.Client)
                    .ThenInclude(c => c.User)
                    .AsNoTracking()
                    .OrderByDescending(p => p.PaymentDate)
                    .ToListAsync();

                var paymentDtos = payments.Select(p => new
                {
                    id = p.Id,
                    billId = p.BillId,
                    clientName = p.Bill != null && p.Bill.Client != null && p.Bill.Client.User != null ? p.Bill.Client.User.Username : "Unknown Client",
                    amount = p.Amount,
                    paymentDate = p.PaymentDate,
                    paymentMethod = p.PaymentMethod ?? "Cash",
                    transactionReference = p.Reference ?? "N/A",
                    status = "Completed", // Payments in the system are completed
                    recordedByUserId = p.RecordedByUserId
                }).ToList();

                _logger.LogInformation("Successfully retrieved {Count} payments", paymentDtos.Count);
                return Ok(paymentDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving payments. Error: {ErrorMessage}", ex.Message);
                return StatusCode(
                    StatusCodes.Status500InternalServerError, 
                    "An error occurred while retrieving payments. Please try again later.");
            }
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
            if (userRole == "Client" || userRole == "Customer")
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

        /// <summary>
        /// Initiate Mpesa STK Push payment
        /// </summary>
        [HttpPost("mpesa/stkpush")]
        [Authorize(Roles = "Client,Admin")]
        public async Task<ActionResult<MpesaStkPushResponse>> InitiateMpesaPayment(MpesaStkPushDto dto)
        {
            _logger.LogInformation("STK Push request received: BillId={BillId}, PhoneNumber={PhoneNumber}, Amount={Amount}", 
                dto.BillId, dto.PhoneNumber, dto.Amount);
                
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("STK Push request validation failed: {ModelState}", ModelState);
                return BadRequest(ModelState);
            }

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            
            _logger.LogInformation("STK Push initiated by UserId={UserId}, Role={Role}", userId, userRole);

            // Validate bill exists and user has access
            var bill = await _context.Bills
                .Include(b => b.Client)
                .FirstOrDefaultAsync(b => b.Id == dto.BillId);

            if (bill == null) return NotFound("Bill not found");

            // Clients can only pay their own bills
            if (userRole == "Client" || userRole == "Customer")
            {
                var clientRecord = await _context.Clients
                    .FirstOrDefaultAsync(c => c.CreatedByUserId == userId && c.Id == bill.ClientId);
                if (clientRecord == null) return Forbid("Access denied: You can only pay your own bills");
            }

            // Validate bill is not already fully paid
            var totalPaid = await _context.Payments
                .Where(p => p.BillId == dto.BillId)
                .SumAsync(p => p.Amount);

            var balance = bill.TotalAmount - totalPaid;
            if (balance <= 0)
            {
                return BadRequest("Bill is already fully paid");
            }

            if (dto.Amount > balance)
            {
                return BadRequest($"Payment amount ({dto.Amount:C}) exceeds outstanding balance ({balance:C})");
            }

            var response = await _mpesaService.InitiateStkPushAsync(dto, userId);
            return Ok(response);
        }

        /// <summary>
        /// Mpesa callback endpoint (called by Safaricom)
        /// </summary>
        [HttpPost("mpesa/callback")]
        [AllowAnonymous]
        public async Task<IActionResult> MpesaCallback([FromBody] MpesaCallbackResponse callback)
        {
            try
            {
                var processed = await _mpesaService.ProcessCallbackAsync(callback);
                return Ok(new { success = processed });
            }
            catch (Exception ex)
            {
                // Log error but return OK to prevent Safaricom retries
                return Ok(new { success = false, error = ex.Message });
            }
        }

        /// <summary>
        /// Get Mpesa transaction status
        /// </summary>
        [HttpGet("mpesa/status/{checkoutRequestId}")]
        [Authorize(Roles = "Client,Admin")]
        public async Task<ActionResult<object>> GetMpesaTransactionStatus(string checkoutRequestId)
        {
            var transaction = await _mpesaService.GetTransactionStatusAsync(checkoutRequestId);
            
            if (transaction == null)
                return NotFound("Transaction not found");

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // Clients can only view their own transactions
            if (userRole == "Client" || userRole == "Customer")
            {
                var clientRecord = await _context.Clients
                    .FirstOrDefaultAsync(c => c.CreatedByUserId == userId && c.Id == transaction.Bill.ClientId);
                if (clientRecord == null) return Forbid("Access denied");
            }

            return Ok(new
            {
                transaction.Id,
                transaction.BillId,
                BillNumber = transaction.Bill.BillNumber,
                ClientName = transaction.Bill.Client.FullName,
                transaction.Amount,
                transaction.PhoneNumber,
                transaction.Status,
                transaction.MpesaReceiptNumber,
                transaction.CreatedAt,
                transaction.CompletedAt,
                transaction.ErrorMessage
            });
        }

        /// <summary>
        /// Download payment receipt
        /// </summary>
        [HttpGet("{paymentId}/receipt")]
        public async Task<IActionResult> DownloadPaymentReceipt(int paymentId)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

                // Verify payment exists and user has access
                var payment = await _context.Payments
                    .Include(p => p.Bill)
                    .ThenInclude(b => b.Client)
                    .FirstOrDefaultAsync(p => p.Id == paymentId);

                if (payment == null) return NotFound("Payment not found");

                // Role-based access control
                if (userRole == "Client" || userRole == "Customer")
                {
                    var clientRecord = await _context.Clients
                        .FirstOrDefaultAsync(c => c.CreatedByUserId == userId && c.Id == payment.Bill.ClientId);
                    if (clientRecord == null) return Forbid("Access denied");
                }

                var receiptBytes = await _receiptService.GeneratePaymentReceiptAsync(paymentId);
                var fileName = $"Payment_Receipt_{payment.Bill.BillNumber}_{payment.Id}.html";

                return File(receiptBytes, "text/html", fileName);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error generating receipt: {ex.Message}");
            }
        }

        /// <summary>
        /// Download bill receipt
        /// </summary>
        [HttpGet("bill/{billId}/receipt")]
        public async Task<IActionResult> DownloadBillReceipt(int billId)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

                // Verify bill exists and user has access
                var bill = await _context.Bills
                    .Include(b => b.Client)
                    .FirstOrDefaultAsync(b => b.Id == billId);

                if (bill == null) return NotFound("Bill not found");

                // Role-based access control
                if (userRole == "Client" || userRole == "Customer")
                {
                    var clientRecord = await _context.Clients
                        .FirstOrDefaultAsync(c => c.CreatedByUserId == userId && c.Id == bill.ClientId);
                    if (clientRecord == null) return Forbid("Access denied");
                }

                var receiptBytes = await _receiptService.GenerateBillReceiptAsync(billId);
                var fileName = $"Bill_{bill.BillNumber}.html";

                return File(receiptBytes, "text/html", fileName);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error generating bill: {ex.Message}");
            }
        }
    }
}
