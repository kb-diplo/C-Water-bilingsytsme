using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;

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
        }

        public async Task<bool> SendPasswordResetEmailAsync(string toEmail, string firstName, string resetToken)
        {
            try
            {
                var resetLink = $"https://my-angular-app/reset-password?token={resetToken}";
                var subject = "Water Billing System - Password Reset Request";
                var htmlBody = GetPasswordResetEmailTemplate(firstName, resetLink);

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
                _logger.LogInformation("Password reset email sent successfully to {Email}", toEmail);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password reset email to {Email}", toEmail);
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
    }

    public class EmailSettings
    {
        public string SenderEmail { get; set; } = string.Empty;
        public string SenderPassword { get; set; } = string.Empty;
        public string SmtpServer { get; set; } = string.Empty;
        public int SmtpPort { get; set; }
    }
}
