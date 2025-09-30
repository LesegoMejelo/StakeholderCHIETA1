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

        // GET: Fetch all advisors for dropdown
        [HttpGet]
        [AllowAnonymous]
        [Route("api/inquiry/advisors")]
        public async Task<IActionResult> GetAdvisors()
        {
            try
            {
                // Fetch from Users collection where Role = "Advisor"
                var snapshot = await _db.Collection("Users")
                                        .WhereEqualTo("Role", "Advisor")
                                        .GetSnapshotAsync();

                var advisors = snapshot.Documents.Select(doc => new
                {
                    id = doc.Id,
                    name = doc.ContainsField("Name") ? doc.GetValue<string>("Name") : "Unknown"
                }).ToList();

                return Ok(advisors);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetAdvisors: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // POST: Create inquiry with advisor assignment
        [HttpPost]
        [AllowAnonymous]
        [Route("api/inquiry")]
        public async Task<IActionResult> Post(
            [FromForm] string name,
            [FromForm] string subject,
            [FromForm] string description,
            [FromForm] string inquiryType,
            [FromForm] string desiredOutcome = "",
            [FromForm] string relatedDate = "",
            [FromForm] string tags = "",
            [FromForm] bool followUpCall = false,
            [FromForm] string assignedAdvisorId = "",
            [FromForm] string assignedAdvisorName = "")
        {
            try
            {
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

                if (string.IsNullOrWhiteSpace(subject)) return BadRequest(new { error = "Subject is required" });
                if (string.IsNullOrWhiteSpace(description)) return BadRequest(new { error = "Description is required" });
                if (string.IsNullOrWhiteSpace(inquiryType)) return BadRequest(new { error = "Inquiry type is required" });

                var tagArray = string.IsNullOrWhiteSpace(tags)
                    ? new string[0]
                    : tags.Split(',').Select(t => t.Trim()).Where(t => !string.IsNullOrEmpty(t)).ToArray();

                var nowTs = Timestamp.GetCurrentTimestamp();

                var inquiryData = new Dictionary<string, object>
                {
                    { "name", displayName },
                    { "createdBy", new Dictionary<string, object> {
                        { "userId", userId },
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
                    { "assignedAdvisorId", assignedAdvisorId?.Trim() ?? "" },
                    { "assignedAdvisor", assignedAdvisorName?.Trim() ?? "" },
                    { "status", "Pending" },
                    { "createdAt", nowTs },
                    { "updatedAt", nowTs },
                    { "updates", new List<object> {
                        new Dictionary<string, object> {
                            { "status", "Pending" },
                            { "updatedBy", isAuthed ? (displayName ?? "User") : "System" },
                            { "timestamp", nowTs },
                            { "notes", "Inquiry submitted via website" }
                        }
                    }}
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

        private string GenerateReferenceNumber(string docId)
        {
            var now = DateTime.UtcNow;
            var datePart = now.ToString("yyMMdd");
            var shortId = docId.Substring(Math.Max(0, docId.Length - 4)).ToUpper();
            return $"INQ-{datePart}-{shortId}";
        }

        // GET: Advisor-specific inquiries
        [HttpGet]
        [Authorize(Roles = "Advisor")]
        [Route("api/inquiry")]
        public async Task<IActionResult> GetMyInquiries()
        {
            try
            {
                var advisorId = User.FindFirstValue(ClaimTypes.NameIdentifier);

                if (string.IsNullOrEmpty(advisorId))
                    return Unauthorized(new { error = "Could not identify advisor" });

                var snapshot = await _db.Collection("inquiries")
                                        .WhereEqualTo("assignedAdvisorId", advisorId)
                                        .OrderByDescending("createdAt")
                                        .GetSnapshotAsync();

                var inquiries = snapshot.Documents.Select(doc =>
                {
                    var data = doc.ToDictionary();

                    // Extract creator info
                    var createdBy = data.ContainsKey("createdBy")
                        ? data["createdBy"] as Dictionary<string, object>
                        : null;

                    string userName = createdBy?.ContainsKey("name") == true
                        ? createdBy["name"]?.ToString() ?? ""
                        : (data.ContainsKey("name") ? data["name"]?.ToString() ?? "" : "");

                    string userEmail = createdBy?.ContainsKey("email") == true
                        ? createdBy["email"]?.ToString() ?? ""
                        : "";

                    return new
                    {
                        id = doc.Id,
                        reference = GenerateReferenceNumber(doc.Id),
                        category = data.ContainsKey("inquiryType") ? data["inquiryType"] : "N/A",
                        subject = data.ContainsKey("subject") ? data["subject"] : "N/A",
                        description = data.ContainsKey("description") ? data["description"] : "",
                        desired = data.ContainsKey("desiredOutcome") ? data["desiredOutcome"] : "",
                        tags = data.ContainsKey("tags") ? data["tags"] : new string[0],
                        status = data.ContainsKey("status") ? data["status"] : "Pending",
                        date = data.ContainsKey("createdAt") ? data["createdAt"] : null,
                        callback = data.ContainsKey("followUpCall") ? data["followUpCall"] : false,
                        attachments = data.ContainsKey("attachments") ? data["attachments"] : new List<object>(),
                        updates = data.ContainsKey("updates") ? data["updates"] : new List<object>(),
                        userName = userName,
                        userEmail = userEmail,
                        assignedTo = data.ContainsKey("assignedAdvisor") ? data["assignedAdvisor"] : ""
                    };
                }).ToList();

                return Ok(inquiries);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetMyInquiries: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // PUT: Update inquiry status
        [HttpPut]
        [Authorize(Roles = "Advisor,Admin")]
        [Route("api/inquiry/{reference}")]
        public async Task<IActionResult> UpdateInquiry(string reference, [FromBody] Dictionary<string, object> updateData)
        {
            try
            {
                var advisorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var advisorName = User.Identity?.Name ?? "Advisor";

                // Find the inquiry by scanning for matching reference
                var allInquiries = await _db.Collection("inquiries").GetSnapshotAsync();
                var doc = allInquiries.Documents.FirstOrDefault(d =>
                    GenerateReferenceNumber(d.Id) == reference);

                if (doc == null)
                    return NotFound(new { error = "Inquiry not found" });

                var docRef = _db.Collection("inquiries").Document(doc.Id);
                var inquiry = doc.ToDictionary();

                // Verify advisor owns this inquiry (unless admin)
                var isAdmin = User.IsInRole("Admin");
                if (!isAdmin)
                {
                    var assignedAdvisorId = inquiry.ContainsKey("assignedAdvisorId")
                        ? inquiry["assignedAdvisorId"]?.ToString()
                        : "";

                    if (assignedAdvisorId != advisorId)
                        return Forbid();
                }

                // Prepare update
                var updates = inquiry.ContainsKey("updates")
                    ? ((List<object>)inquiry["updates"]).ToList()
                    : new List<object>();

                var newStatus = updateData.ContainsKey("status")
                    ? updateData["status"]?.ToString()
                    : inquiry.ContainsKey("status") ? inquiry["status"]?.ToString() : "Pending";

                var notes = updateData.ContainsKey("internalNotes")
                    ? updateData["internalNotes"]?.ToString()
                    : "";

                updates.Add(new Dictionary<string, object>
                {
                    { "status", newStatus },
                    { "updatedBy", advisorName },
                    { "timestamp", Timestamp.GetCurrentTimestamp() },
                    { "notes", notes }
                });

                var updateDict = new Dictionary<string, object>
                {
                    { "status", newStatus },
                    { "updates", updates },
                    { "updatedAt", Timestamp.GetCurrentTimestamp() }
                };

                // Update assignedTo if provided (admin only or reassignment)
                if (updateData.ContainsKey("assignedTo"))
                {
                    var newAssignedId = updateData["assignedTo"]?.ToString() ?? "";
                    if (!string.IsNullOrEmpty(newAssignedId))
                    {
                        // If reassigning, get the new advisor's name
                        var advisorDoc = await _db.Collection("Users").Document(newAssignedId).GetSnapshotAsync();
                        if (advisorDoc.Exists)
                        {
                            var advisorData = advisorDoc.ToDictionary();
                            var newAdvisorName = advisorData.ContainsKey("Name")
                                ? advisorData["Name"]?.ToString()
                                : "Unknown Advisor";

                            updateDict["assignedAdvisorId"] = newAssignedId;
                            updateDict["assignedAdvisor"] = newAdvisorName;
                        }
                    }
                }

                await docRef.UpdateAsync(updateDict);

                return Ok(new { message = "Inquiry updated successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in UpdateInquiry: {ex.Message}");
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
                    return Ok(new { message = "Firestore connection test successful", testDocId = docRef.Id });
                }
                return StatusCode(500, new { error = "Could not retrieve test document" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Firestore connection test failed", details = ex.Message });
            }
        }

        public IActionResult Index() => View();
        public IActionResult Inquiry() => View("~/Views/StakeholderViews/Inquiry/Inquiry.cshtml");
        public IActionResult Tracking() => View("~/Views/EmployeeViews/InquiryTracker.cshtml");
        public IActionResult Feedback()
        {
            return View("~/Views/StakeholderViews/StakeholderFeedback.cshtml");
        }
    }
}