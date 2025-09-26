using MyApi.Models;

namespace MyApi.Services
{
    public interface IMpesaService
    {
        Task<MpesaStkPushResponse> InitiateStkPushAsync(MpesaStkPushDto request, int userId);
        Task<bool> ProcessCallbackAsync(MpesaCallbackResponse callback);
        Task<string> GetAccessTokenAsync();
        Task<MpesaTransaction?> GetTransactionStatusAsync(string checkoutRequestId);
    }
}
