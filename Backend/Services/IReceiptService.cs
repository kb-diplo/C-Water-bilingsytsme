using MyApi.Models;

namespace MyApi.Services
{
    public interface IReceiptService
    {
        Task<byte[]> GeneratePaymentReceiptAsync(int paymentId);
        Task<byte[]> GenerateBillReceiptAsync(int billId);
        Task<string> GenerateReceiptHtmlAsync(int paymentId);
        Task<string> GenerateBillHtmlAsync(int billId);
    }
}
