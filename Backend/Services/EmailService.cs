using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using MyApi.Models;

namespace MyApi.Services
{
    public class EmailService : IEmailService
    {
        private readonly EmailSettings _emailSettings;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IOptions<EmailSettings> emailSettings, ILogger<EmailService> logger)
        {
            _emailSettings = emailSettings.Value;
            _logger = logger;
            
            // Fallback to environment variables if settings are empty
            if (string.IsNullOrEmpty(_emailSettings.SenderEmail))
            {
                _emailSettings.SenderEmail = Environment.GetEnvironmentVariable("SENDER_EMAIL") ?? "";
            }
            if (string.IsNullOrEmpty(_emailSettings.SenderPassword))
            {
                _emailSettings.SenderPassword = Environment.GetEnvironmentVariable("SENDER_PASSWORD") ?? "";
            }
            if (string.IsNullOrEmpty(_emailSettings.SmtpServer))
            {
                _emailSettings.SmtpServer = Environment.GetEnvironmentVariable("SMTP_SERVER") ?? "smtp.gmail.com";
            }
            if (_emailSettings.SmtpPort == 0)
            {
                _emailSettings.SmtpPort = int.TryParse(Environment.GetEnvironmentVariable("SMTP_PORT"), out int port) ? port : 587;
            }
        }

