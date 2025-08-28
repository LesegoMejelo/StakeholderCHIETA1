/*
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;

namespace Staekholder_CHIETA_X.Controllers
{


    public class InquiryController : Controller
    {
        private readonly FirestoreDb _db;

        public InquiryController(FirestoreDb db)
        {
            _db = db;
        }


        [HttpPost]
        [Route("api/inquiry")]
        public async Task<IActionResult> Post([FromForm] string name, [FromForm] string message, [FromForm] string inquiryType)
        {
            var docRef = await _db.Collection("inquiries").AddAsync(new
            {
                name = name,
                message = message,
                inquiryType = inquiryType,
                createdAt = Timestamp.GetCurrentTimestamp()
            });

            return Ok(new { id = docRef.Id, message = "Inquiry submitted" });
        }
        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Inquiry()
        {
            return View("~/Views/Inquiry/Inquiry.cshtml");
        }
    }
}
*/
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Staekholder_CHIETA_X.Controllers
{
    public class InquiryController : Controller
    {
        private readonly FirestoreDb _db;

        public InquiryController(FirestoreDb db)
        {
            _db = db;
        }

        // ✅ SUBMIT INQUIRY (Already working)
        [HttpPost]
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

        // 🔹 VIEWS
        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Inquiry()
        {
            return View("~/Views/Inquiry/Inquiry.cshtml");
        }

        public IActionResult Tracking()
        {
            return View("~/Views/Inquiry/Tracking.cshtml");
        }
    }
}
