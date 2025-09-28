using Google.Cloud.Firestore;
using System.Collections.Concurrent;

namespace StakeholderCHIETA.Services
{
    public interface IInquiryRealtimeService
    {
        IEnumerable<object> GetCachedInquiries();
    }

    public class InquiryRealtimeService : IInquiryRealtimeService
    {
        private readonly FirestoreDb _db;
        private readonly ConcurrentDictionary<string, object> _inquiries = new();

        public InquiryRealtimeService(FirestoreDb db)
        {
            _db = db;
            ListenForChanges();
        }

        private void ListenForChanges()
        {
            _db.Collection("inquiries")
               .OrderByDescending("createdAt")
               .Listen(snapshot =>
               {
                   foreach (var change in snapshot.Changes)
                   {
                       var data = change.Document.ToDictionary();

                       var inquiry = new
                       {
                           id = change.Document.Id,
                           customId = data.ContainsKey("customId") ? data["customId"] : "INQ-0000",
                           name = data.ContainsKey("name") ? data["name"] : "Unknown",
                           inquiryType = data.ContainsKey("inquiryType") ? data["inquiryType"] : "General",
                           status = data.ContainsKey("status") ? data["status"] : "Pending",
                           createdAt = data.ContainsKey("createdAt")
                               ? ((Timestamp)data["createdAt"]).ToDateTime()
                               : DateTime.MinValue,
                           updates = data.ContainsKey("updates") ? data["updates"] : new List<object>()
                       };

                       if (change.ChangeType == DocumentChange.Type.Added ||
                           change.ChangeType == DocumentChange.Type.Modified)
                       {
                           _inquiries[change.Document.Id] = inquiry;
                       }
                       else if (change.ChangeType == DocumentChange.Type.Removed)
                       {
                           _inquiries.TryRemove(change.Document.Id, out _);
                       }
                   }
               });
        }

        public IEnumerable<object> GetCachedInquiries() => _inquiries.Values.OrderByDescending(i => ((DateTime)i.GetType().GetProperty("createdAt")?.GetValue(i)));
    }
}

