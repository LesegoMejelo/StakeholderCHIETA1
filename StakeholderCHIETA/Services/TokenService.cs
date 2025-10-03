
using Google.Cloud.Firestore;
using System.Security.Cryptography;
using System.Text;

namespace StakeholderCHIETA.Services;

public class TokenService : ITokenService
{
    private readonly FirestoreDb _db;

    public TokenService(FirestoreDb db) => _db = db;

    private static string Sha256(string input)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes);
    }

    public async Task<(string RawToken, string TokenId)> CreateOneTimeTokenAsync(string appointmentId, TimeSpan ttl)
    {
        var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)); // 256-bit
        var tokenId = Guid.NewGuid().ToString("N");

        var tokenDoc = _db.Collection("appointmentTokens").Document(tokenId);
        var payload = new Dictionary<string, object>
        {
            ["appointmentId"] = appointmentId,
            ["tokenHash"] = Sha256(rawToken),
            ["createdAt"] = Timestamp.FromDateTime(DateTime.UtcNow),
            ["expiresAt"] = Timestamp.FromDateTime(DateTime.UtcNow.Add(ttl)),
            ["usedAt"] = null
        };

        await tokenDoc.SetAsync(payload);
        return (rawToken, tokenId);
    }

    public async Task<bool> ValidateAndConsumeAsync(string rawToken, string appointmentId)
    {
        // Expect "<raw>|<tokenId>"
        var parts = rawToken.Split('|', 2);
        if (parts.Length != 2) return false;

        var raw = parts[0];
        var tokenId = parts[1];

        var docRef = _db.Collection("appointmentTokens").Document(tokenId);
        var snap = await docRef.GetSnapshotAsync();
        if (!snap.Exists) return false;

        var data = snap.ToDictionary();
        var hash = data["tokenHash"] as string;
        var apptId = data["appointmentId"] as string;
        var expiresAt = (Timestamp)data["expiresAt"];
        var usedAt = data.ContainsKey("usedAt") ? data["usedAt"] as Timestamp? : null;

        if (apptId != appointmentId) return false;
        if (usedAt != null) return false;
        if (expiresAt.ToDateTime() < DateTime.UtcNow) return false;
        if (!string.Equals(hash, Sha256(raw), StringComparison.OrdinalIgnoreCase)) return false;

        // Mark token used + appointment checked-in atomically
        var apptRef = _db.Collection("appointments").Document(appointmentId);
        var batch = _db.StartBatch();
        batch.Update(docRef, new Dictionary<string, object> { ["usedAt"] = Timestamp.FromDateTime(DateTime.UtcNow) });
        batch.Update(apptRef, new Dictionary<string, object>
        {
            ["status"] = "CheckedIn",
            ["checkedInAt"] = Timestamp.FromDateTime(DateTime.UtcNow)
        });
        await batch.CommitAsync();

        return true;
    }
}
















