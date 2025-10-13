using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MyApi.Data;
using MyApi.Models;
using System.Text;
using System.Text.Json;

namespace MyApi.Services
{
    public class MpesaService : IMpesaService
    {
        private readonly HttpClient _httpClient;
        private readonly WaterBillingDbContext _context;
        private readonly MpesaSettings _mpesaSettings;
        private readonly ILogger<MpesaService> _logger;

        public MpesaService(
            HttpClient httpClient, 
            WaterBillingDbContext context, 
            IOptions<MpesaSettings> mpesaSettings,
            ILogger<MpesaService> logger)
        {
            _httpClient = httpClient;
            _context = context;
            _mpesaSettings = mpesaSettings.Value;
            _logger = logger;
        }

        public async Task<string> GetAccessTokenAsync()
        {
            try
            {
                _logger.LogInformation("Getting M-Pesa access token...");
                _logger.LogInformation("Consumer Key: {ConsumerKey}", _mpesaSettings.ConsumerKey?.Substring(0, 5) + "...");
                _logger.LogInformation("Base URL: {BaseUrl}", _mpesaSettings.BaseUrl);
                
                var credentials = Convert.ToBase64String(
                    Encoding.UTF8.GetBytes($"{_mpesaSettings.ConsumerKey}:{_mpesaSettings.ConsumerSecret}"));

                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("Authorization", $"Basic {credentials}");

                var tokenUrl = $"{_mpesaSettings.BaseUrl}/oauth/v1/generate?grant_type=client_credentials";
                _logger.LogInformation("Token URL: {TokenUrl}", tokenUrl);
                
                var response = await _httpClient.GetAsync(tokenUrl);
                var content = await response.Content.ReadAsStringAsync();
                
                _logger.LogInformation("Token response status: {StatusCode}", response.StatusCode);
                _logger.LogInformation("Token response content: {Content}", content);

                if (response.IsSuccessStatusCode)
                {
                    var tokenResponse = JsonSerializer.Deserialize<MpesaAccessTokenResponse>(content);
                    _logger.LogInformation("Access token obtained successfully");
                    return tokenResponse?.access_token ?? string.Empty;
                }

                _logger.LogError("Failed to get Mpesa access token. Status: {StatusCode}, Content: {Content}", response.StatusCode, content);
                return string.Empty;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Mpesa access token");
                return string.Empty;
            }
        }

        public async Task<MpesaStkPushResponse> InitiateStkPushAsync(MpesaStkPushDto request, int userId)
        {
            try
            {
                _logger.LogInformation("Initiating STK Push for BillId: {BillId}, Phone: {Phone}, Amount: {Amount}", 
                    request.BillId, request.PhoneNumber, request.Amount);

                // Get bill details
                var bill = await _context.Bills
                    .Include(b => b.Client)
                    .FirstOrDefaultAsync(b => b.Id == request.BillId);

                if (bill == null)
                {
                    _logger.LogError("Bill not found for BillId: {BillId}", request.BillId);
                    return new MpesaStkPushResponse
                    {
                        ResponseCode = "1",
                        ResponseDescription = "Bill not found",
                        CustomerMessage = "The specified bill was not found."
                    };
                }

                // Validate amount
                if (request.Amount > bill.TotalAmount)
                {
                    return new MpesaStkPushResponse
                    {
                        ResponseCode = "1",
                        ResponseDescription = "Amount exceeds bill total",
                        CustomerMessage = "Payment amount cannot exceed the bill total."
                    };
                }

                // Get access token
                _logger.LogInformation("Getting M-Pesa access token...");
                var accessToken = await GetAccessTokenAsync();
                if (string.IsNullOrEmpty(accessToken))
                {
                    _logger.LogError("Failed to get M-Pesa access token");
                    return new MpesaStkPushResponse
                    {
                        ResponseCode = "1",
                        ResponseDescription = "Failed to authenticate with Mpesa",
                        CustomerMessage = "Unable to process payment at this time. Please try again."
                    };
                }
                _logger.LogInformation("M-Pesa access token obtained successfully");

                // Generate timestamp and password
                var timestamp = DateTime.Now.ToString("yyyyMMddHHmmss");
                var password = Convert.ToBase64String(
                    Encoding.UTF8.GetBytes($"{_mpesaSettings.BusinessShortCode}{_mpesaSettings.Passkey}{timestamp}"));

                // Prepare STK push request
                var stkRequest = new MpesaStkPushRequest
                {
                    BusinessShortCode = _mpesaSettings.BusinessShortCode,
                    Password = password,
                    Timestamp = timestamp,
                    Amount = request.Amount,
                    PartyA = request.PhoneNumber,
                    PartyB = _mpesaSettings.BusinessShortCode,
                    PhoneNumber = request.PhoneNumber,
                    CallBackURL = _mpesaSettings.CallbackUrl,
                    AccountReference = bill.BillNumber,
                    TransactionDesc = $"Water Bill Payment - {bill.BillNumber}"
                };

                // Send STK push request
                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {accessToken}");

                var json = JsonSerializer.Serialize(stkRequest);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                _logger.LogInformation("Sending STK Push request to: {Url}", $"{_mpesaSettings.BaseUrl}/mpesa/stkpush/v1/processrequest");
                _logger.LogInformation("STK Push request data: {RequestData}", json);

                var response = await _httpClient.PostAsync(
                    $"{_mpesaSettings.BaseUrl}/mpesa/stkpush/v1/processrequest", content);

                var responseContent = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("STK Push response status: {StatusCode}, content: {ResponseContent}", 
                    response.StatusCode, responseContent);

                var stkResponse = JsonSerializer.Deserialize<MpesaStkPushResponse>(responseContent) 
                    ?? new MpesaStkPushResponse();

                // Save transaction record
                var transaction = new MpesaTransaction
                {
                    BillId = request.BillId,
                    MerchantRequestID = stkResponse.MerchantRequestID,
                    CheckoutRequestID = stkResponse.CheckoutRequestID,
                    PhoneNumber = request.PhoneNumber,
                    Amount = request.Amount,
                    Status = stkResponse.ResponseCode == "0" ? "Pending" : "Failed",
                    ErrorMessage = stkResponse.ResponseCode != "0" ? stkResponse.ResponseDescription : null
                };

                _context.MpesaTransactions.Add(transaction);
                await _context.SaveChangesAsync();

                return stkResponse;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initiating Mpesa STK push for bill {BillId}", request.BillId);
                return new MpesaStkPushResponse
                {
                    ResponseCode = "1",
                    ResponseDescription = "Internal server error",
                    CustomerMessage = "Unable to process payment at this time. Please try again."
                };
            }
        }

