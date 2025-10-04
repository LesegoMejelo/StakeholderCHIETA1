using System;
using System.Text;
using Google.Cloud.Firestore;

namespace StakeholderCHIETA.Services
{
    public class AppointmentQRService : IAppointmentQRService
    {
        private readonly ITokenService _tokenService;
        private readonly IQRCodeGenerator _qr;
        private readonly IEmailService _email;
        private readonly FirestoreDb _db;

        public AppointmentQRService(
            ITokenService tokenService,
            IQRCodeGenerator qr,
            IEmailService email,
            FirestoreDb db)
        {
            _tokenService = tokenService;
            _qr = qr;
            _email = email;
            _db = db;
        }

        public async Task SendConfirmationAsync(string appointmentId, string stakeholderEmail, string baseUrl)
        {
            if (string.IsNullOrWhiteSpace(appointmentId))
                throw new ArgumentException("appointmentId is required", nameof(appointmentId));
            if (string.IsNullOrWhiteSpace(stakeholderEmail))
                throw new ArgumentException("stakeholderEmail is required", nameof(stakeholderEmail));
            if (string.IsNullOrWhiteSpace(baseUrl))
                throw new ArgumentException("baseUrl is required", nameof(baseUrl));

            // 🔁 REPLACEMENT FOR GenerateSecureToken:
            // Create a one-time token (valid 24h). This matches ITokenService.
            var (rawToken, tokenId) = await _tokenService.CreateOneTimeTokenAsync(appointmentId, TimeSpan.FromHours(24));

            // Build the check-in URL (encoded)
            var checkInUrl = $"{baseUrl.TrimEnd('/')}/CheckIn" +
                             $"?t={Uri.EscapeDataString(rawToken)}&a={Uri.EscapeDataString(appointmentId)}";

            // Generate QR PNG (byte[])
            var qrPng = _qr.GeneratePng(checkInUrl, 8); // adjust pixelsPerModule if you like

            // Nice HTML with inline QR (cid:qrCode)
            var html = BuildHtml(checkInUrl);

            // Send the email
            await _email.SendEmailWithAttachmentAsync(
                to: stakeholderEmail,
                subject: "Your appointment is confirmed — CHIETA",
                htmlBody: html,
                attachmentBytes: qrPng,
                attachmentName: "appointment-qr.png",
                contentId: "qrCode"
            );

            // Optional: mark email-sent on the appointment to avoid duplicates
            var docRef = _db.Collection("appointments").Document(appointmentId);
            await docRef.UpdateAsync(new Dictionary<string, object>
            {
                { "ConfirmationEmailSent", true },
                { "ConfirmationEmailSentAt", Timestamp.FromDateTime(DateTime.UtcNow) }
            });
        }

        private static string BuildHtml(string checkInUrl)
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
