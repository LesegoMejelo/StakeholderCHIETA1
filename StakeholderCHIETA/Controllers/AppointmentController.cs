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
        private readonly FirestoreDb _db;
        public AppointmentController(FirestoreDb db) => _db = db;

        // -----------------------------
        // PAGE: Stakeholder appointment booking page
        // -----------------------------
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
                // Return empty list so page still loads gracefully
                return View("~/Views/StakeholderViews/Appointment/Appointment.cshtml", new List<AdvisorViewModel>());
            }
        }

        // -----------------------------
        // API: Get the current stakeholder's appointments
        // Prefiltered to accepted/rescheduled & upcoming (toggle FILTER_ONLY_UPCOMING below)
        // -----------------------------
        [HttpGet]
        [Authorize]
        [Route("api/appointment/my-appointments")]
        public async Task<IActionResult> GetMyAppointments()
        {
            const bool FILTER_ONLY_UPCOMING = true; // set false to return all and let UI filter

            try
            {
                var stakeholderUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var stakeholderEmail = User.FindFirstValue(ClaimTypes.Email);
                var currentUserName = User.Identity?.Name;

                if (string.IsNullOrWhiteSpace(stakeholderUserId) &&
                    string.IsNullOrWhiteSpace(stakeholderEmail) &&
                    string.IsNullOrWhiteSpace(currentUserName))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                // Prefer StakeholderUserId, then Email, then ClientName (for legacy records)
                var col = _db.Collection("appointments");
                Query query;

                if (!string.IsNullOrWhiteSpace(stakeholderUserId))
                    query = col.WhereEqualTo("StakeholderUserId", stakeholderUserId);
                else if (!string.IsNullOrWhiteSpace(stakeholderEmail))
                    query = col.WhereEqualTo("StakeholderEmail", stakeholderEmail);
                else
                    query = col.WhereEqualTo("ClientName", currentUserName);

                var snap = await query.GetSnapshotAsync();

                // Map documents to response shape used by your JS
                var items = snap.Documents.Select(doc =>
                {
                    var d = doc.ToDictionary();

                    // Date can be ISO string (yyyy-MM-dd) or Firestore Timestamp
                    string dateStr = null;
                    if (d.TryGetValue("Date", out var dateVal) && dateVal is string s)
                    {
                        dateStr = s;
                    }
                    else if (doc.ContainsField("Date"))
                    {
                        try
                        {
                            var ts = doc.GetValue<Timestamp>("Date");
                            dateStr = ts.ToDateTime().ToString("yyyy-MM-dd");
                        }
                        catch { /* ignore if not a Timestamp */ }
                    }

                    var timeStr = d.TryGetValue("Time", out var t) ? t?.ToString() : null;

                    return new
                    {
                        Id = doc.Id,
                        AdvisorId = d.TryGetValue("AdvisorId", out var aid) ? aid?.ToString() : "",
                        AdvisorName = d.TryGetValue("AdvisorName", out var an) ? an?.ToString() : "Advisor",
                        ClientName = d.TryGetValue("ClientName", out var cn) ? cn?.ToString() : "",
                        StakeholderUserId = d.TryGetValue("StakeholderUserId", out var su) ? su?.ToString() : "",
                        StakeholderEmail = d.TryGetValue("StakeholderEmail", out var se) ? se?.ToString() : "",
                        Reason = d.TryGetValue("Reason", out var rs) ? rs?.ToString() : "",
                        Date = dateStr,
                        Time = timeStr,
                        AppointmentType = d.TryGetValue("AppointmentType", out var at) ? at?.ToString() : "online",
                        Status = (d.TryGetValue("Status", out var st) ? st?.ToString() : "pending")?.ToLowerInvariant(),
                        Details = d.TryGetValue("Details", out var de) ? de?.ToString() : ""
                    };
                }).ToList();

                // Helper to combine Date + Time
                DateTime ToDateTime(string ds, string ts)
                {
                    if (string.IsNullOrWhiteSpace(ds)) return DateTime.MaxValue;
                    if (!DateTime.TryParse(ds, out var d)) return DateTime.MaxValue;
                    if (!string.IsNullOrWhiteSpace(ts) && TimeSpan.TryParse(ts, out var t))
                        return d.Date + t;
                    return d.Date;
                }

                var today = DateTime.Today;

                var result = FILTER_ONLY_UPCOMING
                    ? items
                        .Where(a =>
                            (a.Status == "accepted" || a.Status == "rescheduled") &&
                            ToDateTime(a.Date, a.Time) >= today)
                        .OrderBy(a => ToDateTime(a.Date, a.Time))
                        .ToList()
                    : items
                        .OrderBy(a => ToDateTime(a.Date, a.Time))
                        .ToList();

                return Json(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Failed to fetch appointments: {ex.Message}" });
            }
        }

        // -----------------------------
        // API: Create a new appointment (stakeholder)
        // Stores StakeholderUserId + StakeholderEmail and normalizes Status casing
        // -----------------------------
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

                // Store as strings (ISO for Date "yyyy-MM-dd", "HH:mm" for Time), or switch Date to Timestamp if preferred
                var appointmentData = new Dictionary<string, object>
                {
                    ["AdvisorId"] = advisor,
                    ["AdvisorName"] = advisorName,
                    ["ClientName"] = clientName,
                    ["StakeholderUserId"] = stakeholderUserId,
                    ["StakeholderEmail"] = stakeholderEmail,
                    ["Reason"] = reason,
                    ["Date"] = date,  // If you want Timestamp: Timestamp.FromDateTime(DateTime.Parse(date).ToUniversalTime())
                    ["Time"] = time,  // "HH:mm"
                    ["AppointmentType"] = appointmentType,
                    ["Status"] = "pending", // normalized lowercase
                    ["CreatedAt"] = Timestamp.GetCurrentTimestamp(),
                    ["Details"] = string.IsNullOrWhiteSpace(details) ? null : details
                };

                var docRef = await _db.Collection("appointments").AddAsync(appointmentData);

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
                return StatusCode(500, new { message = $"Failed to book appointment: {ex.Message}" });
            }
        }
    }

    public class AdvisorViewModel
    {
        public string Id { get; set; }
        public string Name { get; set; }
    }
}
