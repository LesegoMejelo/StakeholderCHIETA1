using StakeholderCHIETA.Models;
using System.Text.Json;

namespace StakeholderCHIETA.Services
{
    
    
        public class AppointmentQRService : IAppointmentQRService
        {
            private readonly IEmailService _emailService;
            private readonly IQRCodeGenerator _qrCodeGenerator;
            private readonly ITokenService _tokenService;
            private readonly ILogger<AppointmentQRService> _logger;

            public AppointmentQRService(
                IEmailService emailService,
                IQRCodeGenerator qrCodeGenerator,
                ITokenService tokenService,
                ILogger<AppointmentQRService> logger)
            {
                _emailService = emailService;
                _qrCodeGenerator = qrCodeGenerator;
                _tokenService = tokenService;
                _logger = logger;
            }

            public async Task SendAppointmentQREmailAsync(Appointment appointment, string userEmail)
            {
                try
                {
                // Calculate expiry time (1 hour after appointment time)
                var expiryTime = DateTime.Parse((string)appointment.BookedDateTime).AddHours(1);


                // Generate validation token
                var validationToken = _tokenService.GenerateSecureToken();

                    // Create QR code data
                    var qrData = new QRCodeData
                    {
                        AppointmentId = (string)appointment.Id,
                        UserId = appointment.UserId,
                        ExpiryTime = expiryTime,
                        ValidationToken = validationToken
                    };

                    // Serialize QR data
                    var qrDataJson = JsonSerializer.Serialize(qrData);

                    // Generate QR code image
                    var qrCodeBytes = await _qrCodeGenerator.GenerateQRCodeAsync(qrDataJson);

                    // Store validation token (for later verification)
                    await _tokenService.StoreTokenAsync(validationToken, appointment.Id, expiryTime);

                    // Send email
                    await SendEmailWithQRCodeAsync(appointment, userEmail, qrCodeBytes, expiryTime);

                    _logger.LogInformation($"QR code email sent for appointment {appointment.Id}");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Failed to send QR code email for appointment {appointment.Id}");
                    throw;
                }
            }

            private async Task SendEmailWithQRCodeAsync(Appointment appointment, string userEmail,
                byte[] qrCodeBytes, DateTime expiryTime)
            {
                var emailSubject = $"Your Appointment QR Code - {appointment.Title}";
                var emailBody = $@"
            <html>
            <body>
                <h2>Your Appointment Confirmation</h2>
                <p>Dear Customer,</p>
                <p>Your appointment has been confirmed:</p>
                <ul>
                    <li><strong>Appointment:</strong> {appointment.Title}</li>
                    <li><strong>Date & Time:</strong> {appointment.BookedDateTime:yyyy-MM-dd HH:mm}</li>
                    <li><strong>Description:</strong> {appointment.Description}</li>
                </ul>
                <p>Please find your QR code attached below. This code will expire on {expiryTime:yyyy-MM-dd HH:mm}.</p>
                <p>Show this QR code when you arrive for your appointment.</p>
                <img src='cid:qrcode' alt='Appointment QR Code' style='max-width: 300px;'/>
                <p>Thank you!</p>
            </body>
            </html>";

                await _emailService.SendEmailWithAttachmentAsync(
                    userEmail,
                    emailSubject,
                    emailBody,
                    qrCodeBytes,
                    "qrcode.png",
                    "qrcode");
            }

            public bool ValidateQRCode(string qrData)
            {
                try
                {
                    var qrCodeData = JsonSerializer.Deserialize<QRCodeData>(qrData);

                    // Check if expired
                    if (DateTime.UtcNow > qrCodeData.ExpiryTime)
                    {
                        return false;
                    }

                    // Validate token
                    return _tokenService.ValidateToken(qrCodeData.ValidationToken, qrCodeData.AppointmentId);
                }
                catch
                {
                    return false;
                }
            }
        }
    }

