using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyApi.Data;
using MyApi.Models;
using System.Security.Claims;

namespace MyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class MetricsController(WaterBillingDbContext context) : ControllerBase
    {
        private readonly WaterBillingDbContext _context = context;

        /// <summary>
        /// Get current billing rates and system settings
        /// </summary>
        [HttpGet("rates")]
        public async Task<ActionResult<SystemSettingsResponseDto>> GetBillingRates()
        {
            var settings = await _context.SystemSettings.FirstOrDefaultAsync();
            
            if (settings == null)
            {
                // Return default settings if none exist
                return Ok(new SystemSettingsResponseDto
                {
                    RatePerUnit = 50,
                    PenaltyRate = 10,
                    GracePeriodDays = 30,
                    LastUpdated = DateTime.UtcNow,
                    UpdatedByUsername = "System"
                });
            }

            var updatedByUser = await _context.Users.FindAsync(settings.UpdatedByUserId);
            
            return Ok(new SystemSettingsResponseDto
            {
                Id = settings.Id,
                RatePerUnit = settings.RatePerUnit,
                PenaltyRate = settings.PenaltyRate,
                GracePeriodDays = settings.GracePeriodDays,
                LastUpdated = settings.LastUpdated,
                UpdatedByUsername = updatedByUser?.Username ?? "Unknown"
            });
        }

        /// <summary>
        /// Update billing rates and system settings
        /// </summary>
        [HttpPut("rates")]
        public async Task<ActionResult<SystemSettingsResponseDto>> UpdateBillingRates(SystemSettingsDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var settings = await _context.SystemSettings.FirstOrDefaultAsync();

            if (settings == null)
            {
                settings = new SystemSettings
                {
                    RatePerUnit = dto.RatePerUnit,
                    PenaltyRate = dto.PenaltyRate,
                    GracePeriodDays = dto.GracePeriodDays,
                    UpdatedByUserId = userId,
                    LastUpdated = DateTime.UtcNow
                };
                _context.SystemSettings.Add(settings);
            }
            else
            {
                settings.RatePerUnit = dto.RatePerUnit;
                settings.PenaltyRate = dto.PenaltyRate;
                settings.GracePeriodDays = dto.GracePeriodDays;
                settings.LastUpdated = DateTime.UtcNow;
                settings.UpdatedByUserId = userId;
            }

            await _context.SaveChangesAsync();

            var updatedByUser = await _context.Users.FindAsync(userId);
            
            return Ok(new SystemSettingsResponseDto
            {
                Id = settings.Id,
                RatePerUnit = settings.RatePerUnit,
                PenaltyRate = settings.PenaltyRate,
                GracePeriodDays = settings.GracePeriodDays,
                LastUpdated = settings.LastUpdated,
                UpdatedByUsername = updatedByUser?.Username ?? "Unknown"
            });
        }


    }
}
