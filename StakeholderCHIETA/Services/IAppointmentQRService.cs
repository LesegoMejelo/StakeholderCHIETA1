using System;
using System.Threading.Tasks;

namespace StakeholderCHIETA.Services
{
    public interface IAppointmentQRService
    {
        Task SendAppointmentQRAsync(string appointmentId, string stakeholderEmail, TimeSpan ttl);
    }
}
