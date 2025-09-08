using StakeholderCHIETA.Models;

namespace StakeholderCHIETA.Services
{
    public interface IAppointmentQRService
    {
        Task SendAppointmentQREmailAsync(Appointment appointment, string userEmail);
        bool ValidateQRCode(string qrData);
    }
}
