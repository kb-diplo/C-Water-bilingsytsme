using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApi.Models;
using MyApi.Services;
using System.Security.Claims;

namespace MyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PriceHistoryController : ControllerBase
    {
        private readonly IPriceService _priceService;

        public PriceHistoryController(IPriceService priceService)
        {
            _priceService = priceService;
        }

        /// <summary>
        /// Get all price history records (Admin only)
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<PriceHistoryResponseDto>>> GetPriceHistory()
        {
            try
            {
                var priceHistory = await _priceService.GetPriceHistoryAsync();
                return Ok(priceHistory);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving price history: {ex.Message}");
            }
        }

        /// <summary>
        /// Get current active price (All authenticated users)
        /// </summary>
        [HttpGet("current")]
        public async Task<ActionResult<PriceHistoryResponseDto>> GetCurrentPrice()
        {
            try
            {
                var currentPrice = await _priceService.GetCurrentPriceAsync();
                if (currentPrice == null)
                {
                    return NotFound("No current price configuration found");
                }
                return Ok(currentPrice);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving current price: {ex.Message}");
            }
        }

        /// <summary>
        /// Create new price history entry (Admin only)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<PriceHistoryResponseDto>> CreatePriceHistory(PriceHistoryCreateDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var priceHistory = await _priceService.CreatePriceHistoryAsync(dto, userId);

                var response = new PriceHistoryResponseDto
                {
                    Id = priceHistory.Id,
                    RatePerUnit = priceHistory.RatePerUnit,
                    PenaltyRate = priceHistory.PenaltyRate,
                    EffectiveFrom = priceHistory.EffectiveFrom,
                    EffectiveTo = priceHistory.EffectiveTo,
                    BillingPeriodFrom = priceHistory.BillingPeriodFrom,
                    BillingPeriodTo = priceHistory.BillingPeriodTo,
                    CreatedDate = priceHistory.CreatedDate,
                    CreatedByUsername = User.Identity?.Name ?? "Admin",
                    IsActive = priceHistory.IsActive,
                    IsCurrent = false // Will be determined by the service
                };

                return CreatedAtAction(nameof(GetPriceHistory), response);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error creating price history: {ex.Message}");
            }
        }

        /// <summary>
        /// Get rate for specific billing period (All authenticated users)
        /// </summary>
        [HttpGet("rate/{billingPeriod}")]
        public async Task<ActionResult<decimal>> GetRateForPeriod(string billingPeriod)
        {
            try
            {
                // Validate period format
                if (!DateTime.TryParseExact(billingPeriod + "-01", "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out _))
                {
                    return BadRequest("Invalid billing period format. Use YYYY-MM format (e.g., 2024-08).");
                }

                var rate = await _priceService.GetRateForPeriodAsync(billingPeriod);
                return Ok(new { billingPeriod, ratePerUnit = rate });
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving rate for period: {ex.Message}");
            }
        }

        /// <summary>
        /// Get penalty rate for specific billing period (All authenticated users)
        /// </summary>
        [HttpGet("penalty-rate/{billingPeriod}")]
        public async Task<ActionResult<decimal>> GetPenaltyRateForPeriod(string billingPeriod)
        {
            try
            {
                // Validate period format
                if (!DateTime.TryParseExact(billingPeriod + "-01", "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out _))
                {
                    return BadRequest("Invalid billing period format. Use YYYY-MM format (e.g., 2024-08).");
                }

                var penaltyRate = await _priceService.GetPenaltyRateForPeriodAsync(billingPeriod);
                return Ok(new { billingPeriod, penaltyRate });
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving penalty rate for period: {ex.Message}");
            }
        }
    }
}
