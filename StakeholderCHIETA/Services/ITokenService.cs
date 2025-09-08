namespace StakeholderCHIETA.Services
{
    public interface ITokenService
    {
        string GenerateSecureToken();
        Task StoreTokenAsync(string token, int appointmentId, DateTime expiry);
        Task StoreTokenAsync(string validationToken, object id, DateTime expiryTime);
        bool ValidateToken(string token, int appointmentId);
        bool ValidateToken(string validationToken, string appointmentId);
    }
}
