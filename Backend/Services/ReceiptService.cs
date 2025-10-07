using Microsoft.EntityFrameworkCore;
using MyApi.Data;
using MyApi.Models;
using System.Text;

namespace MyApi.Services
{
    public class ReceiptService : IReceiptService
    {
        private readonly WaterBillingDbContext _context;

        public ReceiptService(WaterBillingDbContext context)
        {
            _context = context;
        }

        public async Task<byte[]> GeneratePaymentReceiptAsync(int paymentId)
        {
            var html = await GenerateReceiptHtmlAsync(paymentId);
            // For now, return HTML as bytes. In production, you'd use a PDF library like iTextSharp or wkhtmltopdf
            return Encoding.UTF8.GetBytes(html);
        }

        public async Task<byte[]> GenerateBillReceiptAsync(int billId)
        {
            var html = await GenerateBillHtmlAsync(billId);
            return Encoding.UTF8.GetBytes(html);
        }

        public async Task<string> GenerateReceiptHtmlAsync(int paymentId)
        {
            var payment = await _context.Payments
                .Include(p => p.Bill)
                .ThenInclude(b => b.Client)
                .Include(p => p.RecordedByUser)
                .FirstOrDefaultAsync(p => p.Id == paymentId);

            if (payment == null)
                throw new ArgumentException("Payment not found");

            var settings = await _context.SystemSettings.FirstOrDefaultAsync();
            var companyName = "Denkam Waters";
            var companyAddress = "Ikinu Location";
            var companyPhone = "0743683868";

            var html = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Payment Receipt - {payment.Bill.BillNumber}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }}
        .receipt {{ background: white; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        .header {{ text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }}
        .company-name {{ font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 5px; }}
        .company-details {{ color: #666; font-size: 14px; }}
        .receipt-title {{ font-size: 20px; font-weight: bold; text-align: center; margin: 20px 0; color: #333; }}
        .receipt-number {{ text-align: center; color: #666; margin-bottom: 30px; }}
        .details-section {{ margin: 20px 0; }}
        .details-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }}
        .details-label {{ font-weight: bold; color: #333; }}
        .details-value {{ color: #666; }}
        .amount-section {{ background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }}
        .amount-row {{ display: flex; justify-content: space-between; padding: 5px 0; }}
        .total-amount {{ font-size: 18px; font-weight: bold; color: #007bff; border-top: 2px solid #007bff; padding-top: 10px; margin-top: 10px; }}
        .footer {{ text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }}
        .status-paid {{ background: #d4edda; color: #155724; padding: 5px 10px; border-radius: 3px; font-weight: bold; }}
        @media print {{ body {{ background: white; }} .receipt {{ box-shadow: none; }} }}
    </style>
</head>
<body>
    <div class='receipt'>
        <div class='header'>
            <div class='company-name'>{companyName}</div>
            <div class='company-details'>
                {companyAddress}<br>
                Phone: {companyPhone}
            </div>
        </div>
        
        <div class='receipt-title'>PAYMENT RECEIPT</div>
        <div class='receipt-number'>Receipt #: {payment.Id:D6}</div>
        
        <div class='details-section'>
            <div class='details-row'>
                <span class='details-label'>Date:</span>
                <span class='details-value'>{payment.PaymentDate:dd MMM yyyy HH:mm}</span>
            </div>
            <div class='details-row'>
                <span class='details-label'>Bill Number:</span>
                <span class='details-value'>{payment.Bill.BillNumber}</span>
            </div>
            <div class='details-row'>
                <span class='details-label'>Client Name:</span>
                <span class='details-value'>{payment.Bill.Client.FullName}</span>
            </div>
            <div class='details-row'>
                <span class='details-label'>Meter Number:</span>
                <span class='details-value'>{payment.Bill.Client.MeterNumber}</span>
            </div>
            <div class='details-row'>
                <span class='details-label'>Location:</span>
                <span class='details-value'>{payment.Bill.Client.Location}</span>
            </div>
            <div class='details-row'>
                <span class='details-label'>Payment Method:</span>
                <span class='details-value'>{payment.PaymentMethod}</span>
            </div>
            {(string.IsNullOrEmpty(payment.Reference) ? "" : $@"
            <div class='details-row'>
                <span class='details-label'>Reference:</span>
                <span class='details-value'>{payment.Reference}</span>
            </div>")}
            <div class='details-row'>
                <span class='details-label'>Recorded By:</span>
                <span class='details-value'>{payment.RecordedByUser?.Username ?? "System"}</span>
            </div>
        </div>
        
        <div class='amount-section'>
            <div class='amount-row'>
                <span>Bill Amount:</span>
                <span>KSh {payment.Bill.Amount:N2}</span>
            </div>
            {(payment.Bill.PenaltyAmount > 0 ? $@"
            <div class='amount-row'>
                <span>Penalty:</span>
                <span>KSh {payment.Bill.PenaltyAmount:N2}</span>
            </div>" : "")}
            <div class='amount-row'>
                <span>Total Bill:</span>
                <span>KSh {payment.Bill.TotalAmount:N2}</span>
            </div>
            <div class='amount-row total-amount'>
                <span>Amount Paid:</span>
                <span>KSh {payment.Amount:N2}</span>
            </div>
        </div>
        
        <div style='text-align: center; margin: 20px 0;'>
            <span class='status-paid'>PAID</span>
        </div>
        
        <div class='footer'>
            <p>Thank you for your payment!</p>
            <p>This is a computer-generated receipt. No signature required.</p>
            <p>Generated on {DateTime.Now:dd MMM yyyy HH:mm}</p>
        </div>
    </div>
</body>
</html>";

            return html;
        }

        public async Task<string> GenerateBillHtmlAsync(int billId)
        {
            var bill = await _context.Bills
                .Include(b => b.Client)
                .Include(b => b.Payments)
                .Include(b => b.CreatedByUser)
                .FirstOrDefaultAsync(b => b.Id == billId);

            if (bill == null)
                throw new ArgumentException("Bill not found");

            var settings = await _context.SystemSettings.FirstOrDefaultAsync();
            var companyName = "Denkam Waters";
            var companyAddress = "Ikinu Location";
            var companyPhone = "0743683868";

            var totalPaid = bill.Payments.Sum(p => p.Amount);
            var balance = bill.TotalAmount - totalPaid;
            var isOverdue = bill.DueDate < DateTime.Now && balance > 0;

            var html = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Water Bill - {bill.BillNumber}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }}
        .bill {{ background: white; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        .header {{ text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }}
        .company-name {{ font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 5px; }}
        .company-details {{ color: #666; font-size: 14px; }}
        .bill-title {{ font-size: 20px; font-weight: bold; text-align: center; margin: 20px 0; color: #333; }}
        .bill-number {{ text-align: center; color: #666; margin-bottom: 30px; }}
        .details-section {{ margin: 20px 0; }}
        .details-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }}
        .details-label {{ font-weight: bold; color: #333; }}
        .details-value {{ color: #666; }}
        .consumption-section {{ background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }}
        .consumption-row {{ display: flex; justify-content: space-between; padding: 5px 0; }}
        .amount-section {{ background: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0; }}
        .amount-row {{ display: flex; justify-content: space-between; padding: 5px 0; }}
        .total-amount {{ font-size: 18px; font-weight: bold; color: #007bff; border-top: 2px solid #007bff; padding-top: 10px; margin-top: 10px; }}
        .status-unpaid {{ background: #fff3cd; color: #856404; padding: 5px 10px; border-radius: 3px; font-weight: bold; }}
        .status-paid {{ background: #d4edda; color: #155724; padding: 5px 10px; border-radius: 3px; font-weight: bold; }}
        .status-overdue {{ background: #f8d7da; color: #721c24; padding: 5px 10px; border-radius: 3px; font-weight: bold; }}
        .footer {{ text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }}
        .due-date {{ color: #dc3545; font-weight: bold; }}
        @media print {{ body {{ background: white; }} .bill {{ box-shadow: none; }} }}
    </style>
</head>
<body>
    <div class='bill'>
        <div class='header'>
            <div class='company-name'>{companyName}</div>
            <div class='company-details'>
                {companyAddress}<br>
                Phone: {companyPhone}
            </div>
        </div>
        
        <div class='bill-title'>WATER BILL</div>
        <div class='bill-number'>Bill #: {bill.BillNumber}</div>
        
        <div class='details-section'>
            <div class='details-row'>
                <span class='details-label'>Bill Date:</span>
                <span class='details-value'>{bill.BillDate:dd MMM yyyy}</span>
            </div>
            <div class='details-row'>
                <span class='details-label'>Due Date:</span>
                <span class='details-value {(isOverdue ? "due-date" : "")}'>{bill.DueDate:dd MMM yyyy}</span>
            </div>
            <div class='details-row'>
                <span class='details-label'>Client Name:</span>
                <span class='details-value'>{bill.Client.FullName}</span>
            </div>
            <div class='details-row'>
                <span class='details-label'>Meter Number:</span>
                <span class='details-value'>{bill.Client.MeterNumber}</span>
            </div>
            <div class='details-row'>
                <span class='details-label'>Location:</span>
                <span class='details-value'>{bill.Client.Location}</span>
            </div>
        </div>
        
        <div class='consumption-section'>
            <h4 style='margin-top: 0; color: #333;'>Water Consumption</h4>
            <div class='consumption-row'>
                <span>Units Used:</span>
                <span>{bill.UnitsUsed:N2} cubic meters</span>
            </div>
            <div class='consumption-row'>
                <span>Rate per Unit:</span>
                <span>KSh {bill.RatePerUnit:N2}</span>
            </div>
        </div>
        
        <div class='amount-section'>
            <div class='amount-row'>
                <span>Water Charges:</span>
                <span>KSh {bill.Amount:N2}</span>
            </div>
            {(bill.PenaltyAmount > 0 ? $@"
            <div class='amount-row'>
                <span>Late Payment Penalty:</span>
                <span>KSh {bill.PenaltyAmount:N2}</span>
            </div>" : "")}
            <div class='amount-row total-amount'>
                <span>Total Amount:</span>
                <span>KSh {bill.TotalAmount:N2}</span>
            </div>
            {(totalPaid > 0 ? $@"
            <div class='amount-row'>
                <span>Amount Paid:</span>
                <span>KSh {totalPaid:N2}</span>
            </div>
            <div class='amount-row total-amount'>
                <span>Balance Due:</span>
                <span>KSh {balance:N2}</span>
            </div>" : "")}
        </div>
        
        <div style='text-align: center; margin: 20px 0;'>
            {(balance <= 0 ? "<span class='status-paid'>PAID</span>" : 
              isOverdue ? "<span class='status-overdue'>OVERDUE</span>" : 
              "<span class='status-unpaid'>UNPAID</span>")}
        </div>
        
        {(bill.Payments.Any() ? $@"
        <div class='details-section'>
            <h4 style='color: #333;'>Payment History</h4>
            {string.Join("", bill.Payments.OrderByDescending(p => p.PaymentDate).Select(p => $@"
            <div class='details-row'>
                <span>{p.PaymentDate:dd MMM yyyy} - {p.PaymentMethod}</span>
                <span>KSh {p.Amount:N2}</span>
            </div>"))}
        </div>" : "")}
        
        <div class='footer'>
            <p>Please pay by the due date to avoid penalties.</p>
            <p>For inquiries, contact us at {companyPhone}</p>
            <p>Generated on {DateTime.Now:dd MMM yyyy HH:mm}</p>
        </div>
    </div>
</body>
</html>";

            return html;
        }
    }
}
