using Microsoft.EntityFrameworkCore;
using MyApi.Models;

namespace MyApi.Data
{
    public class WaterBillingDbContext : DbContext
    {
        public WaterBillingDbContext(DbContextOptions<WaterBillingDbContext> options) : base(options) { }

        public DbSet<Client> Clients { get; set; }
        public DbSet<MeterReading> MeterReadings { get; set; }
        public DbSet<Bill> Bills { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<SystemSettings> SystemSettings { get; set; }
        public DbSet<Users> Users { get; set; }
        public DbSet<MpesaTransaction> MpesaTransactions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Client configuration
            modelBuilder.Entity<Client>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FirstName).IsRequired().HasMaxLength(50);
                entity.Property(e => e.MiddleName).HasMaxLength(50);
                entity.Property(e => e.LastName).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Email).HasMaxLength(100);
                entity.Property(e => e.Phone).HasMaxLength(20);
                entity.Property(e => e.MeterNumber).IsRequired().HasMaxLength(50);
                entity.HasIndex(e => e.MeterNumber).IsUnique();
                entity.Property(e => e.Location).HasMaxLength(200);
                entity.Property(e => e.ConnectionStatus).HasMaxLength(20);
            });

            // MeterReading configuration
            modelBuilder.Entity<MeterReading>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Client)
                    .WithMany(c => c.MeterReadings)
                    .HasForeignKey(e => e.ClientId);
                entity.Property(e => e.CurrentReading).HasPrecision(10, 2);
                entity.Property(e => e.PreviousReading).HasPrecision(10, 2);
                entity.Property(e => e.UnitsUsed).HasPrecision(10, 2);
                entity.Property(e => e.BillingPeriod).HasMaxLength(7); // YYYY-MM format
            });

            // Bill configuration
            modelBuilder.Entity<Bill>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.BillNumber).IsRequired().HasMaxLength(50);
                entity.HasIndex(e => e.BillNumber).IsUnique();
                entity.HasOne(e => e.Client)
                    .WithMany(c => c.Bills)
                    .HasForeignKey(e => e.ClientId);
                entity.Property(e => e.UnitsUsed).HasPrecision(10, 2);
                entity.Property(e => e.RatePerUnit).HasPrecision(10, 2);
                entity.Property(e => e.Amount).HasPrecision(10, 2);
                entity.Property(e => e.PenaltyAmount).HasPrecision(10, 2);
                entity.Property(e => e.TotalAmount).HasPrecision(10, 2);
                entity.Property(e => e.BillingPeriod).HasMaxLength(7); // YYYY-MM format
                // Note: MeterReadingId foreign key will be added later when data is migrated
            });

            // Payment configuration
            modelBuilder.Entity<Payment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Bill)
                    .WithMany(b => b.Payments)
                    .HasForeignKey(e => e.BillId);
                entity.Property(e => e.Amount).HasPrecision(10, 2);
                entity.Property(e => e.PaymentMethod).HasMaxLength(50);
                entity.Property(e => e.Reference).HasMaxLength(100);
            });

            // SystemSettings configuration
            modelBuilder.Entity<SystemSettings>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.RatePerUnit).HasPrecision(10, 2);
                entity.Property(e => e.PenaltyRate).HasPrecision(5, 2);
            });

            // Users configuration
            modelBuilder.Entity<Users>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Username).IsRequired().HasMaxLength(50);
                entity.HasIndex(e => e.Username).IsUnique();
                entity.Property(e => e.Email).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Role).IsRequired().HasMaxLength(20);
            });
            
            // Configure Client relationships
            modelBuilder.Entity<Client>()
                .HasOne(c => c.CreatedBy)
                .WithMany()
                .HasForeignKey(c => c.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
                
            // Configure MeterReading relationships
            modelBuilder.Entity<MeterReading>()
                .HasOne(r => r.RecordedByUser)
                .WithMany(u => u.MeterReadings)
                .HasForeignKey(r => r.RecordedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
                
            // Configure Bill relationships
            modelBuilder.Entity<Bill>()
                .HasOne(b => b.CreatedByUser)
                .WithMany(u => u.Bills)
                .HasForeignKey(b => b.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
                
            // Configure Payment relationships
            modelBuilder.Entity<Payment>()
                .HasOne(p => p.RecordedByUser)
                .WithMany(u => u.Payments)
                .HasForeignKey(p => p.RecordedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // MpesaTransaction configuration
            modelBuilder.Entity<MpesaTransaction>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Bill)
                    .WithMany()
                    .HasForeignKey(e => e.BillId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.Property(e => e.Amount).HasPrecision(10, 2);
                entity.Property(e => e.PhoneNumber).HasMaxLength(15);
                entity.Property(e => e.MerchantRequestID).HasMaxLength(100);
                entity.Property(e => e.CheckoutRequestID).HasMaxLength(100);
                entity.Property(e => e.Status).HasMaxLength(20);
                entity.Property(e => e.MpesaReceiptNumber).HasMaxLength(50);
                entity.Property(e => e.TransactionDate).HasMaxLength(50);
                entity.Property(e => e.ErrorMessage).HasMaxLength(500);
            });
        }
    }
}
