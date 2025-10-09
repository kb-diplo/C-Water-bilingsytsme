using Microsoft.EntityFrameworkCore;
using MyApi.Data;
using MyApi.Models;

namespace MyApi.Services
{
    public interface IPriceService
    {
        Task<decimal> GetRateForPeriodAsync(string billingPeriod);
        Task<decimal> GetPenaltyRateForPeriodAsync(string billingPeriod);
        Task<PriceHistory> CreatePriceHistoryAsync(PriceHistoryCreateDto dto, int userId);
        Task<List<PriceHistoryResponseDto>> GetPriceHistoryAsync();
        Task<PriceHistoryResponseDto?> GetCurrentPriceAsync();
    }

    public class PriceService : IPriceService
    {
        private readonly WaterBillingDbContext _context;

        public PriceService(WaterBillingDbContext context)
        {
            _context = context;
        }

        public async Task<decimal> GetRateForPeriodAsync(string billingPeriod)
        {
            // First check if there's a specific price history for this period
            var priceHistory = await _context.PriceHistory
                .Where(p => p.IsActive && 
                           string.Compare(p.BillingPeriodFrom, billingPeriod) <= 0 &&
                           (p.BillingPeriodTo == null || string.Compare(p.BillingPeriodTo, billingPeriod) >= 0))
                .OrderByDescending(p => p.BillingPeriodFrom)
                .FirstOrDefaultAsync();

            if (priceHistory != null)
            {
                return priceHistory.RatePerUnit;
            }

            // Fallback to system settings
            var settings = await _context.SystemSettings.FirstOrDefaultAsync();
            return settings?.RatePerUnit ?? 50; // Default rate
        }

        public async Task<decimal> GetPenaltyRateForPeriodAsync(string billingPeriod)
        {
            // First check if there's a specific price history for this period
            var priceHistory = await _context.PriceHistory
                .Where(p => p.IsActive && 
                           string.Compare(p.BillingPeriodFrom, billingPeriod) <= 0 &&
                           (p.BillingPeriodTo == null || string.Compare(p.BillingPeriodTo, billingPeriod) >= 0))
                .OrderByDescending(p => p.BillingPeriodFrom)
                .FirstOrDefaultAsync();

            if (priceHistory != null)
            {
                return priceHistory.PenaltyRate;
            }

            // Fallback to system settings
            var settings = await _context.SystemSettings.FirstOrDefaultAsync();
            return settings?.PenaltyRate ?? 10; // Default penalty rate
        }

        public async Task<PriceHistory> CreatePriceHistoryAsync(PriceHistoryCreateDto dto, int userId)
        {
            // Validate period format
            if (!DateTime.TryParseExact(dto.BillingPeriodFrom + "-01", "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out var fromDate))
            {
                throw new ArgumentException("Invalid BillingPeriodFrom format. Use YYYY-MM format.");
            }

            DateTime? toDate = null;
            if (!string.IsNullOrEmpty(dto.BillingPeriodTo))
            {
                if (!DateTime.TryParseExact(dto.BillingPeriodTo + "-01", "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out var parsedToDate))
                {
                    throw new ArgumentException("Invalid BillingPeriodTo format. Use YYYY-MM format.");
                }
                toDate = parsedToDate;
            }

            // Check for overlapping periods
            var overlapping = await _context.PriceHistory
                .Where(p => p.IsActive &&
                           ((string.Compare(p.BillingPeriodFrom, dto.BillingPeriodFrom) <= 0 && 
                             (p.BillingPeriodTo == null || string.Compare(p.BillingPeriodTo, dto.BillingPeriodFrom) >= 0)) ||
                            (dto.BillingPeriodTo != null && 
                             string.Compare(p.BillingPeriodFrom, dto.BillingPeriodTo) <= 0 && 
                             (p.BillingPeriodTo == null || string.Compare(p.BillingPeriodTo, dto.BillingPeriodFrom) >= 0))))
                .AnyAsync();

            if (overlapping)
            {
                throw new InvalidOperationException("The specified period overlaps with an existing price period.");
            }

            var priceHistory = new PriceHistory
            {
                RatePerUnit = dto.RatePerUnit,
                PenaltyRate = dto.PenaltyRate,
                BillingPeriodFrom = dto.BillingPeriodFrom,
                BillingPeriodTo = dto.BillingPeriodTo,
                EffectiveFrom = fromDate,
                EffectiveTo = toDate,
                CreatedByUserId = userId,
                CreatedDate = DateTime.UtcNow,
                IsActive = true
            };

            _context.PriceHistory.Add(priceHistory);
            await _context.SaveChangesAsync();

            return priceHistory;
        }

        public async Task<List<PriceHistoryResponseDto>> GetPriceHistoryAsync()
        {
            var currentPeriod = DateTime.UtcNow.ToString("yyyy-MM");
            
            var priceHistory = await _context.PriceHistory
                .Include(p => p.CreatedByUser)
                .Where(p => p.IsActive)
                .OrderByDescending(p => p.BillingPeriodFrom)
                .Select(p => new PriceHistoryResponseDto
                {
                    Id = p.Id,
                    RatePerUnit = p.RatePerUnit,
                    PenaltyRate = p.PenaltyRate,
                    EffectiveFrom = p.EffectiveFrom,
                    EffectiveTo = p.EffectiveTo,
                    BillingPeriodFrom = p.BillingPeriodFrom,
                    BillingPeriodTo = p.BillingPeriodTo,
                    CreatedDate = p.CreatedDate,
                    CreatedByUsername = p.CreatedByUser.Username ?? "System",
                    IsActive = p.IsActive,
                    IsCurrent = string.Compare(p.BillingPeriodFrom, currentPeriod) <= 0 &&
                               (p.BillingPeriodTo == null || string.Compare(p.BillingPeriodTo, currentPeriod) >= 0)
                })
                .ToListAsync();

            return priceHistory;
        }

        public async Task<PriceHistoryResponseDto?> GetCurrentPriceAsync()
        {
            var currentPeriod = DateTime.UtcNow.ToString("yyyy-MM");
            
            var currentPrice = await _context.PriceHistory
                .Include(p => p.CreatedByUser)
                .Where(p => p.IsActive && 
                           string.Compare(p.BillingPeriodFrom, currentPeriod) <= 0 &&
                           (p.BillingPeriodTo == null || string.Compare(p.BillingPeriodTo, currentPeriod) >= 0))
                .OrderByDescending(p => p.BillingPeriodFrom)
                .Select(p => new PriceHistoryResponseDto
                {
                    Id = p.Id,
                    RatePerUnit = p.RatePerUnit,
                    PenaltyRate = p.PenaltyRate,
                    EffectiveFrom = p.EffectiveFrom,
                    EffectiveTo = p.EffectiveTo,
                    BillingPeriodFrom = p.BillingPeriodFrom,
                    BillingPeriodTo = p.BillingPeriodTo,
                    CreatedDate = p.CreatedDate,
                    CreatedByUsername = p.CreatedByUser.Username ?? "System",
                    IsActive = p.IsActive,
                    IsCurrent = true
                })
                .FirstOrDefaultAsync();

            return currentPrice;
        }
    }
}
