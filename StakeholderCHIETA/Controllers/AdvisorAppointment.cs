using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using System.Text;
using StakeholderCHIETA.Services; // ITokenService, IQRCodeGenerator, IEmailService
using Microsoft.Extensions.Logging;

namespace StakeholderCHIETA.Controllers
{
    [Authorize(Roles = "Advisor")]
    public class AdvisorAppointmentController : Controller
    {
        private readonly FirestoreDb _firestoreDb;
        private readonly ITokenService _tokenService;
        private readonly IQRCodeGenerator _qr;
        private readonly IEmailService _email;
        private readonly ILogger<AdvisorAppointmentController> _logger;

        public AdvisorAppointmentController(
            FirestoreDb firestoreDb,
            ITokenService tokenService,
            IQRCodeGenerator qr,
            IEmailService email,
            ILogger<AdvisorAppointmentController> logger)
        {
            _firestoreDb = firestoreDb;
            _tokenService = tokenService;
            _qr = qr;
            _email = email;
            _logger = logger;
        }

        // GET: Load appointment tracker page
        [HttpGet]
        public IActionResult AppointmentTracker()
        {
            return View("~/Views/EmployeeViews/AppointmentTracker.cshtml");
        }

        public IActionResult BoardroomBooking()
        {
            return View("~/Views/EmployeeViews/BoardroomBooking.cshtml");
        }

        public IActionResult BoardroomBookingTracker()
        {
            return View("~/Views/EmployeeViews/BoardroomBookingTracker.cshtml");
        }

        // GET: Return ALL appointments for this advisor
        [HttpGet]
        public async Task<IActionResult> AppointmentTrackerData()
        {
            try
            {
                Console.WriteLine("=== AppointmentTrackerData method called ===");

                var advisorUid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                Console.WriteLine($"Advisor UID from claims: '{advisorUid}'");

                if (string.IsNullOrEmpty(advisorUid))
                {
                    Console.WriteLine("ERROR: Advisor UID is null or empty");
                    return Unauthorized(new { error = "User not authenticated" });
                }

                Console.WriteLine("Querying appointments...");

                var appointmentsRef = _firestoreDb.Collection("appointments");
                var query = appointmentsRef.WhereEqualTo("AdvisorId", advisorUid);
                var snapshot = await query.GetSnapshotAsync();

                Console.WriteLine($"Query completed. Found {snapshot.Documents.Count} documents");

                var appointments = new List<Dictionary<string, object>>();

                foreach (var doc in snapshot.Documents)
                {
                    try
                    {
                        Console.WriteLine($"\n--- Processing document: {doc.Id} ---");

                        var docData = doc.ToDictionary();
                        Console.WriteLine("Document contains these fields:");
                        foreach (var kvp in docData)
                        {
                            Console.WriteLine($"  '{kvp.Key}': '{kvp.Value}' (Type: {kvp.Value?.GetType().Name})");
                        }

                        string GetStringValue(string fieldName)
                        {
                            try
                            {
                                if (doc.ContainsField(fieldName))
                                {
                                    var value = doc.GetValue<object>(fieldName);
                                    return value?.ToString() ?? "";
                                }
                                return "";
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"Error getting field '{fieldName}': {ex.Message}");
                                return "";
                            }
                        }

                        var appointment = new Dictionary<string, object>
                        {
                            { "Id", doc.Id },
                            { "AdvisorId", GetStringValue("AdvisorId") },
                            { "AdvisorName", GetStringValue("AdvisorName") },
                            { "ClientName", GetStringValue("ClientName") },
                            { "Date", GetStringValue("Date") },
                            { "Reason", GetStringValue("Reason") },
                            { "Status", GetStringValue("Status") },
                            { "Time", GetStringValue("Time") },
                            { "DeclineReason", GetStringValue("DeclineReason") },
                            { "ProposedNewDate", GetStringValue("ProposedNewDate") },
                            { "ProposedNewTime", GetStringValue("ProposedNewTime") },
                            { "Email", GetStringValue("StakeholderEmail") } // NEW: show stakeholder email in table
                        };

                        // Fallbacks for alternate field casing
                        if (string.IsNullOrEmpty(appointment["ClientName"]?.ToString()) &&
                            string.IsNullOrEmpty(appointment["Date"]?.ToString()) &&
                            string.IsNullOrEmpty(appointment["Time"]?.ToString()))
                        {
                            Console.WriteLine($"⚠️  Warning: Document {doc.Id} has empty essential fields");
                            appointment["AdvisorId"] = GetStringValue("advisorId") ?? GetStringValue("AdvisorId");
                            appointment["AdvisorName"] = GetStringValue("advisorName") ?? GetStringValue("AdvisorName");
                            appointment["ClientName"] = GetStringValue("clientName") ?? GetStringValue("ClientName");
                            appointment["Date"] = GetStringValue("date") ?? GetStringValue("Date");
                            appointment["Reason"] = GetStringValue("reason") ?? GetStringValue("Reason");
                            appointment["Status"] = GetStringValue("status") ?? GetStringValue("Status");
                            appointment["Time"] = GetStringValue("time") ?? GetStringValue("Time");
                            appointment["DeclineReason"] = GetStringValue("declineReason") ?? GetStringValue("DeclineReason");
                            appointment["ProposedNewDate"] = GetStringValue("proposedNewDate") ?? GetStringValue("ProposedNewDate");
                            appointment["ProposedNewTime"] = GetStringValue("proposedNewTime") ?? GetStringValue("ProposedNewTime");
                            if (string.IsNullOrEmpty(appointment["Email"]?.ToString()))
                                appointment["Email"] = GetStringValue("stakeholderEmail") ?? GetStringValue("StakeholderEmail");
                            Console.WriteLine($"✅ Used alternative field names for: {appointment["ClientName"]}");
                        }

                        appointments.Add(appointment);
                        Console.WriteLine($"✅ Successfully processed: {appointment["ClientName"]} on {appointment["Date"]} at {appointment["Time"]} - {appointment["Status"]}");
                    }
                    catch (Exception docEx)
                    {
                        Console.WriteLine($"❌ Error processing document {doc.Id}: {docEx.Message}");
                        Console.WriteLine($"Stack trace: {docEx.StackTrace}");

                        appointments.Add(new Dictionary<string, object>
                        {
                            { "Id", doc.Id },
                            { "AdvisorId", "" },
                            { "AdvisorName", "" },
                            { "ClientName", "Error loading appointment" },
                            { "Date", "" },
                            { "Reason", "Error occurred while loading" },
                            { "Status", "Error" },
                            { "Time", "" },
                            { "DeclineReason", "" },
                            { "ProposedNewDate", "" },
                            { "ProposedNewTime", "" },
                            { "Email", "" }
                        });
                    }
                }

                var sortedAppointments = appointments
                    .OrderBy(a => a["Date"]?.ToString())
                    .ThenBy(a => a["Time"]?.ToString())
                    .ToList();

                Console.WriteLine($"\n=== Returning {sortedAppointments.Count} appointments ===");
                foreach (var apt in sortedAppointments.Take(3))
                {
                    Console.WriteLine($"Appointment: Id={apt["Id"]}, ClientName={apt["ClientName"]}, Date={apt["Date"]}, Time={apt["Time"]}, Status={apt["Status"]}");
                }

                return Json(sortedAppointments);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ FATAL ERROR: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return StatusCode(500, new
                {
                    error = "Internal server error",
                    message = ex.Message
                });
            }
        }

