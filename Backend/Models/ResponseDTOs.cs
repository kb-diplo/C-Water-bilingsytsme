using System.ComponentModel.DataAnnotations;

namespace MyApi.Models
{
    // Response DTOs to prevent JSON cycles and over-fetching
    
    public class MeterReadingResponseDto
    {
        public int Id { get; set; }
        public int ClientId { get; set; }
        public string ClientName { get; set; } = string.Empty;
        public string MeterNumber { get; set; } = string.Empty;
        public decimal CurrentReading { get; set; }
        public decimal PreviousReading { get; set; }
        public decimal UnitsUsed { get; set; }
        public DateTime ReadingDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public string RecordedByUsername { get; set; } = string.Empty;
        public string BillingPeriod { get; set; } = string.Empty; // Format: YYYY-MM
        public int? GeneratedBillId { get; set; }
        public string? GeneratedBillNumber { get; set; }
        public decimal BillAmount { get; set; }
    }

    public class ClientResponseDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string? MiddleName { get; set; }
        public string LastName { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string MeterNumber { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string ConnectionStatus { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedDate { get; set; }
        public string CreatedByUsername { get; set; } = string.Empty;
    }

    public class BillResponseDto
    {
        public int Id { get; set; }
        public int ClientId { get; set; }
        public string ClientName { get; set; } = string.Empty;
        public string BillNumber { get; set; } = string.Empty;
        public decimal UnitsUsed { get; set; }
        public decimal RatePerUnit { get; set; }
        public decimal Amount { get; set; }
        public decimal PenaltyAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public DateTime BillDate { get; set; }
        public DateTime DueDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal AmountPaid { get; set; }
        public decimal Balance { get; set; }
    }

    public class BillDetailResponseDto : BillResponseDto
    {
        public List<PaymentResponseDto> Payments { get; set; } = new();
    }

    public class PaymentResponseDto
    {
        public int Id { get; set; }
        public int BillId { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public string ClientName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string Reference { get; set; } = string.Empty;
        public string RecordedByUsername { get; set; } = string.Empty;
    }

    public class ClientDetailResponseDto : ClientResponseDto
    {
        public List<MeterReadingResponseDto> RecentReadings { get; set; } = new();
        public List<BillResponseDto> UnpaidBills { get; set; } = new();
        public decimal TotalOwed { get; set; }
        public DateTime? LastPaymentDate { get; set; }
        public int TotalReadings { get; set; }
        public int TotalBills { get; set; }
    }

    // Input DTOs for validation
    public class MeterReadingCreateDto
    {
        [Required]
        public int ClientId { get; set; }
        
        [Required]
        [Range(0, double.MaxValue, ErrorMessage = "Current reading must be a positive number")]
        public decimal CurrentReading { get; set; }
        
        public string? Notes { get; set; }
        
        // Admin override for monthly restriction (Admin only)
        public bool OverrideMonthlyRestriction { get; set; } = false;
        
        // Reading period in YYYY-MM format (optional - defaults to current month)
        public string? ReadingPeriod { get; set; }
    }

    // DTO for setting initial reading (Admin only)
    public class InitialReadingDto
    {
        [Required]
        public int ClientId { get; set; }
        
        [Required]
        [Range(0, double.MaxValue, ErrorMessage = "Initial reading must be a positive number")]
        public decimal InitialReading { get; set; }
    }

    public class ClientUpdateDto
    {
        public string? FirstName { get; set; }
        public string? MiddleName { get; set; }
        public string? LastName { get; set; }
        
        [EmailAddress]
        public string? Email { get; set; }
        
        [Phone]
        public string? Phone { get; set; }
        
        public string? MeterNumber { get; set; }
        public string? Location { get; set; }
        
        [RegularExpression("^(Connected|Disconnected|Pending)$", ErrorMessage = "Invalid connection status")]
        public string? ConnectionStatus { get; set; }
    }

    public class PaymentCreateDto
    {
        [Required]
        public int BillId { get; set; }
        
        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Payment amount must be greater than 0")]
        public decimal Amount { get; set; }
        
        [Required]
        [RegularExpression("^(Cash|Bank|Mobile|Card)$", ErrorMessage = "Invalid payment method")]
        public string PaymentMethod { get; set; } = "Cash";
        
        public string? Reference { get; set; }
    }

    public class SystemSettingsDto
    {
        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Rate per unit must be greater than 0")]
        public decimal RatePerUnit { get; set; }
        
        [Required]
        [Range(0, 100, ErrorMessage = "Penalty rate must be between 0 and 100")]
        public decimal PenaltyRate { get; set; }
        
        [Required]
        [Range(1, 365, ErrorMessage = "Grace period must be between 1 and 365 days")]
        public int GracePeriodDays { get; set; }
    }

    public class BillStatusUpdateDto
    {
        [Required]
        [RegularExpression("^(Unpaid|Paid|Overdue|Cancelled)$", ErrorMessage = "Invalid bill status")]
        public string Status { get; set; } = string.Empty;
    }

    // Report DTOs
    public class DateRangeDto
    {
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class FinancialReportDto
    {
        public DateRangeDto Period { get; set; } = new();
        public decimal TotalBilled { get; set; }
        public decimal TotalCollected { get; set; }
        public decimal CollectionRate { get; set; }
        public decimal Outstanding { get; set; }
        public int TotalBills { get; set; }
        public int PaidBills { get; set; }
        public int OverdueBills { get; set; }
        
        // Additional properties for frontend compatibility
        public decimal TotalRevenue { get; set; }
        public decimal OutstandingPayments { get; set; }
        public decimal TotalConsumption { get; set; }
        public int PaidBillsCount { get; set; }
        public int PendingBillsCount { get; set; }
        public int OverdueBillsCount { get; set; }
        public int DisconnectedClients { get; set; }
        public List<MonthlyRevenueData> MonthlyRevenueData { get; set; } = new();
        public List<MonthlyConsumptionData> MonthlyConsumptionData { get; set; } = new();
    }

    public class MonthlyRevenueData
    {
        public string Month { get; set; } = string.Empty;
        public decimal Total { get; set; }
    }

    public class MonthlyConsumptionData
    {
        public string Month { get; set; } = string.Empty;
        public decimal Paid { get; set; }
        public decimal Pending { get; set; }
        public decimal Overdue { get; set; }
        public decimal Total { get; set; }
    }

    public class CustomerReportDto
    {
        public int TotalCustomers { get; set; }
        public int ActiveConnections { get; set; }
        public int DisconnectedConnections { get; set; }
        public int PendingConnections { get; set; }
        public List<CustomerSummaryDto> CustomerDetails { get; set; } = new();
    }

    public class CustomerSummaryDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string MeterNumber { get; set; } = string.Empty;
        public string ConnectionStatus { get; set; } = string.Empty;
        public int TotalBills { get; set; }
        public decimal TotalOwed { get; set; }
        public DateTime? LastReadingDate { get; set; }
        public decimal AverageUsage { get; set; }
        public DateTime? LastPaymentDate { get; set; }
    }

    public class ConsumptionReportDto
    {
        public DateRangeDto Period { get; set; } = new();
        public decimal TotalConsumption { get; set; }
        public decimal AverageConsumption { get; set; }
        public List<ClientConsumptionDto> ClientConsumption { get; set; } = new();
    }

    public class ClientConsumptionDto
    {
        public int ClientId { get; set; }
        public string ClientName { get; set; } = string.Empty;
        public string MeterNumber { get; set; } = string.Empty;
        public decimal TotalUnits { get; set; }
        public int ReadingCount { get; set; }
        public decimal AverageUnits { get; set; }
    }

    public class PaymentSummaryDto
    {
        public DateRangeDto Period { get; set; } = new();
        public int TotalPayments { get; set; }
        public decimal TotalAmount { get; set; }
        public List<PaymentMethodSummaryDto> PaymentMethods { get; set; } = new();
    }

    public class PaymentMethodSummaryDto
    {
        public string Method { get; set; } = string.Empty;
        public int Count { get; set; }
        public decimal Amount { get; set; }
    }

    public class SystemSettingsResponseDto
    {
        public int Id { get; set; }
        public decimal RatePerUnit { get; set; }
        public decimal PenaltyRate { get; set; }
        public int GracePeriodDays { get; set; }
        public DateTime LastUpdated { get; set; }
        public string UpdatedByUsername { get; set; } = string.Empty;
    }

    public class SystemSettingsHistoryDto
    {
        public decimal RatePerUnit { get; set; }
        public decimal PenaltyRate { get; set; }
        public DateTime EffectiveDate { get; set; }
        public string UpdatedByUsername { get; set; } = string.Empty;
    }

    // Price History DTOs
    public class PriceHistoryCreateDto
    {
        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Rate per unit must be greater than 0")]
        public decimal RatePerUnit { get; set; }
        
        [Required]
        [Range(0, 100, ErrorMessage = "Penalty rate must be between 0 and 100")]
        public decimal PenaltyRate { get; set; }
        
        [Required]
        public string BillingPeriodFrom { get; set; } = string.Empty; // YYYY-MM format
        
        public string? BillingPeriodTo { get; set; } // YYYY-MM format (optional for ongoing)
    }

    public class PriceHistoryResponseDto
    {
        public int Id { get; set; }
        public decimal RatePerUnit { get; set; }
        public decimal PenaltyRate { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public string BillingPeriodFrom { get; set; } = string.Empty;
        public string? BillingPeriodTo { get; set; }
        public DateTime CreatedDate { get; set; }
        public string CreatedByUsername { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool IsCurrent { get; set; } // Helper property to indicate if this is the current active price
    }

    public class SystemMetricsDto
    {
        public int TotalClients { get; set; }
        public int ActiveConnections { get; set; }
        public int TotalReadings { get; set; }
        public int TotalPayments { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal OutstandingAmount { get; set; }
        public decimal CollectionRate { get; set; }
        public decimal AverageConsumption { get; set; }
        public decimal CurrentRatePerUnit { get; set; }
    }
}
