using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace StakeholderCHIETA.Controllers
{
    [Authorize(Roles = "Advisor")]
    public class AdvisorAppointmentController : Controller
    {
        private readonly FirestoreDb _firestoreDb;

        public AdvisorAppointmentController(FirestoreDb firestoreDb)
        {
            _firestoreDb = firestoreDb;
        }

        // GET: Load pending appointments for advisor
        [HttpGet]
        public async Task<IActionResult> AppointmentTracker()
        {
            var advisorUid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var snapshot = await _firestoreDb.Collection("appointments")
                                 .WhereEqualTo("AdvisorId", advisorUid)
                                 .WhereEqualTo("Status", "Pending")
                                 .GetSnapshotAsync();

            var appointments = snapshot.Documents
                .Select(d => new AppointmentViewModel
                {
                    Id = d.Id,
                    ClientName = d.GetValue<string>("ClientName"),
                    Reason = d.GetValue<string>("Reason"),
                    Date = d.GetValue<string>("Date"),
                    Time = d.GetValue<string>("Time"),
                    Status = d.GetValue<string>("Status")
                })
                .OrderBy(a => a.Date) // sort in memory
                .ToList();

            return View("~/Views/EmployeeViews/AppointmentTracker.cshtml", appointments);
        }

        // POST: Accept/Decline
        [HttpPost]
        public async Task<IActionResult> UpdateStatus(string appointmentId, string status)
        {
            if (string.IsNullOrEmpty(appointmentId) || string.IsNullOrEmpty(status))
                return BadRequest("Invalid request");

            var docRef = _firestoreDb.Collection("appointments").Document(appointmentId);
            await docRef.UpdateAsync("Status", status);

            return RedirectToAction("AppointmentTracker");
        }
    }

    public class AppointmentViewModel
    {
        public string Id { get; set; }
        public string ClientName { get; set; }
        public string Reason { get; set; }
        public string Date { get; set; }
        public string Time { get; set; }
        public string Status { get; set; }
    }
}
