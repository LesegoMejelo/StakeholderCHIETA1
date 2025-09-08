namespace StakeholderCHIETA.Services;

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

    public Task SendAppointmentConfirmationAsync(string appointmentID, string userId)
    {
        return SendAppointmentConfirmationAsync(appointmentID, userId, _appointmentQRService);
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
    }

