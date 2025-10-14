using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;

namespace MyApi.Services
{
    public class CacheService : ICacheService
    {
        private readonly IDistributedCache _distributedCache;
        private readonly IMemoryCache _memoryCache;
        private readonly ILogger<CacheService> _logger;
        private readonly bool _useRedis;

        public CacheService(
            IDistributedCache distributedCache,
            IMemoryCache memoryCache,
            ILogger<CacheService> logger,
            IConfiguration configuration)
        {
            _distributedCache = distributedCache;
            _memoryCache = memoryCache;
            _logger = logger;
            _useRedis = !string.IsNullOrEmpty(configuration.GetConnectionString("Redis"));
        }

        public async Task<T?> GetAsync<T>(string key) where T : class
        {
            try
            {
                if (_useRedis)
                {
                    var cachedValue = await _distributedCache.GetStringAsync(key);
                    if (cachedValue != null)
                    {
                        return JsonSerializer.Deserialize<T>(cachedValue);
                    }
                }
                else
                {
                    if (_memoryCache.TryGetValue(key, out T? cachedValue))
                    {
                        return cachedValue;
                    }
                }

                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cached value for key: {Key}", key);
                return null;
            }
        }

        public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null) where T : class
        {
            try
            {
                expiration ??= TimeSpan.FromMinutes(30); // Default 30 minutes

                if (_useRedis)
                {
                    var serializedValue = JsonSerializer.Serialize(value);
                    var options = new DistributedCacheEntryOptions
                    {
                        AbsoluteExpirationRelativeToNow = expiration
                    };
                    await _distributedCache.SetStringAsync(key, serializedValue, options);
                }
                else
                {
                    var options = new MemoryCacheEntryOptions
                    {
                        AbsoluteExpirationRelativeToNow = expiration,
                        Priority = CacheItemPriority.High
                    };
                    _memoryCache.Set(key, value, options);
                }

                _logger.LogDebug("Cached value for key: {Key} with expiration: {Expiration}", key, expiration);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting cached value for key: {Key}", key);
            }
        }

        public async Task RemoveAsync(string key)
        {
            try
            {
                if (_useRedis)
                {
                    await _distributedCache.RemoveAsync(key);
                }
                else
                {
                    _memoryCache.Remove(key);
                }

                _logger.LogDebug("Removed cached value for key: {Key}", key);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing cached value for key: {Key}", key);
            }
        }

        public Task RemoveByPatternAsync(string pattern)
        {
            try
            {
                // This is a simplified implementation
                // For Redis, you'd use SCAN command with pattern matching
                // For MemoryCache, this is more complex and might require tracking keys
                _logger.LogWarning("RemoveByPatternAsync not fully implemented for pattern: {Pattern}", pattern);
                return Task.CompletedTask;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing cached values by pattern: {Pattern}", pattern);
                return Task.CompletedTask;
            }
        }

        public async Task<bool> ExistsAsync(string key)
        {
            try
            {
                if (_useRedis)
                {
                    var value = await _distributedCache.GetStringAsync(key);
                    return value != null;
                }
                else
                {
                    return _memoryCache.TryGetValue(key, out _);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if cached value exists for key: {Key}", key);
                return false;
            }
        }
    }
}
