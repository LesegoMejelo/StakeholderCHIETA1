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
