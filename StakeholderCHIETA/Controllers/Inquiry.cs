using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace Staekholder_CHIETA_X.Controllers
{
    [Authorize]
    public class InquiryController : Controller
    {
        private readonly FirestoreDb _db;

        public InquiryController(FirestoreDb db)
        {
            _db = db;
        }

        // IMPROVED: Accept structured form data instead of concatenated message
        [HttpPost]
        [AllowAnonymous]
        [Route("api/inquiry")]
        public async Task<IActionResult> Post(
    [FromForm] string name,          // will be ignored if user is authenticated
    [FromForm] string subject,
    [FromForm] string description,
    [FromForm] string inquiryType,
    [FromForm] string desiredOutcome = "",
    [FromForm] string relatedDate = "",
    [FromForm] string tags = "",
    [FromForm] bool followUpCall = false)
        {
            try
            {
                // Resolve user identity
                var isAuthed = User?.Identity?.IsAuthenticated == true;
                var userId = isAuthed
                    ? (User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.Identity.Name ?? "")
                    : "";
                var userEmail = isAuthed ? (User.FindFirstValue(ClaimTypes.Email) ?? "") : "";
                var displayName = isAuthed
                    ? (User.Identity?.Name
                       ?? User.FindFirstValue(ClaimTypes.GivenName)
                       ?? User.FindFirstValue("name")
                       ?? userEmail
                       ?? "Authenticated User")
                    : (name?.Trim() ?? "Guest");

                // Validation (unchanged apart from no longer trusting client `name`)
                if (string.IsNullOrWhiteSpace(subject)) return BadRequest(new { error = "Subject is required" });
                if (string.IsNullOrWhiteSpace(description)) return BadRequest(new { error = "Description is required" });
                if (string.IsNullOrWhiteSpace(inquiryType)) return BadRequest(new { error = "Inquiry type is required" });

                var tagArray = string.IsNullOrWhiteSpace(tags)
                    ? new string[0]
                    : tags.Split(',').Select(t => t.Trim()).Where(t => !string.IsNullOrEmpty(t)).ToArray();

                var nowTs = Timestamp.GetCurrentTimestamp();

                var inquiryData = new Dictionary<string, object>
        {
            // Keep legacy "name" for backward compatibility:
            { "name", displayName },

            // New normalized creator block (recommended for all future queries):
            { "createdBy", new Dictionary<string, object> {
                { "userId", userId },     // empty string if anonymous
                { "name", displayName },
                { "email", userEmail }
            }},

            { "subject", subject.Trim() },
            { "description", description.Trim() },
            { "inquiryType", inquiryType.Trim() },
            { "desiredOutcome", desiredOutcome?.Trim() ?? "" },
            { "relatedDate", relatedDate?.Trim() ?? "" },
            { "tags", tagArray },
            { "followUpCall", followUpCall },
            { "assignedAdvisor", "" },
            { "createdAt", nowTs },
            { "updatedAt", nowTs },
            { "updates", new List<object> {
                new Dictionary<string, object> {
                    { "status", "Pending" },
                    { "updatedBy", isAuthed ? (displayName ?? "User") : "System" },
                    { "timestamp", nowTs },
                    { "notes", "Inquiry submitted via website" }
                }
            } }
        };

                var docRef = await _db.Collection("inquiries").AddAsync(inquiryData);

                return Ok(new
                {
                    id = docRef.Id,
                    message = "Inquiry submitted successfully",
                    timestamp = DateTime.UtcNow,
                    referenceNumber = GenerateReferenceNumber(docRef.Id)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Internal server error", details = ex.Message });
            }
        }

        // Helper method to generate user-friendly reference numbers
        private string GenerateReferenceNumber(string docId)
        {
            var now = DateTime.UtcNow;
            var datePart = now.ToString("yyMMdd");
            var shortId = docId.Substring(Math.Max(0, docId.Length - 4)).ToUpper();
            return $"INQ-{datePart}-{shortId}";
        }

        // LEGACY: Keep the old endpoint for backward compatibility
        [HttpPost]
        [AllowAnonymous]
        [Route("api/inquiry/legacy")]
        public async Task<IActionResult> PostLegacy([FromForm] string name, [FromForm] string message, [FromForm] string inquiryType)
        {
            try
            {
                // Parse the legacy concatenated message format
                var lines = message.Split('\n', StringSplitOptions.RemoveEmptyEntries);

                string subject = "";
                string description = "";
                string tags = "";
                string desiredOutcome = "";
                string relatedDate = "";
                bool followUpCall = false;

                foreach (var line in lines)
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

                // Call the new structured method
                return await Post(name, subject, description, inquiryType, desiredOutcome, relatedDate, tags, followUpCall);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in PostLegacy method: {ex.Message}");
                return StatusCode(500, new { error = "Internal server error", details = ex.Message });
            }
        }

        // Enhanced view methods with better data structure
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

       /* [HttpGet]
        [Authorize(Roles = "Advisor")]
        [Route("api/inquiry/advisor/{advisorId}")]
        public async Task<IActionResult> GetAdvisorInquiries(string advisorId)
        {
            try
            {
                Console.WriteLine($"GetAdvisorInquiries called with advisorId: {advisorId}");
                Console.WriteLine($"User authenticated: {User.Identity.IsAuthenticated}");
                Console.WriteLine($"User name: {User.Identity.Name}");

                // Try to find by assignedAdvisor field
                var snapshot = await _db.Collection("inquiries")
                                        .WhereEqualTo("assignedAdvisor", advisorId)
                                        .OrderByDescending("createdAt")
                                        .GetSnapshotAsync();

                Console.WriteLine($"Found {snapshot.Documents.Count} documents for advisor: {advisorId}");

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
                        status = GetLatestStatus(data), // Helper method below
                        priority = data.ContainsKey("priority") ? data["priority"] : "Normal",
                        assignedAdvisor = data.ContainsKey("assignedAdvisor") ? data["assignedAdvisor"] : "",
                        createdAt = data.ContainsKey("createdAt") ? data["createdAt"] : null,
                        followUpCall = data.ContainsKey("followUpCall") ? data["followUpCall"] : false
                    };
                }).ToList();

                Console.WriteLine($"Returning {inquiries.Count} inquiries");
                return Ok(inquiries);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetAdvisorInquiries: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { error = ex.Message, details = ex.StackTrace });
            }
        }

        // Helper method to get the latest status from updates array
        private string GetLatestStatus(Dictionary<string, object> data)
        {
            if (!data.ContainsKey("updates")) return "Unknown";

            var updates = data["updates"] as List<object>;
            if (updates == null || updates.Count == 0) return "Unknown";

            var latestUpdate = updates[updates.Count - 1] as Dictionary<string, object>;
            if (latestUpdate != null && latestUpdate.ContainsKey("status"))
            {
                return latestUpdate["status"]?.ToString() ?? "Unknown";
            }

            return "Unknown";
        }
       */
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
                        createdAt = data.ContainsKey("createdAt") ? data["createdAt"] : null,
                        followUpCall = data.ContainsKey("followUpCall") ? data["followUpCall"] : false
                    };
                }).ToList();

                Console.WriteLine($"Found {inquiries.Count} inquiries for advisor {advisorId}");
                return Ok(inquiries);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetAdvisorInquiries: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet]
        [Authorize]
        [Route("api/inquiry/test-advisor")]
        public async Task<IActionResult> TestAdvisorInquiries()
        {
            try
            {
                var currentUserName = User.Identity.Name;
                Console.WriteLine($"Testing for user: {currentUserName}");

                // Get ALL inquiries first to see what we have
                var allSnapshot = await _db.Collection("inquiries")
                                           .Limit(10)
                                           .GetSnapshotAsync();

                Console.WriteLine($"Total inquiries found: {allSnapshot.Documents.Count}");

                var allInquiries = allSnapshot.Documents.Select(doc =>
                {
                    var data = doc.ToDictionary();
                    return new
                    {
                        id = doc.Id,
                        assignedAdvisor = data.ContainsKey("assignedAdvisor") ? data["assignedAdvisor"] : "NOT SET",
                        subject = data.ContainsKey("subject") ? data["subject"] : "N/A"
                    };
                }).ToList();

                return Ok(new
                {
                    currentUser = currentUserName,
                    allInquiries = allInquiries
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }


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

        // Test endpoint
        [HttpGet]
        [AllowAnonymous]
        [Route("api/inquiry/test")]
        public async Task<IActionResult> TestFirestore()
        {
            try
            {
                Console.WriteLine("Testing Firestore connection...");

                var testData = new Dictionary<string, object>
                {
                    { "test", "This is a test document" },
                    { "timestamp", Timestamp.GetCurrentTimestamp() }
                };

                var docRef = await _db.Collection("test").AddAsync(testData);
                var snapshot = await docRef.GetSnapshotAsync();

                if (snapshot.Exists)
                {
                    await docRef.DeleteAsync();
                    return Ok(new
                    {
                        message = "Firestore connection test successful",
                        testDocId = docRef.Id
                    });
                }
                else
                {
                    return StatusCode(500, new { error = "Could not retrieve test document" });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Firestore test failed: {ex.Message}");
                return StatusCode(500, new
                {
                    error = "Firestore connection test failed",
                    details = ex.Message
                });
            }
        }

        // MVC View methods
        public IActionResult Index() => View();
        public IActionResult Inquiry() => View("~/Views/StakeholderViews/Inquiry/Inquiry.cshtml");
        public IActionResult Tracking() => View("~/Views/EmployeeViews/InquiryTracker.cshtml");
    }
}