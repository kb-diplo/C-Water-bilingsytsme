using MyApi.Models;

namespace MyApi.Services
{
    public interface IEmailService
    {
        Task<bool> SendPasswordResetEmailAsync(string toEmail, string firstName, string resetToken);
        Task<bool> SendBillReminderEmailAsync(string toEmail, string clientName, BillResponseDto bill);
        Task<bool> SendPaymentConfirmationEmailAsync(string toEmail, string clientName, PaymentResponseDto payment, BillResponseDto bill);
    }
}
