namespace StakeholderCHIETA.Services
{
    public class AppointmentQRService : IAppointmentQRService
    {
        private readonly ITokenService _tokens;
        private readonly IQRCodeGenerator _qrs;
        private readonly IEmailService _email;
        private readonly IHttpContextAccessor _http;

        public AppointmentQRService(
            ITokenService tokens,
            IQRCodeGenerator qrs,
            IEmailService email,
            IHttpContextAccessor http)
        {
            _tokens = tokens;
            _qrs = qrs;
            _email = email;
            _http = http;
        }

        public async Task SendAppointmentQRAsync(string appointmentId, string stakeholderEmail, TimeSpan ttl)
        {
            var (raw, tokenId) = await _tokens.CreateOneTimeTokenAsync(appointmentId, ttl);
            var rawCombined = $"{raw}|{tokenId}";

            var req = _http.HttpContext!.Request;
            var baseUrl = $"{req.Scheme}://{req.Host}";
            var checkInUrl = $"{baseUrl}/CheckIn?t={Uri.EscapeDataString(rawCombined)}&a={Uri.EscapeDataString(appointmentId)}";

            var pngBytes = _qrs.GeneratePng(checkInUrl);

            await _email.SendAsync(
                to: stakeholderEmail,
                subject: "Your Appointment QR Code",
                htmlBody: $@"
                    <p>Please bring this QR to your appointment.</p>
                    <p>If the QR doesn’t scan, tap this link: <a href=""{checkInUrl}"">{checkInUrl}</a></p>
                ",
                attachmentFileName: "appointment-qr.png",
                attachmentBytes: pngBytes,
                attachmentContentType: "image/png"
            );
        }
    }
}



























/* using StakeholderCHIETA.Models;
using System.Text.Json;

namespace StakeholderCHIETA.Services
{
    using global::StakeholderCHIETA.Services.StakeholderCHIETA.Services.StakeholderCHIETA.Services;
    using Microsoft.AspNetCore.Http;
    using System;

    namespace StakeholderCHIETA.Services
    {
        public class AppointmentQRService : IAppointmentQRService
        {
            private readonly ITokenService _tokens;
            private readonly IQRCodeGenerator _qrs;
            private readonly IEmailService _email;
            private readonly IHttpContextAccessor _http;

            public AppointmentQRService(
                ITokenService tokens,
                IQRCodeGenerator qrs,
                IEmailService email,
                IHttpContextAccessor http)
            {
                _tokens = tokens;
                _qrs = qrs;
                _email = email;
                _http = http;
            }

            public async Task SendAppointmentQRAsync(string appointmentId, string stakeholderEmail, TimeSpan ttl)
            {
                var (raw, tokenId) = await _tokens.CreateOneTimeTokenAsync(appointmentId, ttl);
                var rawCombined = $"{raw}|{tokenId}";

                var req = _http.HttpContext!.Request;
                var baseUrl = $"{req.Scheme}://{req.Host}";
                var checkInUrl = $"{baseUrl}/CheckIn?t={Uri.EscapeDataString(rawCombined)}&a={Uri.EscapeDataString(appointmentId)}";

                var pngBytes = _qrs.GeneratePng(checkInUrl);

                await _email.SendAsync(
                    to: stakeholderEmail,
                    subject: "Your Appointment QR Code",
                    htmlBody: $@"
                    <p>Please bring this QR to your appointment.</p>
                    <p>If the QR doesn’t scan, tap this link: <a href=""{checkInUrl}"">{checkInUrl}</a></p>
                ",
                    attachmentFileName: "appointment-qr.png",
                    attachmentBytes: pngBytes,
                    attachmentContentType: "image/png"
                );
            }
        }
    }



}
*/
