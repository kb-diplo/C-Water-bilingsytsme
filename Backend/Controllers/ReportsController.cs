using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyApi.Data;
using MyApi.Models;

namespace MyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class ReportsController : ControllerBase
    {
        private readonly WaterBillingDbContext _context;

        public ReportsController(WaterBillingDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Get comprehensive financial report
        /// </summary>
        [HttpGet("financial")]
        public async Task<ActionResult<FinancialReportDto>> GetFinancialReport(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            fromDate ??= DateTime.UtcNow.AddMonths(-1);
            toDate ??= DateTime.UtcNow;

            var bills = await _context.Bills
                .Where(b => b.BillDate >= fromDate && b.BillDate <= toDate)
                .ToListAsync();

            var payments = await _context.Payments
                .Where(p => p.PaymentDate >= fromDate && p.PaymentDate <= toDate)
                .ToListAsync();

            var totalBilled = bills.Sum(b => b.TotalAmount);
            var totalCollected = payments.Sum(p => p.Amount);
            var collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

            var report = new FinancialReportDto
            {
                Period = new DateRangeDto { FromDate = fromDate, ToDate = toDate },
                TotalBilled = totalBilled,
                TotalCollected = totalCollected,
                CollectionRate = collectionRate,
                Outstanding = totalBilled - totalCollected,
                TotalBills = bills.Count,
                PaidBills = bills.Count(b => b.Status == "Paid"),
                OverdueBills = bills.Count(b => b.Status == "Overdue")
            };

            return Ok(report);
        }




    }
}
