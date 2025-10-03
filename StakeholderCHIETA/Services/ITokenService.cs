
using System;
using System.Threading.Tasks;

namespace StakeholderCHIETA.Services
{
    public interface ITokenService
    {
        Task<(string RawToken, string TokenId)> CreateOneTimeTokenAsync(string appointmentId, TimeSpan ttl);
        Task<bool> ValidateAndConsumeAsync(string rawToken, string appointmentId);
    }

    
}

/* namespace StakeholderCHIETA.Services
{
    public interface ITokenService
    {
        string GenerateSecureToken();
        Task<string?> GetUserEmailAsync(string userId);
        Task StoreTokenAsync(string token, int appointmentId, DateTime expiry);
        Task StoreTokenAsync(string validationToken, object id, DateTime expiryTime);
        bool ValidateToken(string token, int appointmentId);
        bool ValidateToken(string validationToken, string appointmentId);
    }
} */