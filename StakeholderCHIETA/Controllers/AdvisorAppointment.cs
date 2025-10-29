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
        #region Dependencies & Fields
        private readonly FirestoreDb _firestoreDb;
        private readonly ITokenService _tokenService;
        private readonly IQRCodeGenerator _qr;
        private readonly IEmailService _email;
        private readonly ILogger<AdvisorAppointmentController> _logger;
        #endregion

        #region Constructor
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
        #endregion

        #region Views (Pages)
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
        #endregion

        #region API: Read (Advisor Appointments)
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
                            { "Email", GetStringValue("StakeholderEmail") } // show stakeholder email in table
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
        #endregion

        #region DTOs (Requests/Responses)
        public class UpdateAppointmentStatusRequest
        {
            public string AppointmentId { get; set; }
            public string Status { get; set; }
            public string DeclineReason { get; set; }
            public string NewDate { get; set; }
            public string NewTime { get; set; }
        }
        #endregion

        #region API: Mutations (Accept / Decline / Reschedule)
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

                // Also persist proposal when it's a Reschedule
                if (normalizedStatus == "Rescheduled")
                {
                    updateData["DeclineReason"] = declineReason ?? ""; // optional context
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

                // === RESCHEDULED or DECLINED → email stakeholder (always email on Declined) ===
                if (normalizedStatus == "Rescheduled" || normalizedStatus == "Declined")
                {
                    // Refresh snapshot to read latest fields we may have just written
                    snap = await docRef.GetSnapshotAsync();

                    // Stakeholder email (case tolerant)
                    var stakeholderEmail =
                        snap.ContainsField("StakeholderEmail") ? snap.GetValue<string>("StakeholderEmail")
                        : (snap.ContainsField("stakeholderEmail") ? snap.GetValue<string>("stakeholderEmail") : null);

                    if (!string.IsNullOrWhiteSpace(stakeholderEmail))
                    {
                        var stakeholderName = snap.ContainsField("ClientName") ? snap.GetValue<string>("ClientName") : "Stakeholder";
                        var advisorName = snap.ContainsField("AdvisorName") ? snap.GetValue<string>("AdvisorName") : "Advisor";
                        var advisorId = snap.ContainsField("AdvisorId") ? snap.GetValue<string>("AdvisorId") : null;

                        // Prefer request values; fallback to stored values
                        var reason = !string.IsNullOrWhiteSpace(declineReason)
                            ? declineReason
                            : (snap.ContainsField("DeclineReason") ? snap.GetValue<string>("DeclineReason") : "");

                        var proposedDate = !string.IsNullOrWhiteSpace(newDate)
                            ? newDate
                            : (snap.ContainsField("ProposedNewDate") ? snap.GetValue<string>("ProposedNewDate") : null);

                        var proposedTime = !string.IsNullOrWhiteSpace(newTime)
                            ? newTime
                            : (snap.ContainsField("ProposedNewTime") ? snap.GetValue<string>("ProposedNewTime") : null);

                        var baseUrl = $"{Request.Scheme}://{Request.Host}";

                        // Confirm link only makes sense if there is a proposed time; email body hides button otherwise
                        var confirmUrl = $"{baseUrl}/AdvisorAppointment/ConfirmReschedule" +
                                         $"?a={Uri.EscapeDataString(appointmentId)}" +
                                         $"&date={Uri.EscapeDataString(proposedDate ?? string.Empty)}" +
                                         $"&time={Uri.EscapeDataString(proposedTime ?? string.Empty)}";

                        // “Pick another time” (pre-fill advisor)
                        var pickAnotherUrl = $"{baseUrl}/Stakeholder/Appointment?advisor={Uri.EscapeDataString(advisorId ?? string.Empty)}&from=reschedule-email";

                        var html = BuildRescheduleEmailHtml(
                            stakeholderName, advisorName, reason, proposedDate, proposedTime, confirmUrl, pickAnotherUrl,
                            isDecline: normalizedStatus == "Declined");

                        var subject = normalizedStatus == "Rescheduled"
                            ? $"Reschedule proposal — {advisorName}"
                            : $"Appointment declined — {advisorName}";

                        await _email.SendEmailAsync(stakeholderEmail, subject, html);
                        _logger.LogInformation("{Status} email sent for appointment {AppointmentId} to {Email}",
                            normalizedStatus, appointmentId, stakeholderEmail);
                    }
                    else
                    {
                        _logger.LogWarning("{Status} email skipped: no stakeholder email on appointment {AppointmentId}",
                            normalizedStatus, appointmentId);
                    }
                }

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
        #endregion

        #region Public (Stakeholder) — ConfirmReschedule
        // This endpoint lets the stakeholder accept the proposed time from the email.
        // It also sends the same QR confirmation email as the normal Accepted flow.
        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> ConfirmReschedule(string a, string date, string time)
        {
            if (string.IsNullOrWhiteSpace(a))
                return BadRequest("Missing appointment id.");

            var docRef = _firestoreDb.Collection("appointments").Document(a);
            var snap = await docRef.GetSnapshotAsync();
            if (!snap.Exists) return NotFound("Appointment not found.");

            // If not provided, fall back to proposed fields on the document
            if (string.IsNullOrWhiteSpace(date))
                date = snap.ContainsField("ProposedNewDate") ? snap.GetValue<string>("ProposedNewDate") : null;
            if (string.IsNullOrWhiteSpace(time))
                time = snap.ContainsField("ProposedNewTime") ? snap.GetValue<string>("ProposedNewTime") : null;

            // Update to Accepted with the (new) date/time
            await docRef.UpdateAsync(new Dictionary<string, object>
            {
                { "Date", date ?? (snap.ContainsField("Date") ? snap.GetValue<string>("Date") : null) },
                { "Time", time ?? (snap.ContainsField("Time") ? snap.GetValue<string>("Time") : null) },
                { "Status", "Accepted" },
                { "UpdatedAt", Timestamp.FromDateTime(DateTime.UtcNow) }
            });

            // Send the same QR confirmation email used in the Accepted path
            snap = await docRef.GetSnapshotAsync();
            var stakeholderEmail =
                snap.ContainsField("StakeholderEmail") ? snap.GetValue<string>("StakeholderEmail")
                : (snap.ContainsField("stakeholderEmail") ? snap.GetValue<string>("stakeholderEmail") : null);

            if (!string.IsNullOrWhiteSpace(stakeholderEmail))
            {
                // 1) Create token
                var (rawToken, tokenId) = await _tokenService.CreateOneTimeTokenAsync(a, TimeSpan.FromHours(24));

                // 2) Build URL
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var checkInUrl = $"{baseUrl}/CheckIn?t={Uri.EscapeDataString(rawToken)}&a={Uri.EscapeDataString(a)}";

                // 3) QR
                var qrPng = _qr.GeneratePng(checkInUrl, 8);

                // 4) Body
                var html = BuildConfirmationEmailHtml(checkInUrl);

                // 5) Send
                await _email.SendEmailWithAttachmentAsync(
                    to: stakeholderEmail,
                    subject: "Your appointment is confirmed — CHIETA",
                    htmlBody: html,
                    attachmentBytes: qrPng,
                    attachmentName: "appointment-qr.png",
                    contentId: "qrCode"
                );

                // 6) Mark sent
                await docRef.UpdateAsync(new Dictionary<string, object>
                {
                    { "ConfirmationEmailSent", true },
                    { "ConfirmationEmailSentAt", Timestamp.FromDateTime(DateTime.UtcNow) }
                });

                _logger.LogInformation("ConfirmReschedule → Accepted for {AppointmentId}, token {TokenId}, email sent to {Email}.",
                    a, tokenId, stakeholderEmail);
            }

            // Simple thank-you page for now
            return Content("Thank you! Your new appointment time has been confirmed. A confirmation email has been sent.");
        }
        #endregion

        #region Helpers (Email HTML, etc.)
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

        private static string BuildRescheduleEmailHtml(
            string stakeholderName,
            string advisorName,
            string reason,
            string proposedDate,
            string proposedTime,
            string confirmUrl,
            string pickAnotherUrl,
            bool isDecline)
        {
            var sb = new StringBuilder();

            sb.AppendLine("<!DOCTYPE html>");
            sb.AppendLine("<html><head><meta charset='UTF-8'><title>Appointment Update</title></head>");
            sb.AppendLine("<body style='font-family:Segoe UI, Arial, sans-serif; background:#f6f8fb; margin:0; padding:24px;'>");
            sb.AppendLine("<div style='max-width:620px; margin:auto; background:#fff; padding:24px; border-radius:12px; box-shadow:0 6px 20px rgba(0,0,0,0.06);'>");

            sb.AppendLine($"<h2 style='margin:0 0 12px; color:#0b61a4;'>Update from {System.Net.WebUtility.HtmlEncode(advisorName)}</h2>");
            sb.AppendLine($"<p style='margin:0 0 16px;'>Dear {System.Net.WebUtility.HtmlEncode(stakeholderName)},</p>");

            if (isDecline)
            {
                sb.AppendLine("<p style='margin:0 0 12px;'><strong>Status:</strong> Your appointment request was declined.</p>");
            }
            else
            {
                sb.AppendLine("<p style='margin:0 0 12px;'>There’s an update to your appointment.</p>");
            }

            if (!string.IsNullOrWhiteSpace(reason))
                sb.AppendLine($"<p style='margin:0 0 12px;'><strong>Reason:</strong> {System.Net.WebUtility.HtmlEncode(reason)}</p>");

            if (!string.IsNullOrWhiteSpace(proposedDate) || !string.IsNullOrWhiteSpace(proposedTime))
            {
                sb.AppendLine("<div style='margin:12px 0; padding:12px 14px; background:#f1f7ff; border:1px solid #d7e7ff; border-radius:8px;'>");
                var label = isDecline ? "Suggested alternative time" : "Proposed new time";
                sb.AppendLine($"<div style='font-weight:600; margin-bottom:6px;'>{label}</div>");
                sb.AppendLine($"<div>{System.Net.WebUtility.HtmlEncode(proposedDate ?? "(date tbc)")} at {System.Net.WebUtility.HtmlEncode(proposedTime ?? "(time tbc)")}</div>");
                sb.AppendLine("</div>");

                // Confirm only visible if a time was suggested
                sb.AppendLine($"<p style='margin:16px 0;'><a href='{confirmUrl}' style='display:inline-block; background:#28a745; color:#fff; padding:12px 18px; border-radius:8px; text-decoration:none;'>✔ Confirm this time</a></p>");
            }
            else
            {
                if (isDecline)
                    sb.AppendLine("<p style='margin:0 0 12px;'>No alternative time was provided.</p>");
                else
                    sb.AppendLine("<p style='margin:0 0 12px;'>The advisor requested a reschedule but did not provide a specific time.</p>");
            }

            sb.AppendLine($"<p style='margin:8px 0 16px;'>Prefer a different time? <a href='{pickAnotherUrl}' style='color:#0b61a4;'>Choose another slot</a>.</p>");
            sb.AppendLine("<p style='margin:0;'>Kind regards,<br><strong>CHIETA Appointments</strong></p>");
            sb.AppendLine("</div></body></html>");

            return sb.ToString();
        }
        #endregion
    }
}





