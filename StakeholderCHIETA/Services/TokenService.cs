using Google.Cloud.Firestore;
using System.Security.Cryptography;
using System.Text;

namespace StakeholderCHIETA.Services
{
    public class TokenService : ITokenService
    {
        private readonly FirestoreDb _db;

        public TokenService(FirestoreDb db)
        {
            _db = db;
        }

        private static string Sha256(string input)
        {
            using var sha = SHA256.Create();
            var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(input));
            return Convert.ToHexString(bytes);
        }

        // ✅ Required by the interface
        public async Task<(string RawToken, string TokenId)> CreateOneTimeTokenAsync(string appointmentId, TimeSpan ttl)
        {
            var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)); // 256-bit token
            var tokenId = Guid.NewGuid().ToString("N");
            var tokenHash = Sha256(rawToken);

            var expiresAt = Timestamp.FromDateTime(DateTime.UtcNow.Add(ttl));

            var tokenDoc = _db.Collection("appointmentTokens").Document(tokenId);
            await tokenDoc.SetAsync(new
            {
                AppointmentId = appointmentId,
                TokenHash = tokenHash,
                ExpiresAt = expiresAt,
                UsedAt = (Timestamp?)null
            });

            return (rawToken, tokenId);
        }

        public async Task<bool> ValidateAndConsumeAsync(string rawToken, string appointmentId)
        {
            var hash = Sha256(rawToken);

            var query = _db.Collection("appointmentTokens")
                           .WhereEqualTo("AppointmentId", appointmentId)
                           .WhereEqualTo("TokenHash", hash);

            var snapshot = await query.GetSnapshotAsync();
            if (snapshot.Count == 0) return false;

            var tokenDoc = snapshot.Documents.First();
            var data = tokenDoc.ToDictionary();

            // Expiry check
            if (data.TryGetValue("ExpiresAt", out var expObj) &&
                expObj is Timestamp expTs &&
                expTs.ToDateTime() < DateTime.UtcNow)
                return false;

            // Already used check
            if (data.ContainsKey("UsedAt") && data["UsedAt"] is Timestamp) return false;

            // Mark token as used
            await tokenDoc.Reference.UpdateAsync(new Dictionary<string, object>
            {
                { "UsedAt", Timestamp.FromDateTime(DateTime.UtcNow) }
            });

            return true;
        }
    }
}
