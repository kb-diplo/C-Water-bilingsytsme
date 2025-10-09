using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace MyApi.Models
{
    // Enhanced Client model with all necessary details
    public class Client
    {
        public int Id { get; set; }
        [Required]
        public string FirstName { get; set; } = string.Empty;
        public string? MiddleName { get; set; }
        [Required]
        public string LastName { get; set; } = string.Empty;
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
        [Required]
        public string Phone { get; set; } = string.Empty;
        [Required]
        public string MeterNumber { get; set; } = string.Empty;
        [Required]
        public string Location { get; set; } = string.Empty;
        public string ConnectionStatus { get; set; } = "Pending"; // Connected, Disconnected, Pending
        public decimal InitialReading { get; set; } = 0; // Initial meter reading set by admin
        public bool HasInitialReading { get; set; } = false; // Flag to track if initial reading is set
        public DateTime? InitialReadingDate { get; set; } // When initial reading was set
        public int? InitialReadingSetByUserId { get; set; } // Who set the initial reading
        public bool IsActive { get; set; } = true;
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public int CreatedByUserId { get; set; }
        [JsonIgnore]
        public Users? CreatedBy { get; set; }
        [JsonIgnore]
        public ICollection<MeterReading> MeterReadings { get; set; } = new List<MeterReading>();
        [JsonIgnore]
        public ICollection<Bill> Bills { get; set; } = new List<Bill>();
        
        // Computed property for full name
        public string FullName => string.IsNullOrWhiteSpace(MiddleName) 
            ? $"{FirstName} {LastName}" 
            : $"{FirstName} {MiddleName} {LastName}";
    }

    // Meter Reading model
    public class MeterReading
    {
        public int Id { get; set; }
        public int ClientId { get; set; }
        [JsonIgnore]
        public Client Client { get; set; } = null!;
        public decimal CurrentReading { get; set; }
        public decimal PreviousReading { get; set; }
        public decimal UnitsUsed { get; set; }
        public DateTime ReadingDate { get; set; } = DateTime.UtcNow;
        public int RecordedByUserId { get; set; }
        public string Status { get; set; } = "Pending"; // Pending, Approved
        public string BillingPeriod { get; set; } = string.Empty; // Format: YYYY-MM
        
        // Navigation property
        [JsonIgnore]
        public Users RecordedByUser { get; set; } = null!;
        public string? MeterNumber { get; set; }
        public string? Location { get; set; }
        public string? ConnectionStatus { get; set; }
    }

    // Bill model
    public class Bill
    {
        public int Id { get; set; }
        public int ClientId { get; set; }
        [JsonIgnore]
        public Client Client { get; set; } = null!;
        public int? MeterReadingId { get; set; } // Link to the meter reading that generated this bill
        [JsonIgnore]
        public MeterReading? MeterReading { get; set; } // Navigation property
        public string BillNumber { get; set; } = string.Empty;
        public decimal UnitsUsed { get; set; }
        public decimal RatePerUnit { get; set; }
        public decimal Amount { get; set; }
        public decimal PenaltyAmount { get; set; } = 0;
        public decimal TotalAmount { get; set; }
        public DateTime BillDate { get; set; } = DateTime.UtcNow;
        public DateTime DueDate { get; set; }
        public string Status { get; set; } = "Unpaid"; // Unpaid, Paid, Overdue
        public int CreatedByUserId { get; set; }
        public string BillingPeriod { get; set; } = string.Empty; // Format: YYYY-MM
        
        // Computed property for remaining balance
        public decimal Balance => TotalAmount - Payments.Sum(p => p.Amount);
        
        // Navigation properties
        [JsonIgnore]
        public Users CreatedByUser { get; set; } = null!;
        [JsonIgnore]
        public List<Payment> Payments { get; set; } = new();
    }

    // Payment model
    public class Payment
    {
        public int Id { get; set; }
        public int BillId { get; set; }
        [JsonIgnore]
        public Bill Bill { get; set; } = null!;
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
        public string PaymentMethod { get; set; } = "Cash"; // Cash, Bank, Mobile
        public string Reference { get; set; } = string.Empty;
        public int RecordedByUserId { get; set; }
        
        // Navigation property
        [JsonIgnore]
        public Users RecordedByUser { get; set; } = null!;
    }

    // System Settings model
    public class SystemSettings
    {
        public int Id { get; set; }
        public decimal RatePerUnit { get; set; } = 50;
        public decimal PenaltyRate { get; set; } = 10; // Percentage
        public int GracePeriodDays { get; set; } = 30;
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
        public int? UpdatedByUserId { get; set; }
        
        // Navigation property
        public Users? UpdatedByUser { get; set; }
    }

    // Price History model for tracking rate changes over time
    public class PriceHistory
    {
        public int Id { get; set; }
        public decimal RatePerUnit { get; set; }
        public decimal PenaltyRate { get; set; }
        public DateTime EffectiveFrom { get; set; } // When this price becomes effective
        public DateTime? EffectiveTo { get; set; } // When this price expires (null for current)
        public string BillingPeriodFrom { get; set; } = string.Empty; // Format: YYYY-MM
        public string? BillingPeriodTo { get; set; } // Format: YYYY-MM (null for ongoing)
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public int CreatedByUserId { get; set; }
        public bool IsActive { get; set; } = true;
        
        // Navigation property
        public Users CreatedByUser { get; set; } = null!;
    }

    // DTOs for API requests
    public class ClientCreateDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
        [Required]
        public string Phone { get; set; } = string.Empty;
        [Required]
        public string MeterNumber { get; set; } = string.Empty;
        [Required]
        public string Location { get; set; } = string.Empty;
        public string ConnectionStatus { get; set; } = "Pending";
    }

    // Flexible client creation - only name is required
    public class ClientCreateFlexibleDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        [EmailAddress]
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? MeterNumber { get; set; }
        public string? Location { get; set; }
        public string? ConnectionStatus { get; set; }
    }

    // Client registration DTO for full registration with user account
    public class ClientRegistrationDto
    {
        [Required]
        public string Username { get; set; } = string.Empty;
        [Required]
        public string Password { get; set; } = string.Empty;
        [Required]
        public string FirstName { get; set; } = string.Empty;
        public string? MiddleName { get; set; }
        [Required]
        public string LastName { get; set; } = string.Empty;
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
        [Required]
        public string Phone { get; set; } = string.Empty;
        [Required]
        public string MeterNumber { get; set; } = string.Empty;
        [Required]
        public string Location { get; set; } = string.Empty;
        public string? ConnectionStatus { get; set; } = "Pending"; // Connected, Disconnected, Pending
    }

    // Full client update DTO with all fields
    public class ClientUpdateFullDto
    {
        public string? FirstName { get; set; }
        public string? MiddleName { get; set; }
        public string? LastName { get; set; }
        [EmailAddress]
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? MeterNumber { get; set; }
        public string? Location { get; set; }
        public string? ConnectionStatus { get; set; } // Connected, Disconnected, Pending
    }

    // Full client creation DTO
    public class ClientCreateFullDto
    {
        [Required]
        public string Username { get; set; } = string.Empty;
        [Required]
        public string FirstName { get; set; } = string.Empty;
        public string? MiddleName { get; set; }
        [Required]
        public string LastName { get; set; } = string.Empty;
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
        [Required]
        public string Phone { get; set; } = string.Empty;
        [Required]
        public string MeterNumber { get; set; } = string.Empty;
        [Required]
        public string Location { get; set; } = string.Empty;
        public string? ConnectionStatus { get; set; } = "Connected";
        [Required]
        public string Password { get; set; } = string.Empty;
    }


    public class MeterReadingDto
    {
        [Required]
        public int ClientId { get; set; }
        [Required]
        public decimal CurrentReading { get; set; }
    }

    public class PaymentDto
    {
        [Required]
        public int BillId { get; set; }
        [Required]
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = "Cash";
        public string Reference { get; set; } = string.Empty;
    }


    public class UserRegistrationDto
    {
        [Required]
        public string Username { get; set; } = string.Empty;
        [Required]
        public string Password { get; set; } = string.Empty;
        [Required]
        public string Role { get; set; } = string.Empty; // Admin, MeterReader, Client
        public string? Email { get; set; }
        public string? FullName { get; set; }
    }

    public class ClientSearchDto
    {
        public string? Name { get; set; }
        public string? MeterNumber { get; set; }
        public string? Phone { get; set; }
        public string? ConnectionStatus { get; set; }
    }
}
