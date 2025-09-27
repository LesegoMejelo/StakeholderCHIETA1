using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
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

        // GET: Page
        [HttpGet]
        public IActionResult AppointmentTracker()
        {
            return View("~/Views/EmployeeViews/AppointmentTracker.cshtml");
        }

        // GET: Data
        [HttpGet]
        public async Task<IActionResult> AppointmentTrackerData()
        {
            var advisorUid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(advisorUid))
                return Unauthorized();

            var snapshot = await _firestoreDb.Collection("appointments")
                                             .WhereEqualTo("AdvisorId", advisorUid)
                                             .GetSnapshotAsync();

            var appointments = snapshot.Documents.Select(d => new
            {
                Id = d.Id,
                ClientName = d.ContainsField("ClientName") ? d.GetValue<string>("ClientName") : "",
                Reason = d.ContainsField("Reason") ? d.GetValue<string>("Reason") : "",
                Date = d.ContainsField("Date") ? d.GetValue<string>("Date") : "",
                Time = d.ContainsField("Time") ? d.GetValue<string>("Time") : "",
                Status = d.ContainsField("Status") ? d.GetValue<string>("Status") : ""
            }).ToList();

            return Json(appointments);
        }

        // POST: Accept/Decline
        [HttpPost]
        public async Task<IActionResult> UpdateStatus(string appointmentId, string status)
        {
            if (string.IsNullOrEmpty(appointmentId) || string.IsNullOrEmpty(status))
                return BadRequest("Invalid request");

            var docRef = _firestoreDb.Collection("appointments").Document(appointmentId);

            var updateData = new Dictionary<string, object>
            {
                { "Status", char.ToUpper(status[0]) + status.Substring(1) } // Accepted / Declined
            };

            await docRef.UpdateAsync(updateData);

            return Ok(new { success = true });
        }
    }
}
