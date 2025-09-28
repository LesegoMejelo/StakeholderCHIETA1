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

        // Helper method to generate user-friendly reference numbers
        private string GenerateReferenceNumber(string docId)
        {
            _db = db ;
        }

        // SUBMIT INQUIRY (Client)
        [HttpPost]
        [AllowAnonymous] // allow non-auth users to submit
        [Route("api/inquiry")]
        public async Task<IActionResult> Post([FromForm] string name, [FromForm] string message, [FromForm] string inquiryType)
        {
            try
            {
                name = name,
                message = message,
                inquiryType = inquiryType,
                status = "Pending",
                //assignedAdvisor = "", //  will be set when assigned
                updates = new List<object>
                {
                    var trimmed = line.Trim();
                    if (trimmed.StartsWith("Subject: "))
                        subject = trimmed.Substring(9);
                    else if (trimmed.StartsWith("Description: "))
                        description = trimmed.Substring(13);
                    else if (trimmed.StartsWith("Tags: "))
                        tags = trimmed.Substring(6);
                    else if (trimmed.StartsWith("Desired outcome: "))
                        desiredOutcome = trimmed.Substring(17);
                    else if (trimmed.StartsWith("Related date: "))
                        relatedDate = trimmed.Substring(14);
                    else if (trimmed.Contains("Follow-up call requested: Yes"))
                        followUpCall = true;
                    else if (!trimmed.StartsWith("Subject:") && !trimmed.StartsWith("Description:") &&
                             !trimmed.StartsWith("Tags:") && !trimmed.StartsWith("Desired outcome:") &&
                             !trimmed.StartsWith("Related date:") && !trimmed.Contains("Follow-up call") &&
                             !string.IsNullOrWhiteSpace(trimmed))
                    {
                        // This is probably continuation of description
                        if (!string.IsNullOrEmpty(description))
                            description += " " + trimmed;
                        else
                            description = trimmed;
                    }
                }

            return Ok(new { id = docRef.Id, message = "Inquiry submitted successfully" });
        }

        // CLIENT: View all their inquiries
        [HttpGet]
        [Authorize(Roles = "Client")]
        [Route("api/inquiry/client/{name}")]
        public async Task<IActionResult> GetClientInquiries(string name)
        {
            try
            {
                var snapshot = await _db.Collection("inquiries")
                                        .WhereEqualTo("name", name)
                                        .OrderByDescending("createdAt")
                                        .GetSnapshotAsync();

                var inquiries = snapshot.Documents.Select(doc =>
                {
                    var data = doc.ToDictionary();
                    return new
                    {
                        id = doc.Id,
                        referenceNumber = GenerateReferenceNumber(doc.Id),
                        subject = data.ContainsKey("subject") ? data["subject"] : "N/A",
                        inquiryType = data.ContainsKey("inquiryType") ? data["inquiryType"] : "N/A",
                        status = data.ContainsKey("status") ? data["status"] : "Unknown",
                        createdAt = data.ContainsKey("createdAt") ? data["createdAt"] : null,
                        priority = data.ContainsKey("priority") ? data["priority"] : "Normal",
                        followUpCall = data.ContainsKey("followUpCall") ? data["followUpCall"] : false
                    };
                }).ToList();

                return Ok(inquiries);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetClientInquiries: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // CLIENT: View single inquiry + history
        [HttpGet]
        [Authorize(Roles = "Client")]
        [Route("api/inquiry/{id}")]
        public async Task<IActionResult> GetInquiry(string id)
        {
            try
            {
                var docRef = _db.Collection("inquiries").Document(id);
                var snapshot = await docRef.GetSnapshotAsync();

                if (!snapshot.Exists)
                    return NotFound("Inquiry not found");

                var data = snapshot.ToDictionary();
                var result = new
                {
                    id = snapshot.Id,
                    referenceNumber = GenerateReferenceNumber(snapshot.Id),
                    name = data.ContainsKey("name") ? data["name"] : "",
                    subject = data.ContainsKey("subject") ? data["subject"] : "",
                    description = data.ContainsKey("description") ? data["description"] : "",
                    inquiryType = data.ContainsKey("inquiryType") ? data["inquiryType"] : "",
                    desiredOutcome = data.ContainsKey("desiredOutcome") ? data["desiredOutcome"] : "",
                    relatedDate = data.ContainsKey("relatedDate") ? data["relatedDate"] : "",
                    tags = data.ContainsKey("tags") ? data["tags"] : new string[0],
                    followUpCall = data.ContainsKey("followUpCall") ? data["followUpCall"] : false,
                    status = data.ContainsKey("status") ? data["status"] : "Unknown",
                    priority = data.ContainsKey("priority") ? data["priority"] : "Normal",
                    assignedAdvisor = data.ContainsKey("assignedAdvisor") ? data["assignedAdvisor"] : "",
                    createdAt = data.ContainsKey("createdAt") ? data["createdAt"] : null,
                    updatedAt = data.ContainsKey("updatedAt") ? data["updatedAt"] : null,
                    updates = data.ContainsKey("updates") ? data["updates"] : new List<object>()
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetInquiry: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        [Route("api/inquiry/all")]
        public async Task<IActionResult> GetAllInquiries()
        {
            try
            {
                var snapshot = await _db.Collection("inquiries")
                                       .OrderByDescending("createdAt")
                                       .GetSnapshotAsync();

                var inquiries = snapshot.Documents.Select(doc =>
                {
                    var data = doc.ToDictionary();
                    return new
                    {
                        id = doc.Id,
                        referenceNumber = GenerateReferenceNumber(doc.Id),
                        name = data.ContainsKey("name") ? data["name"] : "N/A",
                        subject = data.ContainsKey("subject") ? data["subject"] : "N/A",
                        inquiryType = data.ContainsKey("inquiryType") ? data["inquiryType"] : "N/A",
                        status = data.ContainsKey("status") ? data["status"] : "Unknown",
                        priority = data.ContainsKey("priority") ? data["priority"] : "Normal",
                        assignedAdvisor = data.ContainsKey("assignedAdvisor") ? data["assignedAdvisor"] : "",
                        createdAt = data.ContainsKey("createdAt") ? data["createdAt"] : null,
                        followUpCall = data.ContainsKey("followUpCall") ? data["followUpCall"] : false
                    };
                }).ToList();

                Console.WriteLine($"Found {inquiries.Count} total inquiries");
                return Ok(inquiries);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetAllInquiries: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Other existing methods remain the same...
        [HttpGet]
        [Authorize(Roles = "Advisor")]
        [Route("api/inquiry/advisor/{advisorId}")]
        public async Task<IActionResult> GetAdvisorInquiries(string advisorId)
        {
            try
            {
                var snapshot = await _db.Collection("inquiries")
                                        .WhereEqualTo("assignedAdvisor", advisorId)
                                        .OrderByDescending("createdAt")
                                        .GetSnapshotAsync();

                var inquiries = snapshot.Documents.Select(doc => new
                {
                    id = doc.Id,
                    data = doc.ToDictionary()
                }).ToList();

                return Ok(inquiries);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetAdvisorInquiries: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
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
            try
            {
                var docRef = _db.Collection("inquiries").Document(id);
                var snapshot = await docRef.GetSnapshotAsync();

                if (!snapshot.Exists) return NotFound("Inquiry not found");

            var inquiry = snapshot.ToDictionary();
            var updates = inquiry.ContainsKey("updates")
                ? ((List<object>)inquiry["updates"]).ToList()
                : new List<object>();

                updates.Add(new Dictionary<string, object>
                {
                    { "status", status },
                    { "updatedBy", updatedBy },
                    { "timestamp", Timestamp.GetCurrentTimestamp() },
                    { "notes", notes ?? "" }
                });

                await docRef.UpdateAsync(new Dictionary<string, object>
                {
                    { "status", status },
                    { "updates", updates },
                    { "updatedAt", Timestamp.GetCurrentTimestamp() }
                });

                Console.WriteLine($"Status updated for inquiry {id} to {status}");
                return Ok(new { message = "Status updated successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in UpdateStatus: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ADMIN: View all inquiries
        [HttpGet]
        [Authorize(Roles = "Admin")]
        [Route("api/inquiry/all")]
        public async Task<IActionResult> GetAllInquiries()
        {
            var snapshot = await _db.Collection("inquiries").GetSnapshotAsync();

                var testData = new Dictionary<string, object>
                {
                    { "test", "This is a test document" },
                    { "timestamp", Timestamp.GetCurrentTimestamp() }
                };

                var docRef = await _db.Collection("test").AddAsync(testData);
                var snapshot = await docRef.GetSnapshotAsync();

        [HttpGet]
        [Route("api/inquiry/user/{userId}")]
        [AllowAnonymous]  // just for debugging, remove when you have auth working
        public async Task<IActionResult> GetUserInquiries(string userId)
        {
            var snapshot = await _db.Collection("inquiries")
                                    .WhereEqualTo("UserId", userId)
                                    .OrderByDescending("createdAt")
                                    .Limit(5)
                                    .GetSnapshotAsync();

            var inquiries = snapshot.Documents.Select(doc => new
            {
                id = doc.Id,
                customId = doc.ContainsField("customId") ? doc.GetValue<string>("customId") : "N/A",
                inquiryType = doc.ContainsField("inquiryType") ? doc.GetValue<string>("inquiryType") : "General",
                status = doc.ContainsField("status") ? doc.GetValue<string>("status") : "Pending",
                createdAt = doc.ContainsField("createdAt")
                    ? doc.GetValue<Timestamp>("createdAt").ToDateTime().ToString("yyyy-MM-dd")
                    : ""
            });

            return Ok(inquiries);
        }

        [HttpPost]
        [AllowAnonymous]
        [Route("api/inquiry")]
        public async Task<IActionResult> Post([FromForm] string name, [FromForm] string message,
                                      [FromForm] string inquiryType, [FromForm] string userId)
        {
            var docRef = await _db.Collection("inquiries").AddAsync(new
            {
                UserId = userId,          // <-- Add this
                name = name,
                message = message,
                inquiryType = inquiryType,
                status = "Pending",
                updates = new List<object>
        {
            new { status = "Pending", updatedBy = "System",
                  timestamp = Timestamp.GetCurrentTimestamp(),
                  notes = "Inquiry submitted" }
        },
                createdAt = Timestamp.GetCurrentTimestamp()
            });

            return Ok(new { id = docRef.Id, message = "Inquiry submitted successfully" });
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