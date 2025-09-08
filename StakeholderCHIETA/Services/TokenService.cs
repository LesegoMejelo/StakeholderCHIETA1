using Microsoft.Extensions.Caching.Memory;
using System.Security.Cryptography;

namespace StakeholderCHIETA.Services
{
    public class TokenService : ITokenService
    {
        private readonly IMemoryCache _cache;

        public TokenService(IMemoryCache cache)
        {
            _cache = cache;
        }

        public string GenerateSecureToken()
        {
            return Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        }

        public async Task StoreTokenAsync(string token, int appointmentId, DateTime expiry)
        {
            var cacheKey = $"qr_token_{token}";
            _cache.Set(cacheKey, appointmentId, expiry);
        }

        public Task StoreTokenAsync(string validationToken, object id, DateTime expiryTime)
        {
            throw new NotImplementedException();
        }

        public bool ValidateToken(string token, int appointmentId)
        {
            var cacheKey = $"qr_token_{token}";
            if (_cache.TryGetValue(cacheKey, out int storedAppointmentId))
            {
                return storedAppointmentId == appointmentId;
            }
            return false;
        }

        public bool ValidateToken(string validationToken, string appointmentId)
        {
            throw new NotImplementedException();
        }
    }
}
