/*using Google.Cloud.Firestore;
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
        *

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
*/
/*using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace YourNamespace.Controllers
{
    public class InquiriesController : Controller
    {
        private readonly FirestoreDb _db;

        public InquiriesController(FirestoreDb db)
        {
            _db = db;
        }

        // ✅ CLIENT: Submit new inquiry
        [HttpPost]
        [Route("api/inquiry")]
        public async Task<IActionResult> Post([FromForm] string name, [FromForm] string message, [FromForm] string inquiryType)
        {
            string uniqueNumber = "INQ-" + Guid.NewGuid().ToString("N").Substring(0, 4).ToUpper();

            var newInquiry = new
            {
                customId = uniqueNumber,
                name = name,
                message = message,
                inquiryType = inquiryType,
                status = "Pending",
                updates = new List<object>
                {
                    new { status = "Pending", updatedBy = "System", timestamp = Timestamp.GetCurrentTimestamp(), notes = "Inquiry submitted" }
                },
                createdAt = Timestamp.GetCurrentTimestamp()
            };

            var docRef = await _db.Collection("inquiries").AddAsync(newInquiry);

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
                                    .OrderByDescending("createdAt")
                                    .GetSnapshotAsync();

            var inquiries = snapshot.Documents.Select(doc => MapInquiry(doc));

            return Ok(inquiries);
        }

        // ✅ CLIENT: View single inquiry
        [Authorize(Roles = "Client")]
        [HttpGet]
        [Route("api/inquiry/{id}")]
        public async Task<IActionResult> GetInquiry(string id)
        {
            var docRef = _db.Collection("inquiries").Document(id);
            var snapshot = await docRef.GetSnapshotAsync();

            if (!snapshot.Exists) return NotFound("Inquiry not found");

            return Ok(MapInquiry(snapshot));
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
            var updates = inquiry.ContainsKey("updates")
                ? ((IEnumerable<object>)inquiry["updates"]).ToList()
                : new List<object>();

            updates.Add(new
            {
                status,
                updatedBy,
                timestamp = Timestamp.GetCurrentTimestamp(),
                notes
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
            var snapshot = await _db.Collection("inquiries")
                                    .OrderByDescending("createdAt")
                                    .GetSnapshotAsync();

            var inquiries = snapshot.Documents.Select(doc => MapInquiry(doc));

            return Ok(inquiries);
        }

        // ✅ ADVISOR/ADMIN: Get recent inquiries for dashboard
        [Authorize(Roles = "Advisor,Admin")]
        [HttpGet]
        [Route("api/inquiry/recent")]
        public async Task<IActionResult> GetRecentInquiries()
        {
            var snapshot = await _db.Collection("inquiries")
                                    .OrderByDescending("createdAt")
                                    .Limit(5)
                                    .GetSnapshotAsync();

            var inquiries = snapshot.Documents.Select(doc => MapInquiry(doc));

            return Ok(inquiries);
        }

        // 🔹 Views
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

        // 🔹 Helper to map Firestore docs into consistent DTOs
        private object MapInquiry(DocumentSnapshot doc)
        {
            var data = doc.ToDictionary();

            return new
            {
                id = doc.Id,
                customId = data.ContainsKey("customId") ? data["customId"] : "INQ-0000",
                name = data.ContainsKey("name") ? data["name"] : "Unknown",
                inquiryType = data.ContainsKey("inquiryType") ? data["inquiryType"] : "General",
                message = data.ContainsKey("message") ? data["message"] : "",
                status = data.ContainsKey("status") ? data["status"] : "Pending",
                createdAt = data.ContainsKey("createdAt") ? ((Timestamp)data["createdAt"]).ToDateTime() : DateTime.MinValue,
                updates = data.ContainsKey("updates") ? data["updates"] : new List<object>()
            };
        }
    }
}
*/
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StakeholderCHIETA.Services;

namespace StakeholderCHIETA.Controllers
{
    [ApiController]
    [Route("api/inquiry")]
    public class InquiryController : ControllerBase
    {
        private readonly FirestoreDb _db;
        private readonly IInquiryRealtimeService _inquiryRealtimeService;

        public InquiryController(FirestoreDb db, IInquiryRealtimeService inquiryRealtimeService)
        {
            _db = db;
            _inquiryRealtimeService = inquiryRealtimeService;
        }