        public class UpdateAppointmentStatusRequest
        {
            public string AppointmentId { get; set; }
            public string Status { get; set; }
            public string DeclineReason { get; set; }
            public string NewDate { get; set; }
            public string NewTime { get; set; }
        }

        // POST: Accept / Decline / Reschedule
        [HttpPost]
        public async Task<IActionResult> UpdateStatus([FromBody] UpdateAppointmentStatusRequest request)
        {
            var appointmentId = request.AppointmentId;
            var status = request.Status;
            var declineReason = request.DeclineReason;
            var newDate = request.NewDate;
            var newTime = request.NewTime;

            try
            {
                Console.WriteLine($"\n=== UpdateStatus called ===");
                Console.WriteLine($"appointmentId: '{appointmentId}'");
                Console.WriteLine($"status: '{status}'");
                Console.WriteLine($"declineReason: '{declineReason}'");
                Console.WriteLine($"newDate: '{newDate}'");
                Console.WriteLine($"newTime: '{newTime}'");

                if (string.IsNullOrEmpty(appointmentId) || string.IsNullOrEmpty(status))
                {
                    Console.WriteLine("❌ Missing required parameters");
                    return BadRequest(new { error = "Missing appointmentId or status" });
                }

                var docRef = _firestoreDb.Collection("appointments").Document(appointmentId);
                var snap = await docRef.GetSnapshotAsync();
                if (!snap.Exists)
                {
                    Console.WriteLine($"❌ Document {appointmentId} not found");
                    return NotFound(new { error = "Appointment not found" });
                }

                Console.WriteLine($"✅ Found appointment document");

                // Normalize status (Accepted / Declined / Rescheduled)
                var normalizedStatus = char.ToUpper(status[0]) + status.Substring(1).ToLower();

                // Double-send guard
                var alreadyAccepted = snap.ContainsField("Status")
                    && string.Equals(snap.GetValue<string>("Status"), "Accepted", StringComparison.OrdinalIgnoreCase);

                var confirmationAlreadySent = snap.ContainsField("ConfirmationEmailSent")
                    && (snap.GetValue<bool?>("ConfirmationEmailSent") ?? false);

                // Prepare update data
                var updateData = new Dictionary<string, object>
                {
                    { "Status", normalizedStatus },
                    { "UpdatedAt", Timestamp.FromDateTime(DateTime.UtcNow) }
                };

                if (normalizedStatus == "Declined")
                {
                    updateData["DeclineReason"] = declineReason ?? "";
                    if (!string.IsNullOrEmpty(newDate))
                        updateData["ProposedNewDate"] = newDate;
                    if (!string.IsNullOrEmpty(newTime))
                        updateData["ProposedNewTime"] = newTime;
                }

                Console.WriteLine("Updating with:");
                foreach (var kvp in updateData)
                {
                    Console.WriteLine($"  {kvp.Key}: '{kvp.Value}'");
                }

                await docRef.UpdateAsync(updateData);
                Console.WriteLine($"✅ Successfully updated appointment {appointmentId} to {normalizedStatus}");

                // === ACCEPTED PATH → create token, QR, send email ===
                if (normalizedStatus == "Accepted")
                {
                    if (alreadyAccepted && confirmationAlreadySent)
                    {
                        // Signal the frontend to show the "already accepted" toast
                        return StatusCode(409, new { message = "This appointment is already accepted and confirmation was sent." });
                    }

                    // Stakeholder email (case tolerant)
                    var stakeholderEmail =
                        snap.ContainsField("StakeholderEmail") ? snap.GetValue<string>("StakeholderEmail")
                        : (snap.ContainsField("stakeholderEmail") ? snap.GetValue<string>("stakeholderEmail") : null);

                    if (string.IsNullOrWhiteSpace(stakeholderEmail))
                    {
                        Console.WriteLine("❌ No stakeholder email on the appointment");
                        return Ok(new { success = true, message = "Appointment accepted but no stakeholder email found to notify." });
                    }

                    // 1) Create one-time token (24h TTL)
                    var (rawToken, tokenId) = await _tokenService.CreateOneTimeTokenAsync(appointmentId, TimeSpan.FromHours(24));

                    // 2) Build absolute CheckIn URL
                    var baseUrl = $"{Request.Scheme}://{Request.Host}";
                    var checkInUrl = $"{baseUrl}/CheckIn?t={Uri.EscapeDataString(rawToken)}&a={Uri.EscapeDataString(appointmentId)}";

                    // 3) Generate QR PNG
                    byte[] qrPng;
                    try
                    {
                        qrPng = _qr.GeneratePng(checkInUrl, 8); // adjust density if desired
                    }
                    catch (MissingMethodException)
                    {
                        throw;
                    }

                    // 4) Compose email HTML with inline QR
                    var html = BuildConfirmationEmailHtml(checkInUrl);

                    // 5) Send email
                    await _email.SendEmailWithAttachmentAsync(
                        to: stakeholderEmail,
                        subject: "Your appointment is confirmed — CHIETA",
                        htmlBody: html,
                        attachmentBytes: qrPng,
                        attachmentName: "appointment-qr.png",
                        contentId: "qrCode"
                    );

                    // 6) Mark as sent to avoid duplicates on retries
                    await docRef.UpdateAsync(new Dictionary<string, object>
                    {
                        { "ConfirmationEmailSent", true },
                        { "ConfirmationEmailSentAt", Timestamp.FromDateTime(DateTime.UtcNow) }
                    });

                    _logger.LogInformation("Accepted appointment {AppointmentId}, token {TokenId}, email sent to {Email}.",
                        appointmentId, tokenId, stakeholderEmail);
                }

                return Ok(new { success = true, message = "Appointment updated successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error updating appointment: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return StatusCode(500, new
                {
                    error = "Failed to update appointment",
                    message = ex.Message
                });
            }
        }

        // ---------- Helpers ----------

        private static string BuildConfirmationEmailHtml(string checkInUrl)
        {
            var sb = new StringBuilder();
            sb.AppendLine("<div style=\"font-family:Segoe UI, Arial, sans-serif;\">");
            sb.AppendLine("<h2>Your CHIETA appointment is confirmed</h2>");
            sb.AppendLine("<p>Please present this QR code at the venue to check in.</p>");
            sb.AppendLine("<p><img src=\"cid:qrCode\" alt=\"Appointment QR\" style=\"max-width:240px;\" /></p>");
            sb.AppendLine("<p>If the QR doesn’t show, you can also open this link:</p>");
            sb.AppendLine($"<p><a href=\"{checkInUrl}\">{checkInUrl}</a></p>");
            sb.AppendLine("<p>See you soon!</p>");
            sb.AppendLine("</div>");
            return sb.ToString();
        }
    }
}
