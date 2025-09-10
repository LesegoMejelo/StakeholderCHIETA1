using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace StakeholderCHIETA.Controllers
{
    [Authorize(Roles = "Advisor")]
    public class AdvisorAppointment : Controller
    {
        private readonly FirestoreDb _firestoreDb;

        public AdvisorAppointment(FirestoreDb firestoreDb)
        {
            _firestoreDb = firestoreDb;
        }

        // GET: Load appointment tracker page
        [HttpGet]
        public IActionResult AppointmentTracker()
        {
            return View("~/Views/EmployeeViews/AppointmentTracker.cshtml");
        }

        // GET: Return ALL appointments for this advisor (not just pending)
        [HttpGet]
        public async Task<IActionResult> AppointmentTrackerData()
        {
            var advisorUid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(advisorUid))
                return Unauthorized();

            // Fetch ALL appointments for this advisor
            var snapshot = await _firestoreDb.Collection("appointments")
                                             .WhereEqualTo("AdvisorId", advisorUid)
                                             .OrderBy("Date")
                                             .GetSnapshotAsync();

            var appointments = snapshot.Documents
                .Select(d => new
                {
                    Id = d.Id,
                    ClientName = d.ContainsField("ClientName") ? d.GetValue<string>("ClientName") : "",
                    Reason = d.ContainsField("Reason") ? d.GetValue<string>("Reason") : "",
                    Date = d.ContainsField("Date") ? d.GetValue<string>("Date") : "",
                    Time = d.ContainsField("Time") ? d.GetValue<string>("Time") : "",
                    Status = d.ContainsField("Status") ? d.GetValue<string>("Status") : "",
                    DeclineReason = d.ContainsField("DeclineReason") ? d.GetValue<string>("DeclineReason") : "",
                    ProposedNewDate = d.ContainsField("ProposedNewDate") ? d.GetValue<string>("ProposedNewDate") : "",
                    ProposedNewTime = d.ContainsField("ProposedNewTime") ? d.GetValue<string>("ProposedNewTime") : ""
                })
                .OrderBy(a => a.Date)
                .ThenBy(a => a.Time)
                .ToList();

            return Json(appointments);
        }


        // POST: Accept or Decline appointment
        [HttpPost]
        public async Task<IActionResult> UpdateStatus(string appointmentId, string status, string declineReason = null, string newDate = null, string newTime = null)
        {
            if (string.IsNullOrEmpty(appointmentId) || string.IsNullOrEmpty(status))
                return BadRequest("Invalid request");

            var docRef = _firestoreDb.Collection("appointments").Document(appointmentId);

            var updateData = new Dictionary<string, object>
            {
                { "Status", char.ToUpper(status[0]) + status.Substring(1) } // Accepted / Declined
            };

            if (status.ToLower() == "declined")
            {
                updateData["DeclineReason"] = declineReason ?? "";
                if (!string.IsNullOrEmpty(newDate))
                    updateData["ProposedNewDate"] = newDate;
                if (!string.IsNullOrEmpty(newTime))
                    updateData["ProposedNewTime"] = newTime;
            }

            await docRef.UpdateAsync(updateData);

            return Ok(new { success = true });
        }
    }
}