using Google.Cloud.Firestore;

[FirestoreData]
public class QRToken
{
    [FirestoreProperty]
    public string Token { get; set; }
    [FirestoreProperty]
    public string AppointmentId { get; set; }
    [FirestoreProperty]
    public DateTime ExpiryTime { get; set; }
    [FirestoreProperty]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}