        public async Task<bool> ProcessCallbackAsync(MpesaCallbackResponse callback)
        {
            try
            {
                var stkCallback = callback.Body.stkCallback;
                
                // Find the transaction
                var transaction = await _context.MpesaTransactions
                    .Include(t => t.Bill)
                    .FirstOrDefaultAsync(t => t.CheckoutRequestID == stkCallback.CheckoutRequestID);

                if (transaction == null)
                {
                    _logger.LogWarning("Mpesa callback received for unknown transaction: {CheckoutRequestID}", 
                        stkCallback.CheckoutRequestID);
                    return false;
                }

                // Update transaction status
                transaction.CompletedAt = DateTime.UtcNow;

                if (stkCallback.ResultCode == 0) // Success
                {
                    transaction.Status = "Success";
                    
                    // Extract transaction details from callback metadata
                    if (stkCallback.CallbackMetadata?.Item != null)
                    {
                        var receiptNumber = stkCallback.CallbackMetadata.Item
                            .FirstOrDefault(i => i.Name == "MpesaReceiptNumber")?.Value?.ToString();
                        var transactionDate = stkCallback.CallbackMetadata.Item
                            .FirstOrDefault(i => i.Name == "TransactionDate")?.Value?.ToString();

                        transaction.MpesaReceiptNumber = receiptNumber;
                        transaction.TransactionDate = transactionDate;
                    }

                    // Create payment record
                    var payment = new Payment
                    {
                        BillId = transaction.BillId,
                        Amount = transaction.Amount,
                        PaymentMethod = "Mpesa",
                        Reference = transaction.MpesaReceiptNumber ?? transaction.CheckoutRequestID,
                        RecordedByUserId = transaction.Bill.Client.CreatedByUserId, // Use client's user ID
                        PaymentDate = DateTime.UtcNow
                    };

                    _context.Payments.Add(payment);

                    // Update bill status if fully paid
                    var totalPaid = await _context.Payments
                        .Where(p => p.BillId == transaction.BillId)
                        .SumAsync(p => p.Amount) + transaction.Amount;

                    if (totalPaid >= transaction.Bill.TotalAmount)
                    {
                        transaction.Bill.Status = "Paid";
                    }
                }
                else // Failed
                {
                    transaction.Status = "Failed";
                    transaction.ErrorMessage = stkCallback.ResultDesc;
                }

                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Mpesa callback");
                return false;
            }
        }

        public async Task<MpesaTransaction?> GetTransactionStatusAsync(string checkoutRequestId)
        {
            return await _context.MpesaTransactions
                .Include(t => t.Bill)
                .ThenInclude(b => b.Client)
                .FirstOrDefaultAsync(t => t.CheckoutRequestID == checkoutRequestId);
        }
    }
}
