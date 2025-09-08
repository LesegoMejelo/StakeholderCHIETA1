using StakeholderCHIETA.Models;

namespace StakeholderCHIETA.Services
{
    public interface IAppointmentQRService
    {
        /*Task GenerateAppointmentQrAsync(string appointmentID);
        Task SendAppointmentQREmailAsync(Appointment appointment, string userEmail);
        bool ValidateQRCode(string qrData);*/
        Task GenerateAppointmentQrAsync(string appointmentID);
    }
}
