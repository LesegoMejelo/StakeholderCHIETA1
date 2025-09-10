using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StakeholderCHIETA.Controllers
{
    public class InquiryController : Controller
    {
        private readonly FirestoreDb _db;

        public InquiryController(FirestoreDb db)
        {
            _db = db;
        }

        // ✅ SUBMIT INQUIRY (Already working)
        /*[HttpPost]
        [Route("api/inquiry")]
        public async Task<IActionResult> Post([FromForm] string name, [FromForm] string message, [FromForm] string inquiryType)
        {
            var docRef = await _db.Collection("inquiries").AddAsync(new
            {
                name = name,
                message = message,
                inquiryType = inquiryType,
                status = "Pending", // 🔹 Default for new inquiries
                updates = new List<object>
                {
                    new { status = "Pending", updatedBy = "System", timestamp = Timestamp.GetCurrentTimestamp(), notes = "Inquiry submitted" }
                },
                createdAt = Timestamp.GetCurrentTimestamp()
            });

            return Ok(new { id = docRef.Id, message = "Inquiry submitted" });
        }
        */

        [HttpPost]
        [Route("api/inquiry")]
        public async Task<IActionResult> Post([FromForm] string name, [FromForm] string message, [FromForm] string inquiryType)
        {
            // Use GUID to guarantee uniqueness
            string uniqueNumber = "INQ-" + Guid.NewGuid().ToString("N").Substring(0, 4).ToUpper();

            var docRef = await _db.Collection("inquiries").AddAsync(new
            {
                customId = uniqueNumber,  // <-- store the unique ID
                name = name,
                message = message,
                inquiryType = inquiryType,
                status = "Pending",
                updates = new List<object>
        {
            new { status = "Pending", updatedBy = "System", timestamp = Timestamp.GetCurrentTimestamp(), notes = "Inquiry submitted" }
        },
                createdAt = Timestamp.GetCurrentTimestamp()
            });

            return Ok(new { id = docRef.Id, customId = uniqueNumber, message = "Inquiry submitted" });
        }

        // ✅ CLIENT: View all their inquiries
        [HttpGet]
        [Authorize(Roles = "Client")]
        [Route("api/inquiry/client/{name}")]
        public async Task<IActionResult> GetClientInquiries(string name)
        {
            var snapshot = await _db.Collection("inquiries")
                                    .WhereEqualTo("name", name)
                                    .GetSnapshotAsync();

            var inquiries = snapshot.Documents.Select(doc => new
            {
                id = doc.Id,
                data = doc.ToDictionary()
            });

            return Ok(inquiries);
        }

        // ✅ CLIENT: View single inquiry + history
        [Authorize(Roles = "Client")]
        [HttpGet]
        [Route("api/inquiry/{id}")]
        public async Task<IActionResult> GetInquiry(string id)
        {
            var docRef = _db.Collection("inquiries").Document(id);
            var snapshot = await docRef.GetSnapshotAsync();

            if (!snapshot.Exists) return NotFound("Inquiry not found");

            return Ok(snapshot.ToDictionary());
        }

        // ✅ ADVISOR/ADMIN: Update inquiry status
        [Authorize(Roles = "Advisor,Admin")]
        [HttpPost]
        [Route("api/inquiry/{id}/status")]
        public async Task<IActionResult> UpdateStatus(string id, [FromForm] string status, [FromForm] string updatedBy, [FromForm] string notes)
        {
            var docRef = _db.Collection("inquiries").Document(id);
            var snapshot = await docRef.GetSnapshotAsync();

            if (!snapshot.Exists) return NotFound("Inquiry not found");

            var inquiry = snapshot.ToDictionary();
            var updates = inquiry.ContainsKey("updates") ? (List<object>)inquiry["updates"] : new List<object>();

            updates.Add(new
            {
                status = status,
                updatedBy = updatedBy,
                timestamp = Timestamp.GetCurrentTimestamp(),
                notes = notes
            });

            await docRef.UpdateAsync(new Dictionary<string, object>
            {
                { "status", status },
                { "updates", updates }
            });

            return Ok(new { message = "Status updated successfully" });
        }

        // ✅ ADMIN: View all inquiries
        [Authorize(Roles = "Admin")]
        [HttpGet]
        [Route("api/inquiry/all")]
        public async Task<IActionResult> GetAllInquiries()
        {
            var snapshot = await _db.Collection("inquiries").GetSnapshotAsync();

            var inquiries = snapshot.Documents.Select(doc => new
            {
                id = doc.Id,
                data = doc.ToDictionary()
            });

            return Ok(inquiries);
        }
        // ✅ ADVISOR/ADMIN: Get recent inquiries for dashboard (just added)
        [Authorize(Roles = "Advisor,Admin")]
        [HttpGet]
        [Route("api/inquiry/recent")]
        public async Task<IActionResult> GetRecentInquiries()
        {
            var snapshot = await _db.Collection("inquiries")
                                    .OrderByDescending("createdAt")
                                    .Limit(5)
                                    .GetSnapshotAsync();

            var inquiries = snapshot.Documents.Select(doc => new
            {
                id = doc.Id,  // Firestore doc ID (optional)
                customId = doc.ContainsField("customId") ? doc.GetValue<string>("customId") : "INQ-0000",
                name = doc.ContainsField("name") ? doc.GetValue<string>("name") : "Unknown",
                inquiryType = doc.ContainsField("inquiryType") ? doc.GetValue<string>("inquiryType") : "General",
                status = doc.ContainsField("status") ? doc.GetValue<string>("status") : "Pending",
                createdAt = doc.ContainsField("createdAt") ? doc.GetValue<Timestamp>("createdAt").ToDateTime() : DateTime.MinValue
            });

            return Ok(inquiries);
        }



        // 🔹 VIEWS
        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Inquiry()
        {
            return View("~/Views/StakeholderViews/Inquiry/Inquiry.cshtml");
        }

        public IActionResult Tracking()
        {
            return View("~/Views/Inquiry/Tracking.cshtml");
        }
    }
}
