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
        public async Task<IActionResult> GetFinancialReport(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string? export = null)
        {
            fromDate ??= DateTime.UtcNow.AddMonths(-12); // Last 12 months for better data
            toDate ??= DateTime.UtcNow;

            // Get all bills (not filtered by date for total calculations)
            var allBills = await _context.Bills.Include(b => b.Payments).ToListAsync();
            var allPayments = await _context.Payments.ToListAsync();
            var allReadings = await _context.MeterReadings.ToListAsync();

            // Calculate total revenue (all payments ever collected)
            var totalRevenue = allPayments.Sum(p => p.Amount);
            
            // Calculate outstanding payments (unpaid bills - sum of total amounts minus payments)
            var outstandingPayments = allBills
                .Where(b => b.Status == "Unpaid")
                .Sum(b => b.TotalAmount - b.Payments.Sum(p => p.Amount));
            
            // Calculate total consumption (all meter readings)
            var totalConsumption = allReadings.Sum(r => r.UnitsUsed);

            // Count bills by status
            var paidBillsCount = allBills.Count(b => b.Status == "Paid");
            var pendingBillsCount = allBills.Count(b => b.Status == "Unpaid" && b.DueDate >= DateTime.UtcNow);
            var overdueBillsCount = allBills.Count(b => b.Status == "Unpaid" && b.DueDate < DateTime.UtcNow);

            // Count disconnected clients - avoid problematic Client table for now
            var disconnectedClients = 0; // Placeholder until Client table is fixed

            // Get monthly revenue data (last 12 months)
            var monthlyRevenue = allPayments
                .Where(p => p.PaymentDate >= fromDate && p.PaymentDate <= toDate)
                .GroupBy(p => new { p.PaymentDate.Year, p.PaymentDate.Month })
                .Select(g => new MonthlyRevenueData
                {
                    Month = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("yyyy-MM"),
                    Total = g.Sum(p => p.Amount)
                })
                .OrderBy(m => m.Month)
                .ToList();

            // Get monthly consumption data (last 12 months) - grouped by billing period
            var monthlyConsumption = allReadings
                .Where(r => r.ReadingDate >= fromDate && r.ReadingDate <= toDate && !string.IsNullOrEmpty(r.BillingPeriod))
                .GroupBy(r => r.BillingPeriod)
                .Select(g => new
                {
                    Period = g.Key,
                    Readings = g.ToList()
                })
                .ToList()
                .Select(g =>
                {
                    var billsInPeriod = allBills.Where(b => b.BillingPeriod == g.Period).ToList();
                    return new MonthlyConsumptionData
                    {
                        Month = g.Period,
                        Paid = billsInPeriod.Where(b => b.Status == "Paid").Sum(b => b.UnitsUsed),
                        Pending = billsInPeriod.Where(b => b.Status == "Unpaid" && b.DueDate >= DateTime.UtcNow).Sum(b => b.UnitsUsed),
                        Overdue = billsInPeriod.Where(b => b.Status == "Unpaid" && b.DueDate < DateTime.UtcNow).Sum(b => b.UnitsUsed),
                        Total = g.Readings.Sum(r => r.UnitsUsed)
                    };
                })
                .OrderBy(m => m.Month)
                .ToList();

            // Get filtered data for period-specific calculations
            var bills = allBills.Where(b => b.BillDate >= fromDate && b.BillDate <= toDate).ToList();
            var payments = allPayments.Where(p => p.PaymentDate >= fromDate && p.PaymentDate <= toDate).ToList();

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
                OverdueBills = bills.Count(b => b.Status == "Overdue"),
                
                // New properties for frontend
                TotalRevenue = totalRevenue,
                OutstandingPayments = outstandingPayments,
                TotalConsumption = totalConsumption,
                PaidBillsCount = paidBillsCount,
                PendingBillsCount = pendingBillsCount,
                OverdueBillsCount = overdueBillsCount,
                DisconnectedClients = disconnectedClients,
                MonthlyRevenueData = monthlyRevenue,
                MonthlyConsumptionData = monthlyConsumption
            };

            // Handle export formats
            if (!string.IsNullOrEmpty(export))
            {
                switch (export.ToLower())
                {
                    case "pdf":
                        return GeneratePdfReport(report);
                    case "html":
                        return GenerateHtmlReport(report);
                    default:
                        return BadRequest("Unsupported export format. Use 'pdf' or 'html'.");
                }
            }

            return Ok(report);
        }

        private IActionResult GeneratePdfReport(FinancialReportDto report)
        {
            // For now, return HTML that can be printed as PDF
            var html = GenerateReportHtml(report);
            return Content(html, "text/html");
        }

        private IActionResult GenerateHtmlReport(FinancialReportDto report)
        {
            var html = GenerateReportHtml(report);
            var fileName = $"Financial_Report_{DateTime.Now:yyyyMMdd_HHmmss}.html";
            
            Response.Headers.Append("Content-Disposition", $"attachment; filename=\"{fileName}\"");
            return Content(html, "text/html");
        }

        private string GenerateReportHtml(FinancialReportDto report)
        {
            var html = $@"
<!DOCTYPE html>
<html>
<head>
    <title>Financial Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .header {{ text-align: center; margin-bottom: 30px; }}
        .company-name {{ font-size: 24px; font-weight: bold; color: #2c3e50; }}
        .report-title {{ font-size: 18px; color: #34495e; margin-top: 10px; }}
        .period {{ font-size: 14px; color: #7f8c8d; margin-top: 5px; }}
        .summary-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }}
        .summary-card {{ border: 1px solid #ddd; padding: 20px; border-radius: 8px; background: #f8f9fa; }}
        .summary-card h3 {{ margin: 0 0 10px 0; color: #2c3e50; font-size: 16px; }}
        .summary-card .value {{ font-size: 24px; font-weight: bold; color: #27ae60; }}
        .summary-card .currency {{ color: #e74c3c; }}
        .summary-card .consumption {{ color: #3498db; }}
        .summary-card .count {{ color: #9b59b6; }}
        .table-section {{ margin: 30px 0; }}
        .table-section h3 {{ color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
        th {{ background-color: #3498db; color: white; font-weight: bold; }}
        tr:nth-child(even) {{ background-color: #f2f2f2; }}
        .footer {{ margin-top: 40px; text-align: center; font-size: 12px; color: #7f8c8d; }}
        @media print {{ body {{ margin: 0; }} }}
    </style>
</head>
<body>
    <div class='header'>
        <div class='company-name'>Denkam Waters</div>
        <div class='report-title'>Financial Report</div>
        <div class='period'>Period: {report.Period.FromDate:yyyy-MM-dd} to {report.Period.ToDate:yyyy-MM-dd}</div>
        <div class='period'>Generated on: {DateTime.Now:yyyy-MM-dd HH:mm:ss}</div>
    </div>

    <div class='summary-grid'>
        <div class='summary-card'>
            <h3>Total Revenue</h3>
            <div class='value currency'>KSh {report.TotalRevenue:N2}</div>
        </div>
        <div class='summary-card'>
            <h3>Outstanding Payments</h3>
            <div class='value currency'>KSh {report.OutstandingPayments:N2}</div>
        </div>
        <div class='summary-card'>
            <h3>Total Consumption</h3>
            <div class='value consumption'>{report.TotalConsumption:N2} m³</div>
        </div>
        <div class='summary-card'>
            <h3>Paid Bills</h3>
            <div class='value count'>{report.PaidBillsCount}</div>
        </div>
        <div class='summary-card'>
            <h3>Pending Bills</h3>
            <div class='value count'>{report.PendingBillsCount}</div>
        </div>
        <div class='summary-card'>
            <h3>Overdue Bills</h3>
            <div class='value count'>{report.OverdueBillsCount}</div>
        </div>
    </div>

    <div class='table-section'>
        <h3>Monthly Revenue Breakdown</h3>
        <table>
            <thead>
                <tr>
                    <th>Month</th>
                    <th>Revenue (KSh)</th>
                </tr>
            </thead>
            <tbody>";

            foreach (var monthData in report.MonthlyRevenueData)
            {
                html += $@"
                <tr>
                    <td>{monthData.Month}</td>
                    <td>{monthData.Total:N2}</td>
                </tr>";
            }

            html += $@"
            </tbody>
        </table>
    </div>

    <div class='table-section'>
        <h3>Monthly Consumption Breakdown</h3>
        <table>
            <thead>
                <tr>
                    <th>Month</th>
                    <th>Paid (m³)</th>
                    <th>Pending (m³)</th>
                    <th>Overdue (m³)</th>
                    <th>Total (m³)</th>
                </tr>
            </thead>
            <tbody>";

            foreach (var monthData in report.MonthlyConsumptionData)
            {
                html += $@"
                <tr>
                    <td>{monthData.Month}</td>
                    <td>{monthData.Paid:N2}</td>
                    <td>{monthData.Pending:N2}</td>
                    <td>{monthData.Overdue:N2}</td>
                    <td>{monthData.Total:N2}</td>
                </tr>";
            }

            html += $@"
            </tbody>
        </table>
    </div>

    <div class='table-section'>
        <h3>Summary Statistics</h3>
        <table>
            <tbody>
                <tr><td><strong>Collection Rate</strong></td><td>{report.CollectionRate:N2}%</td></tr>
                <tr><td><strong>Total Bills Generated</strong></td><td>{report.TotalBills}</td></tr>
                <tr><td><strong>Total Amount Billed</strong></td><td>KSh {report.TotalBilled:N2}</td></tr>
                <tr><td><strong>Total Amount Collected</strong></td><td>KSh {report.TotalCollected:N2}</td></tr>
                <tr><td><strong>Disconnected Clients</strong></td><td>{report.DisconnectedClients}</td></tr>
            </tbody>
        </table>
    </div>

    <div class='footer'>
        <p>This report was generated automatically by Denkam Waters Billing System.</p>
        <p>For questions or support, please contact the system administrator.</p>
    </div>
</body>
</html>";

            return html;
        }
    }
}