        // ✅ POST: Create new inquiry
        [HttpPost]
        public async Task<IActionResult> Post([FromForm] string name, [FromForm] string message, [FromForm] string inquiryType)
        {
            string uniqueNumber = "INQ-" + Guid.NewGuid().ToString("N").Substring(0, 4).ToUpper();

            var docRef = await _db.Collection("inquiries").AddAsync(new
            {
                customId = uniqueNumber,
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

        // ✅ CLIENT: Get all their inquiries
        [HttpGet("client/{name}")]
        [Authorize(Roles = "Client")]
        public async Task<IActionResult> GetClientInquiries(string name)
        {
            var snapshot = await _db.Collection("inquiries")
                                    .WhereEqualTo("name", name)
                                    .GetSnapshotAsync();

            var inquiries = snapshot.Documents.Select(doc =>
            {
                var data = doc.ToDictionary();
                return new
                {
                    id = doc.Id,
                    customId = data.ContainsKey("customId") ? data["customId"] : "INQ-0000",
                    name = data.ContainsKey("name") ? data["name"] : "Unknown",
                    inquiryType = data.ContainsKey("inquiryType") ? data["inquiryType"] : "General",
                    status = data.ContainsKey("status") ? data["status"] : "Pending",
                    createdAt = data.ContainsKey("createdAt")
                        ? ((Timestamp)data["createdAt"]).ToDateTime()
                        : DateTime.MinValue,
                    updates = data.ContainsKey("updates") ? data["updates"] : new List<object>()
                };
            });

            return Ok(inquiries);
        }

        // ✅ CLIENT: Get single inquiry
        [HttpGet("{id}")]
        [Authorize(Roles = "Client")]
        public async Task<IActionResult> GetInquiry(string id)
        {
            var docRef = _db.Collection("inquiries").Document(id);
            var snapshot = await docRef.GetSnapshotAsync();

            if (!snapshot.Exists) return NotFound("Inquiry not found");

            return Ok(snapshot.ToDictionary());
        }

        // ✅ ADVISOR/ADMIN: Update inquiry status
        [HttpPost("{id}/status")]
        [Authorize(Roles = "Advisor,Admin")]
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
        // ✅ Client/Stakeholder: Get ONLY their inquiries
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetUserInquiries(string userId)
        {
            var query = _db.Collection("inquiries")  // Use _db, not _firestoreDb
                           .WhereEqualTo("UserId", userId);

            var snapshot = await query.GetSnapshotAsync();

            var inquiries = snapshot.Documents
                .Select(doc => new
                {
                    Id = doc.Id,
                    Data = doc.ToDictionary()
                })
                .ToList();

            return Ok(inquiries);
        }
    


        // ✅ ADMIN: Get all inquiries (static snapshot)
        [HttpGet("all")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllInquiries()
        {
            var snapshot = await _db.Collection("inquiries").GetSnapshotAsync();

            var inquiries = snapshot.Documents.Select(doc =>
            {
                var data = doc.ToDictionary();
                return new
                {
                    id = doc.Id,
                    customId = data.ContainsKey("customId") ? data["customId"] : "INQ-0000",
                    name = data.ContainsKey("name") ? data["name"] : "Unknown",
                    inquiryType = data.ContainsKey("inquiryType") ? data["inquiryType"] : "General",
                    status = data.ContainsKey("status") ? data["status"] : "Pending",
                    createdAt = data.ContainsKey("createdAt")
                        ? ((Timestamp)data["createdAt"]).ToDateTime()
                        : DateTime.MinValue,
                    updates = data.ContainsKey("updates") ? data["updates"] : new List<object>()
                };
            });

            return Ok(inquiries);
        }

        // ✅ ADMIN/ADVISOR: Live inquiries (Realtime cache)
        [HttpGet("live")]
        [Authorize(Roles = "Admin,Advisor")]
        public IActionResult GetLiveInquiries()
        {
            var inquiries = _inquiryRealtimeService.GetCachedInquiries();
            return Ok(inquiries);
        }

        // ✅ ADMIN/ADVISOR: Get 5 most recent inquiries (snapshot)
        [HttpGet("recent")]
        [Authorize(Roles = "Admin,Advisor")]
        public async Task<IActionResult> GetRecentInquiries()
        {
            var snapshot = await _db.Collection("inquiries")
                                    .OrderByDescending("createdAt")
                                    .Limit(5)
                                    .GetSnapshotAsync();

            var inquiries = snapshot.Documents.Select(doc =>
            {
                var data = doc.ToDictionary();
                return new
                {
                    id = doc.Id,
                    customId = data.ContainsKey("customId") ? data["customId"] : "INQ-0000",
                    name = data.ContainsKey("name") ? data["name"] : "Unknown",
                    inquiryType = data.ContainsKey("inquiryType") ? data["inquiryType"] : "General",
                    status = data.ContainsKey("status") ? data["status"] : "Pending",
                    createdAt = data.ContainsKey("createdAt")
                        ? ((Timestamp)data["createdAt"]).ToDateTime()
                        : DateTime.MinValue,
                    updates = data.ContainsKey("updates") ? data["updates"] : new List<object>()
                };
            });

            return Ok(inquiries);
        }

        // 🔹 Views (if you’re serving Razor pages)
        public IActionResult Index() => View();

        private IActionResult View()
        {
            throw new NotImplementedException();
        }

        private IActionResult View(string v)
        {
            throw new NotImplementedException();
        }

        public IActionResult Inquiry() => View("~/Views/StakeholderViews/Inquiry/Inquiry.cshtml");
        public IActionResult Tracking() => View("~/Views/Inquiry/Tracking.cshtml");
    }
}
