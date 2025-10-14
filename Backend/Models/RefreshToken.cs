using System.ComponentModel.DataAnnotations;

namespace MyApi.Models
{
    public class RefreshToken
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string Token { get; set; } = string.Empty;
        
        [Required]
        public int UserId { get; set; }
        
        [Required]
        public DateTime ExpiryDate { get; set; }
        
        [Required]
        public DateTime CreatedDate { get; set; }
        
        public DateTime? RevokedDate { get; set; }
        
        public bool IsRevoked { get; set; }
        
        // Navigation property
        public Users User { get; set; } = null!;
    }
}
