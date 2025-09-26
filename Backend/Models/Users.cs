using System.ComponentModel.DataAnnotations.Schema;

namespace MyApi.Models
{
    public class Users
    {
        public int Id { get; set; }                    // PK
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Role { get; set; } = "Client";   // Admin | MeterReader | Client
        public bool IsBootstrap { get; set; } = false; // true for the seeded admin
        public bool IsActive { get; set; } = true;     // Account active status
        public string? ResetToken { get; set; }        // Password reset token
        public DateTime? ResetTokenExpiry { get; set; } // Token expiration time

        // Navigation properties
        [InverseProperty("CreatedBy")]
        public virtual ICollection<Client> Clients { get; set; } = new List<Client>();
        
        [InverseProperty("RecordedByUser")]
        public virtual ICollection<MeterReading> MeterReadings { get; set; } = new List<MeterReading>();
        
        [InverseProperty("CreatedByUser")]
        public virtual ICollection<Bill> Bills { get; set; } = new List<Bill>();
        
        [InverseProperty("RecordedByUser")]
        public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }
}
