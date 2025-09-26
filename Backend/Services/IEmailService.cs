namespace MyApi.Services
{
    public interface IEmailService
    {
        Task<bool> SendPasswordResetEmailAsync(string toEmail, string firstName, string resetToken);
    }
}