        public async Task<bool> SendPasswordResetEmailAsync(string toEmail, string firstName, string resetToken)
        {
            try
            {
                _logger.LogInformation("Starting password reset email process for {Email}", toEmail);
                
                // Log email configuration (without password)
                _logger.LogInformation("Email Configuration - Server: {Server}, Port: {Port}, Sender: {Sender}", 
                    _emailSettings.SmtpServer, _emailSettings.SmtpPort, _emailSettings.SenderEmail);

                if (string.IsNullOrEmpty(_emailSettings.SenderEmail) || string.IsNullOrEmpty(_emailSettings.SenderPassword))
                {
                    _logger.LogError("Email settings are not configured properly. SenderEmail or SenderPassword is missing.");
                    return false;
                }

                var resetLink = $"http://localhost:4200/reset-password?token={resetToken}";
                var subject = "Water Billing System - Password Reset Request";
                var htmlBody = GetPasswordResetEmailTemplate(firstName, resetLink);

                _logger.LogInformation("Prepared email - To: {Email}, Subject: {Subject}, ResetLink: {ResetLink}", 
                    toEmail, subject, resetLink);

                using var client = new SmtpClient(_emailSettings.SmtpServer, _emailSettings.SmtpPort)
                {
                    EnableSsl = true,
                    Credentials = new NetworkCredential(_emailSettings.SenderEmail, _emailSettings.SenderPassword)
                };

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(_emailSettings.SenderEmail, "Water Billing System"),
                    Subject = subject,
                    Body = htmlBody,
                    IsBodyHtml = true
                };

                mailMessage.To.Add(toEmail);

                _logger.LogInformation("Attempting to send email via SMTP...");
                await client.SendMailAsync(mailMessage);
                _logger.LogInformation("Password reset email sent successfully to {Email}", toEmail);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password reset email to {Email}", toEmail);
                return false;
            }
        }

        public async Task<bool> SendBillReminderEmailAsync(string toEmail, string clientName, BillResponseDto bill)
        {
            try
            {
                var subject = $"Water Bill Reminder - Bill #{bill.BillNumber}";
                var htmlBody = GetBillReminderEmailTemplate(clientName, bill);

                using var client = new SmtpClient(_emailSettings.SmtpServer, _emailSettings.SmtpPort)
                {
                    EnableSsl = true,
                    Credentials = new NetworkCredential(_emailSettings.SenderEmail, _emailSettings.SenderPassword)
                };

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(_emailSettings.SenderEmail, "Water Billing System"),
                    Subject = subject,
                    Body = htmlBody,
                    IsBodyHtml = true
                };

                mailMessage.To.Add(toEmail);

                await client.SendMailAsync(mailMessage);
                _logger.LogInformation("Bill reminder email sent successfully to {Email} for bill {BillNumber}", toEmail, bill.BillNumber);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send bill reminder email to {Email} for bill {BillNumber}", toEmail, bill.BillNumber);
                return false;
            }
        }

        public async Task<bool> SendPaymentConfirmationEmailAsync(string toEmail, string clientName, PaymentResponseDto payment, BillResponseDto bill)
        {
            try
            {
                var subject = $"Payment Confirmation - Receipt #{payment.Id:D6}";
                var htmlBody = GetPaymentConfirmationEmailTemplate(clientName, payment, bill);

                using var client = new SmtpClient(_emailSettings.SmtpServer, _emailSettings.SmtpPort)
                {
                    EnableSsl = true,
                    Credentials = new NetworkCredential(_emailSettings.SenderEmail, _emailSettings.SenderPassword)
                };

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(_emailSettings.SenderEmail, "Water Billing System"),
                    Subject = subject,
                    Body = htmlBody,
                    IsBodyHtml = true
                };

                mailMessage.To.Add(toEmail);

                await client.SendMailAsync(mailMessage);
                _logger.LogInformation("Payment confirmation email sent successfully to {Email} for payment {PaymentId}", toEmail, payment.Id);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send payment confirmation email to {Email} for payment {PaymentId}", toEmail, payment.Id);
                return false;
            }
        }

        private static string GetPasswordResetEmailTemplate(string firstName, string resetLink)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Password Reset Request</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #00bcd4 0%, #0097a7 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>Water Billing System</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>Password Reset Request</p>
    </div>
    
    <div style='background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;'>
        <h2 style='color: #00bcd4; margin-top: 0;'>Hello {firstName},</h2>
        
        <p style='font-size: 16px; margin-bottom: 20px;'>
            We received a request to reset your password for your Water Billing System account.
        </p>
        
        <p style='font-size: 16px; margin-bottom: 30px;'>
            Click the button below to reset your password. This link will expire in 15 minutes for security purposes.
        </p>
        
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{resetLink}' 
               style='background: #00bcd4; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;'>
                Reset Password
            </a>
        </div>
        
        <p style='font-size: 14px; color: #666; margin-top: 30px;'>
            If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
        </p>
        
        <p style='font-size: 14px; color: #666;'>
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href='{resetLink}' style='color: #00bcd4; word-break: break-all;'>{resetLink}</a>
        </p>
        
        <hr style='border: none; border-top: 1px solid #ddd; margin: 30px 0;'>
        
        <p style='font-size: 12px; color: #999; text-align: center;'>
            This email was sent by Water Billing System<br>
            © 2025 All rights reserved
        </p>
    </div>
