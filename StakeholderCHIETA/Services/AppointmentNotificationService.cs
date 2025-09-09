/* namespace StakeholderCHIETA.Services;

    public interface IAppointmentNotificationService
{
    Task SendAppointmentConfirmationAsync(string appointmentID, string userId);
}

    public class AppointmentNotificationService : IAppointmentNotificationService
    {
    private readonly ITokenService _tokenService;
    private readonly IAppointmentQRService _appointmentQRService;
    private readonly IEmailService _emailService;

    public AppointmentNotificationService(ITokenService tokenService, IAppointmentQRService appointmentQRService,IEmailService emailService)
    {
        _tokenService = tokenService;
        _emailService = emailService;
        _appointmentQRService = appointmentQRService;
    }

    public async Task SendAppointmentConfirmationAsync (string appointmentID, string userId, IAppointmentQRService _appointmentQRService)
    {
        var email= await _tokenService.GetUserEmailAsync(userId);
        if (string.IsNullOrEmpty(email))
            throw new Exception("Email not found for user in Firebase");
        var QRBytes = await _appointmentQRService.GenerateAppointmentQrAsync(appointmentID: appointmentID);

        string subject = "Your Appointment is Confirmed!";
        string body = $"Hello, your appointment ({appointmentID}) has been confirmed" + 
            $"Please find your QR Code below. Note that this QR Code grants you access into the building";
    }
    
    public async Task SendAppointmentConfirmationAsync(
    string appointmentID,
    string userId,
    IAppointmentQRService _appointmentQRService,
    IEmailService _emailService)
    {
        // Get the user email
        var email = await _tokenService.GetUserEmailAsync(userId);
        if (string.IsNullOrEmpty(email))
            throw new Exception("Email not found for user in Firebase");

        // Generate the QR code bytes
        var QRBytes = await _appointmentQRService.GenerateAppointmentQrAsync(appointmentID);

        // Prepare email content
        string subject = "Your Appointment is Confirmed!";
        string body = $"Hello, your appointment ({appointmentID}) has been confirmed. " +
                      $"Please find your QR Code attached. Note that this QR Code grants you access into the building.";

        // Send the email with QR code attachment
        await _emailService.SendEmailAsync(
            to: email,
            subject: subject,
            body: body,
            attachmentBytes: QRBytes,
            attachmentName: "AppointmentQR.png"
        );
    }

}

*/