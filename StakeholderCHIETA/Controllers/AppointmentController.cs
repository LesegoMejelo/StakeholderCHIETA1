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
                return View("~/Views/StakeholderViews/Appointment/Appointment.cshtml", new List<AdvisorViewModel>());
            }
        }

        // -----------------------------
        // API: Get the current stakeholder's appointments
        // Returns ALL appointments and lets client-side JavaScript filter
        // -----------------------------
        [HttpGet]
        [Authorize]
        [Route("api/appointment/my-appointments")]
        public async Task<IActionResult> GetMyAppointments()
        {
            try
            {
                Console.WriteLine("=== GetMyAppointments called ===");

                var stakeholderUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var stakeholderEmail = User.FindFirstValue(ClaimTypes.Email);
                var currentUserName = User.Identity?.Name;

                Console.WriteLine($"StakeholderUserId: {stakeholderUserId}");
                Console.WriteLine($"StakeholderEmail: {stakeholderEmail}");
                Console.WriteLine($"UserName: {currentUserName}");

                if (string.IsNullOrWhiteSpace(stakeholderUserId) &&
                    string.IsNullOrWhiteSpace(stakeholderEmail) &&
                    string.IsNullOrWhiteSpace(currentUserName))
                {
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
                Console.WriteLine($"Found {snap.Documents.Count} appointments");

                var items = new List<object>();

                foreach (var doc in snap.Documents)
                {
                    try
                    {
                        var d = doc.ToDictionary();

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
                            }
                            else if (doc.ContainsField("Date"))
                            {
                                try
                                {
                                    var ts = doc.GetValue<Timestamp>("Date");
                                    dateStr = ts.ToDateTime().ToString("yyyy-MM-dd");
                                }
                                catch { }
                            }
                        }

                        var status = GetString("Status", "pending").ToLowerInvariant();
                        var timeStr = GetString("Time");

                        var appointment = new
                        {
                            Id = doc.Id,
                            AdvisorId = GetString("AdvisorId"),
                            AdvisorName = GetString("AdvisorName", "Advisor"),
                            ClientName = GetString("ClientName"),
                            StakeholderUserId = GetString("StakeholderUserId"),
                            StakeholderEmail = GetString("StakeholderEmail"),
                            Reason = GetString("Reason"),
                            Date = dateStr,
                            Time = timeStr,
                            AppointmentType = GetString("AppointmentType", "online"),
                            Status = status,
                            Details = GetString("Details"),
                            Email = GetString("StakeholderEmail", GetString("Email"))
                        };

                        Console.WriteLine($"Appointment: {appointment.ClientName} on {appointment.Date} at {appointment.Time} - Status: {appointment.Status}");
                        items.Add(appointment);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error processing document {doc.Id}: {ex.Message}");
                    }
                }

                // Sort by date ascending
                var sorted = items
                    .OrderBy(a => {
                        var apt = (dynamic)a;
                        DateTime dt;
                        if (DateTime.TryParse(apt.Date, out dt))
                            return dt;
                        return DateTime.MaxValue;
                    })
                    .ToList();

                Console.WriteLine($"Returning {items.Count} appointments");
                return Json(sorted);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetMyAppointments: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { message = $"Failed to fetch appointments: {ex.Message}" });
            }
        }

        // -----------------------------
        // API: Create a new appointment (stakeholder)
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
    }

    public class AdvisorViewModel
    {
        public string Id { get; set; }
        public string Name { get; set; }
    }
}