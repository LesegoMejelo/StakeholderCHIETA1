using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization; 
using Microsoft.AspNetCore.Mvc;
using StakeholderCHIETA.Models;
using System.Linq;
using System.Threading.Tasks;
using StakeholderCHIETA.Filters;

namespace StakeholderCHIETA.Controllers
{
    // Apply authorization to the entire controller
    [Authorize(Roles = "Advisor, Admin")]
    public class AdvisorAppointmentController : Controller
    {
        private readonly FirestoreDb _firestoreDb;

        public AdvisorAppointmentController(FirestoreDb firestoreDb)
        {
            _firestoreDb = firestoreDb;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Dashboard()
        {
            var snapshot = await _firestoreDb.Collection("appointments").GetSnapshotAsync();
            var appointments = snapshot.Documents
                .Select(d => d.ConvertTo<Appointment>())
                .ToList();

            return View(appointments);
        }

        [HttpPost]
        public async Task<IActionResult> UpdateStatus(string appointmentId, string status)
        {
            var docRef = _firestoreDb.Collection("appointments").Document(appointmentId);
            await docRef.UpdateAsync("Status", status);

            return RedirectToAction("Dashboard");
        }
    }
}