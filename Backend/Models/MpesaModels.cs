using System.ComponentModel.DataAnnotations;

namespace MyApi.Models
{
    // Mpesa STK Push Request DTO
    public class MpesaStkPushDto
    {
        [Required]
        public int BillId { get; set; }
        
        [Required]
        [RegularExpression(@"^254\d{9}$", ErrorMessage = "Phone number must be in format 254XXXXXXXXX")]
        public string PhoneNumber { get; set; } = string.Empty;
        
        [Required]
        [Range(1, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
        public decimal Amount { get; set; }
    }

    // Mpesa STK Push Request (to Safaricom)
    public class MpesaStkPushRequest
    {
        public string BusinessShortCode { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Timestamp { get; set; } = string.Empty;
        public string TransactionType { get; set; } = "CustomerPayBillOnline";
        public decimal Amount { get; set; }
        public string PartyA { get; set; } = string.Empty; // Phone number
        public string PartyB { get; set; } = string.Empty; // Business short code
        public string PhoneNumber { get; set; } = string.Empty;
        public string CallBackURL { get; set; } = string.Empty;
        public string AccountReference { get; set; } = string.Empty; // Bill number
        public string TransactionDesc { get; set; } = string.Empty;
    }

    // Mpesa STK Push Response (from Safaricom)
    public class MpesaStkPushResponse
    {
        public string MerchantRequestID { get; set; } = string.Empty;
        public string CheckoutRequestID { get; set; } = string.Empty;
        public string ResponseCode { get; set; } = string.Empty;
        public string ResponseDescription { get; set; } = string.Empty;
        public string CustomerMessage { get; set; } = string.Empty;
    }

    // Mpesa Callback Response (from Safaricom)
    public class MpesaCallbackResponse
    {
        public MpesaCallbackBody Body { get; set; } = new();
    }

    public class MpesaCallbackBody
    {
        public MpesaStkCallback stkCallback { get; set; } = new();
    }

    public class MpesaStkCallback
    {
        public string MerchantRequestID { get; set; } = string.Empty;
        public string CheckoutRequestID { get; set; } = string.Empty;
        public int ResultCode { get; set; }
        public string ResultDesc { get; set; } = string.Empty;
        public MpesaCallbackMetadata? CallbackMetadata { get; set; }
    }

    public class MpesaCallbackMetadata
    {
        public List<MpesaCallbackItem> Item { get; set; } = new();
    }

    public class MpesaCallbackItem
    {
        public string Name { get; set; } = string.Empty;
        public object? Value { get; set; }
    }

    // Mpesa Transaction Record (for database)
    public class MpesaTransaction
    {
        public int Id { get; set; }
        public int BillId { get; set; }
        public string MerchantRequestID { get; set; } = string.Empty;
        public string CheckoutRequestID { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Status { get; set; } = "Pending"; // Pending, Success, Failed, Cancelled
        public string? MpesaReceiptNumber { get; set; }
        public string? TransactionDate { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }
        public string? ErrorMessage { get; set; }
        
        // Navigation properties
        public Bill Bill { get; set; } = null!;
    }

    // Mpesa Access Token Response
    public class MpesaAccessTokenResponse
    {
        public string access_token { get; set; } = string.Empty;
        public string expires_in { get; set; } = string.Empty;
    }

    // Mpesa Configuration Settings
    public class MpesaSettings
    {
        public string ConsumerKey { get; set; } = string.Empty;
        public string ConsumerSecret { get; set; } = string.Empty;
        public string BusinessShortCode { get; set; } = string.Empty;
        public string Passkey { get; set; } = string.Empty;
        public string CallbackUrl { get; set; } = string.Empty;
        public string SandboxBaseUrl { get; set; } = "https://sandbox.safaricom.co.ke";
        public string ProductionBaseUrl { get; set; } = "https://api.safaricom.co.ke";
        public bool IsSandbox { get; set; } = true;
        
        public string BaseUrl => IsSandbox ? SandboxBaseUrl : ProductionBaseUrl;
    }
}