</body>
</html>";
        }

        private static string GetBillReminderEmailTemplate(string clientName, BillResponseDto bill)
        {
            var isOverdue = bill.DueDate < DateTime.Now;
            var daysOverdue = isOverdue ? (DateTime.Now - bill.DueDate).Days : 0;
            var urgencyClass = isOverdue ? "urgent" : "reminder";
            var urgencyText = isOverdue ? $"OVERDUE by {daysOverdue} days" : "Due Soon";

            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Water Bill Reminder</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #00bcd4 0%, #0097a7 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>Water Billing System</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>Bill Payment Reminder</p>
    </div>
    
    <div style='background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;'>
        <h2 style='color: #00bcd4; margin-top: 0;'>Dear {clientName},</h2>
        
        <div style='background: {(isOverdue ? "#ffebee" : "#fff3e0")}; border-left: 4px solid {(isOverdue ? "#f44336" : "#ff9800")}; padding: 15px; margin: 20px 0;'>
            <h3 style='margin: 0; color: {(isOverdue ? "#c62828" : "#ef6c00")};'>Bill {urgencyText}</h3>
        </div>
        
        <div style='background: white; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0; margin: 20px 0;'>
            <h3 style='color: #00bcd4; margin-top: 0;'>Bill Details</h3>
            <table style='width: 100%; border-collapse: collapse;'>
                <tr>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee;'><strong>Bill Number:</strong></td>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;'>{bill.BillNumber}</td>
                </tr>
                <tr>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee;'><strong>Bill Date:</strong></td>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;'>{bill.BillDate:dd MMM yyyy}</td>
                </tr>
                <tr>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee;'><strong>Due Date:</strong></td>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; color: {(isOverdue ? "#c62828" : "#333")};'>{bill.DueDate:dd MMM yyyy}</td>
                </tr>
                <tr>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee;'><strong>Units Used:</strong></td>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;'>{bill.UnitsUsed:N2} cubic meters</td>
                </tr>
                <tr>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee;'><strong>Amount:</strong></td>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;'>KSh {bill.Amount:N2}</td>
                </tr>
                {(bill.PenaltyAmount > 0 ? $@"
                <tr>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee;'><strong>Penalty:</strong></td>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; color: #c62828;'>KSh {bill.PenaltyAmount:N2}</td>
                </tr>" : "")}
                <tr style='background: #f5f5f5;'>
                    <td style='padding: 12px 0; font-size: 18px;'><strong>Total Amount Due:</strong></td>
                    <td style='padding: 12px 0; text-align: right; font-size: 18px; font-weight: bold; color: #00bcd4;'>KSh {bill.TotalAmount:N2}</td>
                </tr>
                <tr>
                    <td style='padding: 8px 0;'><strong>Outstanding Balance:</strong></td>
                    <td style='padding: 8px 0; text-align: right; font-weight: bold; color: {(bill.Balance > 0 ? "#c62828" : "#4caf50")};'>KSh {bill.Balance:N2}</td>
                </tr>
            </table>
        </div>
        
        {(isOverdue ? $@"
        <div style='background: #ffebee; border: 1px solid #f44336; padding: 15px; border-radius: 5px; margin: 20px 0;'>
            <h4 style='color: #c62828; margin: 0 0 10px 0;'>⚠️ URGENT: Payment Overdue</h4>
            <p style='margin: 0; color: #c62828;'>Your payment is {daysOverdue} days overdue. Please settle this bill immediately to avoid service disconnection.</p>
        </div>" : $@"
        <div style='background: #fff3e0; border: 1px solid #ff9800; padding: 15px; border-radius: 5px; margin: 20px 0;'>
            <h4 style='color: #ef6c00; margin: 0 0 10px 0;'>💡 Payment Reminder</h4>
            <p style='margin: 0; color: #ef6c00;'>Your water bill is due soon. Please make payment by the due date to avoid late fees.</p>
        </div>")}
        
        <div style='text-align: center; margin: 30px 0;'>
            <p style='font-size: 16px; margin-bottom: 20px;'>Please make your payment as soon as possible.</p>
            <p style='font-size: 14px; color: #666;'>For payment inquiries, please contact our office.</p>
        </div>
        
        <hr style='border: none; border-top: 1px solid #ddd; margin: 30px 0;'>
        
        <p style='font-size: 12px; color: #999; text-align: center;'>
            This is an automated reminder from Water Billing System<br>
            © 2025 All rights reserved
        </p>
    </div>
</body>
</html>";
        }

        private static string GetPaymentConfirmationEmailTemplate(string clientName, PaymentResponseDto payment, BillResponseDto bill)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Payment Confirmation</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>Water Billing System</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>Payment Confirmation</p>
    </div>
    
    <div style='background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;'>
        <h2 style='color: #4caf50; margin-top: 0;'>Dear {clientName},</h2>
        
        <div style='background: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0;'>
            <h3 style='margin: 0; color: #2e7d32;'>✅ Payment Received Successfully</h3>
        </div>
        
        <p style='font-size: 16px; margin-bottom: 20px;'>
            Thank you for your payment. We have successfully received your payment for the following bill:
        </p>
        
        <div style='background: white; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0; margin: 20px 0;'>
            <h3 style='color: #4caf50; margin-top: 0;'>Payment Details</h3>
            <table style='width: 100%; border-collapse: collapse;'>
                <tr>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee;'><strong>Receipt Number:</strong></td>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;'>{payment.Id:D6}</td>
                </tr>
                <tr>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee;'><strong>Payment Date:</strong></td>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;'>{payment.PaymentDate:dd MMM yyyy HH:mm}</td>
                </tr>
                <tr>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee;'><strong>Amount Paid:</strong></td>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #4caf50;'>KSh {payment.Amount:N2}</td>
                </tr>
                <tr>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee;'><strong>Payment Method:</strong></td>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;'>{payment.PaymentMethod}</td>
                </tr>
                {(!string.IsNullOrEmpty(payment.Reference) ? $@"
                <tr>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee;'><strong>Reference:</strong></td>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;'>{payment.Reference}</td>
                </tr>" : "")}
            </table>
        </div>
        
        <div style='background: white; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0; margin: 20px 0;'>
            <h3 style='color: #4caf50; margin-top: 0;'>Bill Information</h3>
            <table style='width: 100%; border-collapse: collapse;'>
                <tr>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee;'><strong>Bill Number:</strong></td>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;'>{bill.BillNumber}</td>
                </tr>
                <tr>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee;'><strong>Bill Total:</strong></td>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;'>KSh {bill.TotalAmount:N2}</td>
                </tr>
                <tr>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee;'><strong>Amount Paid:</strong></td>
                    <td style='padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;'>KSh {bill.AmountPaid:N2}</td>
                </tr>
                <tr style='background: #f5f5f5;'>
                    <td style='padding: 12px 0; font-size: 16px;'><strong>Remaining Balance:</strong></td>
                    <td style='padding: 12px 0; text-align: right; font-size: 16px; font-weight: bold; color: {(bill.Balance > 0 ? "#ff9800" : "#4caf50")};'>KSh {bill.Balance:N2}</td>
                </tr>
            </table>
        </div>
        
        {(bill.Balance <= 0 ? @"
        <div style='background: #e8f5e8; border: 1px solid #4caf50; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;'>
            <h4 style='color: #2e7d32; margin: 0 0 10px 0;'>🎉 Bill Fully Paid</h4>
            <p style='margin: 0; color: #2e7d32;'>Congratulations! Your bill has been fully paid. Thank you for your prompt payment.</p>
        </div>" : $@"
        <div style='background: #fff3e0; border: 1px solid #ff9800; padding: 15px; border-radius: 5px; margin: 20px 0;'>
            <h4 style='color: #ef6c00; margin: 0 0 10px 0;'>💡 Remaining Balance</h4>
            <p style='margin: 0; color: #ef6c00;'>You still have a remaining balance of KSh {bill.Balance:N2}. Please make another payment to clear the full amount.</p>
        </div>")}
        
        <div style='text-align: center; margin: 30px 0;'>
            <p style='font-size: 16px; margin-bottom: 20px;'>Thank you for using our Water Billing System!</p>
            <p style='font-size: 14px; color: #666;'>Keep this email as your payment receipt.</p>
        </div>
        
        <hr style='border: none; border-top: 1px solid #ddd; margin: 30px 0;'>
        
        <p style='font-size: 12px; color: #999; text-align: center;'>
            This is an automated confirmation from Water Billing System<br>
            © 2025 All rights reserved
        </p>
    </div>
</body>
</html>";
        }
    }

    public class EmailSettings
    {
        public string SenderEmail { get; set; } = string.Empty;
        public string SenderPassword { get; set; } = string.Empty;
        public string SmtpServer { get; set; } = string.Empty;
        public int SmtpPort { get; set; }
    }
}
