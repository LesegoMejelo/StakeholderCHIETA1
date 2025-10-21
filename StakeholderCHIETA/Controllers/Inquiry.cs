using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StakeholderCHIETA.Services;
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
        private readonly IEmailService _emailService;

        public InquiryController(FirestoreDb db, IEmailService emailService)
        {
            _db = db;
            _emailService = emailService;
        }

        // GET: Fetch all advisors for dropdown
        [HttpGet]
        [AllowAnonymous]
        [Route("api/inquiry/advisors")]
        public async Task<IActionResult> GetAdvisors()
        {
            try
            {
                var snapshot = await _db.Collection("Users")
                                        .WhereEqualTo("Role", "Advisor")
                                        .GetSnapshotAsync();

                var advisors = snapshot.Documents.Select(doc => new
                {
                    id = doc.Id,
                    name = doc.ContainsField("Name") ? doc.GetValue<string>("Name") : "Unknown"
                }).ToList();

                // Add logging to see what's being returned
                Console.WriteLine($"Found {advisors.Count} advisors:");
                foreach (var adv in advisors)
                {
                    Console.WriteLine($"  ID: {adv.id}, Name: {adv.name}");
                }

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
                var userEmailLower = (userEmail ?? "").Trim().ToLowerInvariant();

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
                    ? Array.Empty<string>()
                    : tags.Split(',').Select(t => t.Trim()).Where(t => !string.IsNullOrEmpty(t)).ToArray();

                // ---- Resolve advisor email/name from Users ----
                string assignedAdvisorEmail = "";
                assignedAdvisorId = (assignedAdvisorId ?? "").Trim();
                assignedAdvisorName = (assignedAdvisorName ?? "").Trim();

                if (!string.IsNullOrEmpty(assignedAdvisorId))
                {
                    var advDoc = await _db.Collection("Users").Document(assignedAdvisorId).GetSnapshotAsync();
                    if (advDoc.Exists)
                    {
                        var adv = advDoc.ToDictionary();
                        if (string.IsNullOrWhiteSpace(assignedAdvisorName) && adv.TryGetValue("Name", out var nm))
                            assignedAdvisorName = nm?.ToString() ?? assignedAdvisorName;

                        if (adv.TryGetValue("email", out var ev))
                            assignedAdvisorEmail = ev?.ToString() ?? "";
                    }
                }
                else if (!string.IsNullOrEmpty(assignedAdvisorName))
                {
                    // Optional fallback: if only name is provided, try to find the user by Name to get Id/Email
                    var byNameSnap = await _db.Collection("Users")
                                              .WhereEqualTo("Name", assignedAdvisorName)
                                              .Limit(1)
                                              .GetSnapshotAsync();

                    var match = byNameSnap.Documents.FirstOrDefault();
                    if (match != null)
                    {
                        assignedAdvisorId = match.Id;
                        var adv = match.ToDictionary();
                        if (adv.TryGetValue("email", out var ev))
                            assignedAdvisorEmail = ev?.ToString() ?? "";
                    }
                }

                assignedAdvisorEmail = (assignedAdvisorEmail ?? "").Trim().ToLowerInvariant();

                var nowTs = Timestamp.GetCurrentTimestamp();

                var inquiryData = new Dictionary<string, object>
        {
                { "name", displayName },
                { "createdBy", new Dictionary<string, object> {
                { "userId", userId },
                { "name", displayName },
                { "email", userEmail }
            }},
            { "createdByEmailLower", userEmailLower }, // <-- NEW, flat field for easy querying

            { "subject", subject.Trim() },
            { "description", description.Trim() },
            { "inquiryType", inquiryType.Trim() },
            { "desiredOutcome", desiredOutcome?.Trim() ?? "" },
            { "relatedDate", relatedDate?.Trim() ?? "" },
            { "tags", tagArray },
            { "followUpCall", followUpCall },

            // Advisor fields (now with email too)
            { "assignedAdvisorId", assignedAdvisorId },
            { "assignedAdvisor", assignedAdvisorName },
            { "assignedAdvisorEmail", assignedAdvisorEmail },

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

        [HttpGet]
        [Authorize(Roles = "Advisor")]
        [Route("api/inquiry")]
        public async Task<IActionResult> GetMyInquiries()
        {
            try
            {
                // Collect possible advisor identifiers from claims
                var advisorId = User.FindFirstValue(ClaimTypes.NameIdentifier)?.Trim();
                var advisorEmail = User.FindFirstValue(ClaimTypes.Email)?.Trim()?.ToLowerInvariant();
                var advisorName = (User.Identity?.Name ?? "").Trim();

                if (string.IsNullOrEmpty(advisorId) && string.IsNullOrEmpty(advisorEmail) && string.IsNullOrEmpty(advisorName))
                    return Unauthorized(new { error = "Could not identify advisor" });

                var col = _db.Collection("inquiries");

                // Run up to three queries (Firestore has no OR), then merge & dedupe
                var tasks = new List<Task<QuerySnapshot>>();

                // 1) By stored advisorId
                if (!string.IsNullOrEmpty(advisorId))
                    tasks.Add(col.WhereEqualTo("assignedAdvisorId", advisorId).Limit(200).GetSnapshotAsync());

                // 2) By stored advisor email (normalize lowercase)
                if (!string.IsNullOrEmpty(advisorEmail))
                    tasks.Add(col.WhereEqualTo("assignedAdvisorEmail", advisorEmail).Limit(200).GetSnapshotAsync());

                // 3) By display name (only if present)
                if (!string.IsNullOrEmpty(advisorName))
                    tasks.Add(col.WhereEqualTo("assignedAdvisor", advisorName).Limit(200).GetSnapshotAsync());

                var snaps = await Task.WhenAll(tasks);

                var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var items = new List<dynamic>();

                foreach (var snap in snaps)
                {
                    foreach (var doc in snap.Documents)
                    {
                        if (!seen.Add(doc.Id)) continue;

                        var data = doc.ToDictionary();

                        // createdAt -> DateTime?
                        DateTime? createdAt = null;
                        if (data.TryGetValue("createdAt", out var ca))
                        {
                            if (ca is Timestamp ts) createdAt = ts.ToDateTime();
                            else if (ca is DateTime dt) createdAt = dt;
                        }

                        // status: prefer last update
                        string status = "Pending";
                        if (data.TryGetValue("updates", out var u) && u is IEnumerable<object> arr)
                        {
                            Dictionary<string, object>? last = null;
                            foreach (var itm in arr) last = itm as Dictionary<string, object>;
                            if (last != null && last.TryGetValue("status", out var s)) status = s?.ToString() ?? status;
                        }
                        if (status == "Pending" && data.TryGetValue("status", out var stTop))
                            status = stTop?.ToString() ?? status;

                        items.Add(new
                        {
                            id = doc.Id,
                            reference = GenerateReferenceNumber(doc.Id),
                            subject = data.TryGetValue("subject", out var subj) ? subj?.ToString() ?? "N/A" : "N/A",
                            inquiryType = data.TryGetValue("inquiryType", out var it) ? it?.ToString() ?? "N/A" : "N/A",
                            description = data.TryGetValue("description", out var desc) ? desc?.ToString() ?? "No description provided" : "No description provided",
                            desiredOutcome = data.TryGetValue("desiredOutcome", out var desired) ? desired?.ToString() ?? "Not specified" : "Not specified",
                            tags = data.TryGetValue("tags", out var t) && t is IEnumerable<object> tarr ? tarr.Select(x => x?.ToString() ?? "").ToArray() : Array.Empty<string>(),
                            status,
                            priority = data.TryGetValue("priority", out var pr) ? pr?.ToString() ?? "Normal" : "Normal",
                            date = createdAt,
                            followUpCall = data.TryGetValue("followUpCall", out var f) && f is bool b && b,
                            userName = (data.TryGetValue("createdBy", out var cb) && cb is Dictionary<string, object> cbd && cbd.TryGetValue("name", out var nm))
                                       ? nm?.ToString() ?? "" : (data.TryGetValue("name", out var nm2) ? nm2?.ToString() ?? "" : ""),
                            userEmail = (data.TryGetValue("createdBy", out var cbe) && cbe is Dictionary<string, object> cbed && cbed.TryGetValue("email", out var em))
                                       ? em?.ToString() ?? "" : "",
                            assignedTo = data.TryGetValue("assignedAdvisor", out var aa) ? aa?.ToString() ?? "" : "",
                            attachments = data.TryGetValue("attachments", out var att) && att is IEnumerable<object> atarr ? atarr : new List<object>()
                        });
                    }
                }

                // Sort newest first server-side (no Firestore index needed)
                var ordered = items.OrderByDescending(x => (DateTime?)(x.date) ?? DateTime.MinValue)
                                   .Take(50)
                                   .ToList();

                return Ok(ordered);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetMyInquiries (flex): {ex.Message}");
                return StatusCode(500, new { error = "Failed to load inquiries" });
            }
        }
        [HttpGet]
        [Authorize] // stakeholder must be signed in 
        [Route("api/inquiry/stakeholder")]
        public async Task<IActionResult> GetMyStakeholderInquiries()
        {
            try
            {
                var stakeUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)?.Trim();
                var stakeEmail = User.FindFirstValue(ClaimTypes.Email)?.Trim();
                var stakeEmailLow = (stakeEmail ?? "").ToLowerInvariant();
                var stakeName = (User.Identity?.Name ?? "").Trim();

                if (string.IsNullOrEmpty(stakeUserId) && string.IsNullOrEmpty(stakeEmailLow) && string.IsNullOrEmpty(stakeName))
                    return Unauthorized(new { error = "Could not identify stakeholder" });

                var col = _db.Collection("inquiries");
                var jobs = new List<Task<QuerySnapshot>>();

                // 1) Prefer normalized email
                if (!string.IsNullOrEmpty(stakeEmailLow))
                    jobs.Add(col.WhereEqualTo("createdByEmailLower", stakeEmailLow).Limit(200).GetSnapshotAsync());

                // 2) Fallback: createdBy.userId (nested)
                if (!string.IsNullOrEmpty(stakeUserId))
                    jobs.Add(col.WhereEqualTo(new FieldPath("createdBy", "userId"), stakeUserId).Limit(200).GetSnapshotAsync());

                // 3) Fallback: top-level 'name' (legacy)
                if (!string.IsNullOrEmpty(stakeName))
                    jobs.Add(col.WhereEqualTo("name", stakeName).Limit(200).GetSnapshotAsync());

                var snaps = await Task.WhenAll(jobs);

                var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var items = new List<object>();

                foreach (var snap in snaps)
                {
                    foreach (var doc in snap.Documents)
                    {
                        if (!seen.Add(doc.Id)) continue;
                        var data = doc.ToDictionary();

                        DateTime? createdAt = null;
                        if (data.TryGetValue("createdAt", out var ca))
                        {
                            if (ca is Timestamp ts) createdAt = ts.ToDateTime();
                            else if (ca is DateTime dt) createdAt = dt;
                        }

                        // status: prefer last update
                        string status = data.TryGetValue("status", out var stTop) ? stTop?.ToString() ?? "Pending" : "Pending";
                        if (data.TryGetValue("updates", out var u) && u is IEnumerable<object> arr)
                        {
                            Dictionary<string, object>? last = null;
                            foreach (var itm in arr) last = itm as Dictionary<string, object>;
                            if (last != null && last.TryGetValue("status", out var s)) status = s?.ToString() ?? status;
                        }

                        items.Add(new
                        {
                            id = doc.Id,
                            reference = GenerateReferenceNumber(doc.Id),
                            subject = data.TryGetValue("subject", out var subj) ? subj?.ToString() ?? "N/A" : "N/A",
                            inquiryType = data.TryGetValue("inquiryType", out var it) ? it?.ToString() ?? "N/A" : "N/A",
                            status,
                            date = createdAt,
                            assignedTo = data.TryGetValue("assignedAdvisor", out var aa) ? aa?.ToString() ?? "" : "",
                        });
                    }
                }

                var ordered = items.OrderByDescending(x => (DateTime?)(x.GetType().GetProperty("date")?.GetValue(x) ?? DateTime.MinValue))
                                   .Take(50)
                                   .ToList();

                return Ok(ordered);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetMyStakeholderInquiries: {ex.Message}");
                return StatusCode(500, new { error = "Failed to load stakeholder inquiries" });
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

                // Send confirmation email if status is Accepted
                if (string.Equals(newStatus, "Accepted", StringComparison.OrdinalIgnoreCase))
                {
                    // Try to get requester email and name
                    string requesterEmail = null;
                    string requesterName = null;
                    if (inquiry.TryGetValue("createdBy", out var createdByObj) && createdByObj is Dictionary<string, object> createdByDict)
                    {
                        if (createdByDict.TryGetValue("email", out var emailObj))
                            requesterEmail = emailObj?.ToString();
                        if (createdByDict.TryGetValue("name", out var nameObj))
                            requesterName = nameObj?.ToString();
                    }
                    else if (inquiry.TryGetValue("createdByEmailLower", out var emailLowerObj))
                    {
                        requesterEmail = emailLowerObj?.ToString();
                    }
                    if (string.IsNullOrWhiteSpace(requesterName) && inquiry.TryGetValue("name", out var nameFallback))
                        requesterName = nameFallback?.ToString();

                    if (!string.IsNullOrWhiteSpace(requesterEmail))
                    {
                        var referenceNumber = GenerateReferenceNumber(doc.Id);
                        var subject = inquiry.TryGetValue("subject", out var subjObj) ? subjObj?.ToString() : "Your Appointment Request";
                        var advisor = inquiry.TryGetValue("assignedAdvisor", out var advObj) ? advObj?.ToString() : advisorName;
                        var inquiryType = inquiry.TryGetValue("inquiryType", out var typeObj) ? typeObj?.ToString() : "";
                        var htmlBody = $@"
                            <h2>Appointment Confirmed</h2>
                            <p>Dear {requesterName},</p>
                            <p>Your appointment request has been <b>accepted</b> by advisor <b>{advisor}</b>.</p>
                            <ul>
                                <li><strong>Reference Number:</strong> {referenceNumber}</li>
                                <li><strong>Subject:</strong> {subject}</li>
                                <li><strong>Type:</strong> {inquiryType}</li>
                                <li><strong>Status:</strong> Accepted</li>
                                <li><strong>Advisor:</strong> {advisor}</li>
                            </ul>
                            <p>You will be contacted soon with further details.</p>
                            <p>Best regards,<br>CHIETA Team</p>";
                        try
                        {
                            await _emailService.SendEmailAsync(requesterEmail, "Your Appointment Has Been Accepted", htmlBody);
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Failed to send confirmation email: {ex.Message}");
                        }
                    }
                }

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

        // GET /api/inquiry/mine?status=All|Pending|In%20Progress|Closed&category=All|Bursaries|...&q=text
        [HttpGet]
        [Authorize(Roles = "Advisor,Admin")]
        [Route("api/inquiry/mine")]
        public async Task<IActionResult> GetMine([FromQuery] string status = "All",
                                                 [FromQuery] string category = "All",
                                                 [FromQuery] string q = "")
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var emailL = (User.FindFirstValue(ClaimTypes.Email) ?? "").Trim().ToLowerInvariant();
                var name = (User.Identity?.Name ?? "").Trim();

                if (string.IsNullOrEmpty(userId) && string.IsNullOrEmpty(emailL) && string.IsNullOrEmpty(name))
                    return Unauthorized();

                var col = _db.Collection("inquiries");
                var tasks = new List<Task<QuerySnapshot>>();

                if (!string.IsNullOrEmpty(userId))
                    tasks.Add(col.WhereEqualTo("assignedAdvisorId", userId).Limit(300).GetSnapshotAsync());
                if (!string.IsNullOrEmpty(emailL))
                    tasks.Add(col.WhereEqualTo("assignedAdvisorEmail", emailL).Limit(300).GetSnapshotAsync());
                if (!string.IsNullOrEmpty(name))
                    tasks.Add(col.WhereEqualTo("assignedAdvisor", name).Limit(300).GetSnapshotAsync());

                var snaps = await Task.WhenAll(tasks);

                var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var list = new List<InquiryRow>();

                foreach (var s in snaps)
                    foreach (var d in s.Documents)
                    {
                        if (!seen.Add(d.Id)) continue;
                        var data = d.ToDictionary();

                        DateTime? createdAt = data.TryGetValue("createdAt", out var ca) && ca is Timestamp ts
                                              ? ts.ToDateTime() : null;

                        var row = new InquiryRow
                        {
                            Id = d.Id,
                            Reference = GenerateReferenceNumber(d.Id),
                            Subject = data.TryGetValue("subject", out var subj) ? subj?.ToString() ?? "N/A" : "N/A",
                            Category = data.TryGetValue("inquiryType", out var it) ? it?.ToString() ?? "N/A" : "N/A",
                            Status = data.TryGetValue("status", out var st) ? st?.ToString() ?? "Pending" : "Pending",
                            Date = createdAt
                        };

                        list.Add(row);
                    }

                // filters (in-memory to avoid composite indexes)
                if (!string.Equals(status, "All", StringComparison.OrdinalIgnoreCase))
                    list = list.Where(x => string.Equals(x.Status, status, StringComparison.OrdinalIgnoreCase)).ToList();

                if (!string.Equals(category, "All", StringComparison.OrdinalIgnoreCase))
                    list = list.Where(x => string.Equals(x.Category, category, StringComparison.OrdinalIgnoreCase)).ToList();

                if (!string.IsNullOrWhiteSpace(q))
                {
                    var ql = q.Trim().ToLowerInvariant();
                    list = list.Where(x =>
                        (x.Reference ?? "").ToLowerInvariant().Contains(ql) ||
                        (x.Subject ?? "").ToLowerInvariant().Contains(ql) ||
                        (x.Category ?? "").ToLowerInvariant().Contains(ql)
                    ).ToList();
                }

                var ordered = list.OrderByDescending(x => x.Date ?? DateTime.MinValue).Take(100).ToList();
                return Ok(ordered);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetMine error: {ex.Message}");
                return StatusCode(500, new { error = "Failed to load assigned inquiries" });
            }
        }
        // PUT /api/inquiry/{id}/status  body: { "status": "In Progress", "notes": "Called client" }
        [HttpPut]
        [Authorize(Roles = "Advisor,Admin")]
        [Route("api/inquiry/{id}/status")]
        public async Task<IActionResult> SetStatus(string id, [FromBody] StatusDto body)
        {
            try
            {
                var docRef = _db.Collection("inquiries").Document(id);
                var snap = await docRef.GetSnapshotAsync();
                if (!snap.Exists) return NotFound();

                var inquiry = snap.ToDictionary();
                var assignedId = inquiry.TryGetValue("assignedAdvisorId", out var a) ? a?.ToString() : "";
                var isAdmin = User.IsInRole("Admin");
                var myId = User.FindFirstValue(ClaimTypes.NameIdentifier);

                if (!isAdmin && !string.Equals(assignedId, myId, StringComparison.Ordinal))
                    return Forbid();

                var updates = inquiry.TryGetValue("updates", out var u) && u is List<object> arr ? arr : new List<object>();
                var now = Timestamp.GetCurrentTimestamp();
                var who = User.Identity?.Name ?? "Advisor";

                updates.Add(new Dictionary<string, object> {
            { "status", body?.Status ?? "Pending" },
            { "updatedBy", who },
            { "timestamp", now },
            { "notes", body?.Notes ?? "" }
        });

                await docRef.UpdateAsync(new Dictionary<string, object> {
            { "status", body?.Status ?? "Pending" },
            { "updates", updates },
            { "updatedAt", now }
        });

                return Ok(new { message = "Status updated" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"SetStatus error: {ex.Message}");
                return StatusCode(500, new { error = "Failed to update status" });
            }
        }
        // POST /api/inquiry/{id}/comments  body: { "text": "Spoke to stakeholder, awaiting docs." }
        [HttpPost]
        [Authorize(Roles = "Advisor,Admin")]
        [Route("api/inquiry/{id}/comments")]
        public async Task<IActionResult> AddComment(string id, [FromBody] CommentDto body)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(body?.Text)) return BadRequest(new { error = "Comment text required" });

                var docRef = _db.Collection("inquiries").Document(id);
                var snap = await docRef.GetSnapshotAsync();
                if (!snap.Exists) return NotFound();

                var inquiry = snap.ToDictionary();
                var assignedId = inquiry.TryGetValue("assignedAdvisorId", out var a) ? a?.ToString() : "";
                var isAdmin = User.IsInRole("Admin");
                var myId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!isAdmin && !string.Equals(assignedId, myId, StringComparison.Ordinal))
                    return Forbid();

                var comments = inquiry.TryGetValue("comments", out var c) && c is List<object> arr ? arr : new List<object>();
                var now = Timestamp.GetCurrentTimestamp();

                comments.Add(new Dictionary<string, object> {
            { "text", body.Text.Trim() },
            { "addedByName", User.Identity?.Name ?? "" },
            { "addedById", myId ?? "" },
            { "addedByEmail", (User.FindFirstValue(ClaimTypes.Email) ?? "").Trim().ToLowerInvariant() },
            { "timestamp", now }
        });

                await docRef.UpdateAsync(new Dictionary<string, object> {
            { "comments", comments },
            { "updatedAt", now }
        });

                return Ok(new { message = "Comment added" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"AddComment error: {ex.Message}");
                return StatusCode(500, new { error = "Failed to add comment" });
            }
        }

        public sealed class CommentDto
        {
            public string Text { get; set; } = "";
        }


        public sealed class StatusDto
        {
            public string Status { get; set; } = "";
            public string Notes { get; set; } = "";
        }

        public sealed class InquiryRow
        {
            public string Id { get; set; } = "";
            public string Reference { get; set; } = "";
            public string Subject { get; set; } = "";
            public string Category { get; set; } = "";
            public string Status { get; set; } = "";
            public DateTime? Date { get; set; }
        }


        public IActionResult Index() => View();
        public IActionResult Inquiry() => View("~/Views/StakeholderViews/Inquiry/Inquiry.cshtml");
        public IActionResult InquiryTracking() => View("~/Views/StakeholderViews/InquiryTracking/InquiryTracking.cshtml");
        public IActionResult Tracking() => View("~/Views/EmployeeViews/InquiryTracker.cshtml");
        public IActionResult Feedback()
        {
            return View("~/Views/StakeholderViews/StakeholderFeedback.cshtml");
        }
        public IActionResult TrackAppointment()
        {
            return View("~/Views/StakeholderViews/StakeholderAppointmentTracker.cshtml");
        }
    }
}