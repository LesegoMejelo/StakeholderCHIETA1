using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using StakeholderCHIETA.Models;
using System.Linq;
using System.Threading.Tasks;

namespace StakeholderCHIETA.Controllers
{
    public class AdvisorAppointmentController : Controller
    {
        private readonly FirestoreDb _firestoreDb;

        // ✅ Constructor name must match the class name
        public AdvisorAppointmentController(FirestoreDb firestoreDb)
        {
            _firestoreDb = firestoreDb;
        }

        // Default view
        public IActionResult Index()
        {
            return View();
        }

        // ✅ View all appointments
        [HttpGet]
        public async Task<IActionResult> Dashboard()
        {
            var snapshot = await _firestoreDb.Collection("appointments").GetSnapshotAsync();
            var appointments = snapshot.Documents
                .Select(d => d.ConvertTo<Appointment>())
                .ToList();

            return View(appointments);
        }

        // ✅ Accept or Reject appointment
        [HttpPost]
        public async Task<IActionResult> UpdateStatus(string appointmentId, string status)
        {
            var docRef = _firestoreDb.Collection("appointments").Document(appointmentId);
            await docRef.UpdateAsync("Status", status);

            return RedirectToAction("Dashboard");
        }
    }
}
