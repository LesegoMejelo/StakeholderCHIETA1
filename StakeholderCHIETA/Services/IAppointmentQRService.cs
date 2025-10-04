using System.Threading.Tasks;

namespace StakeholderCHIETA.Services
{
    public interface IAppointmentQRService
    {
        /// <summary>
        /// Generates a one-time token + QR and emails the stakeholder a confirmation.
        /// Pass an absolute base URL like "https://your-app.com".
        /// </summary>
        Task SendConfirmationAsync(string appointmentId, string stakeholderEmail, string baseUrl);
    }
}

