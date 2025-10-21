using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Staekholder_CHIETA_X.Controllers
{
    public class AppointmentController : Controller
    {
        #region Dependencies & Fields
        private readonly FirestoreDb _db;
        #endregion

        #region Constructor
        public AppointmentController(FirestoreDb db) => _db = db;
        #endregion

        #region Views (Pages)
        // PAGE: Stakeholder appointment booking page
        // -----------------------------
        [Authorize]
        public async Task<IActionResult> Index()
        {
            try
            {
                var advisorsSnapshot = await _db.Collection("Users")
                                                .WhereEqualTo("Role", "Advisor")
                                                .GetSnapshotAsync();

                var advisors = advisorsSnapshot.Documents
                    .Select(d => new AdvisorViewModel
                    {
                        Id = d.Id,
                        Name = d.ContainsField("Name") ? d.GetValue<string>("Name") : "Unknown"
                    })
                    .ToList();

                return View("~/Views/StakeholderViews/Appointment/Appointment.cshtml", advisors);
            }
            catch
            {
                return View("~/Views/StakeholderViews/Appointment/Appointment.cshtml", new List<AdvisorViewModel>());
            }
        }

        [Authorize]
        public IActionResult TrackAppointment()
        {
            // Add debug logging
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var email = User.FindFirstValue(ClaimTypes.Email);
            var name = User.Identity?.Name;

            Console.WriteLine($"=== TrackAppointment View ===");
            Console.WriteLine($"User authenticated: {User.Identity?.IsAuthenticated}");
            Console.WriteLine($"UserId: {userId}");
            Console.WriteLine($"Email: {email}");
            Console.WriteLine($"Name: {name}");

            return View("~/Views/StakeholderViews/AppointmentTracker.cshtml");
        }
        #endregion

        #region API: Read (My Appointments)
        // API: Get the current stakeholder's appointments
        // Returns ALL appointments and lets client-side JavaScript filter
        [HttpGet]
        [Authorize] // Added authorization
        [Route("api/appointment/my-appointments")]
        public async Task<IActionResult> GetMyAppointments()
        {
            try
            {
                Console.WriteLine("=== GetMyAppointments API called ===");
                Console.WriteLine($"Timestamp: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
                Console.WriteLine($"User authenticated: {User.Identity?.IsAuthenticated}");

                var stakeholderUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var stakeholderEmail = User.FindFirstValue(ClaimTypes.Email);
                var currentUserName = User.Identity?.Name;

                Console.WriteLine($"StakeholderUserId: '{stakeholderUserId}'");
                Console.WriteLine($"StakeholderEmail: '{stakeholderEmail}'");
                Console.WriteLine($"UserName: '{currentUserName}'");

                if (string.IsNullOrWhiteSpace(stakeholderUserId) &&
                    string.IsNullOrWhiteSpace(stakeholderEmail) &&
                    string.IsNullOrWhiteSpace(currentUserName))
                {
                    Console.WriteLine("ERROR: No user identification found!");
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var col = _db.Collection("appointments");
                Query query = null;

                // Try to match by StakeholderUserId first
                if (!string.IsNullOrWhiteSpace(stakeholderUserId))
                {
                    Console.WriteLine($"Querying by StakeholderUserId: {stakeholderUserId}");
                    query = col.WhereEqualTo("StakeholderUserId", stakeholderUserId);
                }
                else if (!string.IsNullOrWhiteSpace(stakeholderEmail))
                {
                    Console.WriteLine($"Querying by StakeholderEmail: {stakeholderEmail}");
                    query = col.WhereEqualTo("StakeholderEmail", stakeholderEmail);
                }
                else
                {
                    Console.WriteLine($"Querying by ClientName: {currentUserName}");
                    query = col.WhereEqualTo("ClientName", currentUserName);
                }

                var snap = await query.GetSnapshotAsync();
                Console.WriteLine($"Firestore query returned {snap.Documents.Count} documents");

                if (snap.Documents.Count == 0)
                {
                    Console.WriteLine("WARNING: No appointments found for this user");
                    Console.WriteLine("Check Firebase to verify:");
                    Console.WriteLine($"  - StakeholderUserId matches: {stakeholderUserId}");
                    Console.WriteLine($"  - OR StakeholderEmail matches: {stakeholderEmail}");
                    Console.WriteLine($"  - OR ClientName matches: {currentUserName}");
                }

                var items = new List<object>();

                foreach (var doc in snap.Documents)
                {
                    try
                    {
                        Console.WriteLine($"Processing document: {doc.Id}");
                        var d = doc.ToDictionary();

                        // Log all fields in document for debugging
                        Console.WriteLine($"  Fields: {string.Join(", ", d.Keys)}");

                        // Helper to get string value safely
                        string GetString(string fieldName, string defaultValue = "")
                        {
                            if (d.TryGetValue(fieldName, out var val) && val != null)
                                return val.ToString();
                            return defaultValue;
                        }

                        // Parse date - handle both string and Timestamp
                        string dateStr = null;
                        if (d.TryGetValue("Date", out var dateVal))
                        {
                            if (dateVal is string s)
                            {
                                dateStr = s;
                                Console.WriteLine($"  Date (string): {dateStr}");
                            }
                            else if (doc.ContainsField("Date"))
                            {
                                try
                                {
                                    var ts = doc.GetValue<Timestamp>("Date");
                                    dateStr = ts.ToDateTime().ToString("yyyy-MM-dd");
                                    Console.WriteLine($"  Date (timestamp): {dateStr}");
                                }
                                catch (Exception ex)
                                {
                                    Console.WriteLine($"  Date parse error: {ex.Message}");
                                }
                            }
                        }

                        var status = GetString("Status", "pending").ToLowerInvariant();
                        var timeStr = GetString("Time");

                        Console.WriteLine($"  Status: {status}");
                        Console.WriteLine($"  Time: {timeStr}");

                        // Get advisor role if available
                        string advisorRole = "";
                        var advisorId = GetString("AdvisorId");
                        if (!string.IsNullOrWhiteSpace(advisorId))
                        {
                            try
                            {
                                var advisorDoc = await _db.Collection("Users").Document(advisorId).GetSnapshotAsync();
                                if (advisorDoc.Exists && advisorDoc.ContainsField("Role"))
                                {
                                    advisorRole = advisorDoc.GetValue<string>("Role");
                                    Console.WriteLine($"  AdvisorRole: {advisorRole}");
                                }
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"  Could not fetch advisor role: {ex.Message}");
                            }
                        }

                        // Only include appointments with valid dates
                        if (string.IsNullOrWhiteSpace(dateStr))
                        {
                            Console.WriteLine($"  ⚠️ SKIPPING - no valid date");
                            continue;
                        }

                        var appointment = new
                        {
                            Id = doc.Id,
                            AdvisorId = advisorId,
                            AdvisorName = GetString("AdvisorName", "Advisor"),
                            AdvisorRole = advisorRole,
                            ClientName = GetString("ClientName"),
                            StakeholderUserId = GetString("StakeholderUserId"),
                            StakeholderEmail = GetString("StakeholderEmail"),
                            Reason = GetString("Reason", "General Appointment"),
                            Date = dateStr,
                            Time = timeStr,
                            Duration = GetString("Duration", "30 mins"),
                            Location = GetString("Location", GetString("AppointmentType") == "online" ? "Online Meeting" : ""),
                            AppointmentType = GetString("AppointmentType", "online"),
                            Status = status,
                            Details = GetString("Details"),
                            Email = GetString("StakeholderEmail", GetString("Email")),
                            ProposedNewDate = GetString("ProposedNewDate"),
                            ProposedNewTime = GetString("ProposedNewTime"),
                            DeclineReason = GetString("DeclineReason")
                        };

                        Console.WriteLine($"  ✅ Added: {appointment.ClientName} on {appointment.Date} at {appointment.Time} - Status: {appointment.Status}");
                        items.Add(appointment);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"❌ Error processing document {doc.Id}: {ex.Message}");
                        Console.WriteLine($"   Stack: {ex.StackTrace}");
                    }
                }

                // Sort by date ascending (soonest first)
                var sorted = items
                    .OrderBy(a => {
                        var apt = (dynamic)a;
                        DateTime dt;
                        if (DateTime.TryParse(apt.Date, out dt))
                            return dt;
                        return DateTime.MaxValue;
                    })
                    .ToList();

                Console.WriteLine($"=== Returning {sorted.Count} appointments ===");

                // Log the JSON being returned (first appointment only for brevity)
                if (sorted.Count > 0)
                {
                    var firstApt = sorted[0];
                    Console.WriteLine($"Sample appointment: {System.Text.Json.JsonSerializer.Serialize(firstApt)}");
                }

                return Json(sorted);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ CRITICAL ERROR in GetMyAppointments: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { message = $"Failed to fetch appointments: {ex.Message}" });
            }
        }
        #endregion


        // API: Create a new appointment (stakeholder)
        [HttpPost]
        [Authorize]
        [Route("api/appointment")]
        public async Task<IActionResult> Post(
            [FromForm] string advisor,
            [FromForm] string reason,
            [FromForm] string date,
            [FromForm] string time,
            [FromForm] string appointmentType = "online",
            [FromForm] string details = "")
        {
            try
            {
                if (string.IsNullOrWhiteSpace(advisor) ||
                    string.IsNullOrWhiteSpace(reason) ||
                    string.IsNullOrWhiteSpace(date) ||
                    string.IsNullOrWhiteSpace(time))
                {
                    return BadRequest(new { message = "All required fields must be provided." });
                }

                // Validate advisor
                var advisorDoc = await _db.Collection("Users").Document(advisor).GetSnapshotAsync();
                if (!advisorDoc.Exists)
                    return BadRequest(new { message = "Selected advisor not found" });

                var advisorName = advisorDoc.ContainsField("Name") ? advisorDoc.GetValue<string>("Name") : "Advisor";
                var stakeholderUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
                var stakeholderEmail = User.FindFirstValue(ClaimTypes.Email) ?? "";
                var clientName = User.Identity?.Name ?? "Anonymous User";

                var appointmentData = new Dictionary<string, object>
                {
                    ["AdvisorId"] = advisor,
                    ["AdvisorName"] = advisorName,
                    ["ClientName"] = clientName,
                    ["StakeholderUserId"] = stakeholderUserId,
                    ["StakeholderEmail"] = stakeholderEmail,
                    ["Email"] = stakeholderEmail,
                    ["Reason"] = reason,
                    ["Date"] = date,
                    ["Time"] = time,
                    ["Duration"] = "30 mins", // Default duration
                    ["Location"] = appointmentType == "online" ? "Online Meeting" : "",
                    ["AppointmentType"] = appointmentType,
                    ["Status"] = "pending",
                    ["CreatedAt"] = Timestamp.GetCurrentTimestamp(),
                    ["Details"] = string.IsNullOrWhiteSpace(details) ? "" : details
                };

                var docRef = await _db.Collection("appointments").AddAsync(appointmentData);

                Console.WriteLine($"Created appointment: {docRef.Id} for {clientName}");

                return Ok(new
                {
                    id = docRef.Id,
                    message = "Appointment booked successfully!",
                    appointmentDetails = new
                    {
                        id = docRef.Id,
                        advisorName,
                        clientName,
                        date,
                        time,
                        type = appointmentType,
                        reason
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating appointment: {ex.Message}");
                return StatusCode(500, new { message = $"Failed to book appointment: {ex.Message}" });
            }
        }

        // API: Cancel an appointment (stakeholder)
        [HttpPost]
        [Authorize]
        [Route("api/appointment/cancel")]
        public async Task<IActionResult> CancelAppointment([FromBody] string appointmentId)
        {
            try
            {
                Console.WriteLine($"=== CancelAppointment called ===");
                Console.WriteLine($"AppointmentId: {appointmentId}");

                if (string.IsNullOrWhiteSpace(appointmentId))
                {
                    return BadRequest(new { message = "Appointment ID is required" });
                }

                var stakeholderUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var stakeholderEmail = User.FindFirstValue(ClaimTypes.Email);

                Console.WriteLine($"User - UserId: {stakeholderUserId}, Email: {stakeholderEmail}");

                // Verify the appointment belongs to this user
                var appointmentDoc = await _db.Collection("appointments").Document(appointmentId).GetSnapshotAsync();

                if (!appointmentDoc.Exists)
                {
                    Console.WriteLine("ERROR: Appointment not found");
                    return NotFound(new { message = "Appointment not found" });
                }

                var appointmentData = appointmentDoc.ToDictionary();
                var ownerUserId = appointmentData.ContainsKey("StakeholderUserId") ? appointmentData["StakeholderUserId"]?.ToString() : "";
                var ownerEmail = appointmentData.ContainsKey("StakeholderEmail") ? appointmentData["StakeholderEmail"]?.ToString() : "";

                Console.WriteLine($"Appointment - UserId: {ownerUserId}, Email: {ownerEmail}");

                // Verify ownership
                if (ownerUserId != stakeholderUserId && ownerEmail != stakeholderEmail)
                {
                    Console.WriteLine("ERROR: User does not own this appointment");
                    return Forbid();
                }

                // Update status to cancelled
                await _db.Collection("appointments").Document(appointmentId).UpdateAsync(new Dictionary<string, object>
                {
                    ["Status"] = "cancelled",
                    ["CancelledAt"] = Timestamp.GetCurrentTimestamp()
                });

                Console.WriteLine($"✅ Appointment {appointmentId} cancelled successfully");

                return Ok(new { message = "Appointment cancelled successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error cancelling appointment: {ex.Message}");
                Console.WriteLine($"Stack: {ex.StackTrace}");
                return StatusCode(500, new { message = $"Failed to cancel appointment: {ex.Message}" });
            }
        }
    }

    #region ViewModels
    public class AdvisorViewModel
    {
        public string Id { get; set; }
        public string Name { get; set; }
    }
    #endregion
}
