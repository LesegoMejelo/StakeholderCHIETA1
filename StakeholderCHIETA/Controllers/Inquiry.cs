using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Staekholder_CHIETA_X.Controllers
{
    [Authorize] // all endpoints require login by default
    public class InquiryController : Controller
    {
        private readonly FirestoreDb _db;

        public InquiryController(FirestoreDb db)
        {
            _db = db ;
        }

        // SUBMIT INQUIRY (Client)
        [HttpPost]
        [AllowAnonymous] // allow non-auth users to submit
        [Route("api/inquiry")]
        public async Task<IActionResult> Post([FromForm] string name, [FromForm] string message, [FromForm] string inquiryType)
        {
            var docRef = await _db.Collection("inquiries").AddAsync(new
            {
                name = name,
                message = message,
                inquiryType = inquiryType,
                status = "Pending",
                //assignedAdvisor = "", //  will be set when assigned
                updates = new List<object>
                {
                    new { status = "Pending", updatedBy = "System", timestamp = Timestamp.GetCurrentTimestamp(), notes = "Inquiry submitted" }
                },
                createdAt = Timestamp.GetCurrentTimestamp()
            });

            return Ok(new { id = docRef.Id, message = "Inquiry submitted successfully" });
        }

        // CLIENT: View all their inquiries
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

        // CLIENT: View single inquiry + history
        [HttpGet]
        [Authorize(Roles = "Client")]
        [Route("api/inquiry/{id}")]
        public async Task<IActionResult> GetInquiry(string id)
        {
            var docRef = _db.Collection("inquiries").Document(id);
            var snapshot = await docRef.GetSnapshotAsync();

            if (!snapshot.Exists) return NotFound("Inquiry not found");

            return Ok(snapshot.ToDictionary());
        }

        // ADVISOR: View inquiries assigned to them
        [HttpGet]
        [Authorize(Roles = "Advisor")]
        [Route("api/inquiry/advisor/{advisorId}")]
        public async Task<IActionResult> GetAdvisorInquiries(string advisorId)
        {
            var snapshot = await _db.Collection("inquiries")
                                    .WhereEqualTo("assignedAdvisor", advisorId)
                                    .GetSnapshotAsync();

            var inquiries = snapshot.Documents.Select(doc => new
            {
                id = doc.Id,
                data = doc.ToDictionary()
            });

            return Ok(inquiries);
        }

        // ADVISOR/ADMIN: Update inquiry status
        [HttpPost]
        [Authorize(Roles = "Advisor,Admin")]
        [Route("api/inquiry/{id}/status")]
        public async Task<IActionResult> UpdateStatus(string id, [FromForm] string status, [FromForm] string updatedBy, [FromForm] string notes)
        {
            var docRef = _db.Collection("inquiries").Document(id);
            var snapshot = await docRef.GetSnapshotAsync();

            if (!snapshot.Exists) return NotFound("Inquiry not found");

            var inquiry = snapshot.ToDictionary();
            var updates = inquiry.ContainsKey("updates")
                ? ((List<object>)inquiry["updates"]).ToList()
                : new List<object>();

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

        // ADMIN: View all inquiries
        [HttpGet]
        [Authorize(Roles = "Admin")]
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
            return View("~/Views/EmployeeViews/InquiryTracker.cshtml");
        }

    }
}
