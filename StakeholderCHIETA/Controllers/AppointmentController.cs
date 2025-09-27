using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace StakeholderCHIETA.Controllers
{
    public class AppointmentController : Controller
    {
        private readonly FirestoreDb _db;

        public AppointmentController(FirestoreDb db)
        {
            _db = db;
        }

        // GET: Appointment page
        public async Task<IActionResult> Index()
        {
            var advisorsSnapshot = await _db.Collection("Users")
                                            .WhereEqualTo("Role", "Advisor")
                                            .GetSnapshotAsync();

            var advisors = advisorsSnapshot.Documents
                                .Select(d => new AdvisorViewModel
                                {
                                    Uid = d.Id,
                                    Name = d.GetValue<string>("Name")
                                })
                                .ToList();

            return View("~/Views/StakeholderViews/Appointment/Appointment.cshtml", advisors);
        }

        // POST: Save appointment
        [HttpPost]
        [Route("api/appointment")]
        public async Task<IActionResult> Post(
            [FromForm] string advisorUid,
            [FromForm] string reason,
            [FromForm] string date,
            [FromForm] string time)
        {
            if (string.IsNullOrWhiteSpace(advisorUid) ||
                string.IsNullOrWhiteSpace(reason) ||
                string.IsNullOrWhiteSpace(date) ||
                string.IsNullOrWhiteSpace(time))
            {
                return BadRequest(new { message = "All fields are required." });
            }

            try
            {
                var advisorDoc = await _db.Collection("Users").Document(advisorUid).GetSnapshotAsync();
                if (!advisorDoc.Exists)
                    return BadRequest(new { message = "Advisor not found" });

                var advisorName = advisorDoc.GetValue<string>("Name");
                var clientName = User.Identity?.Name ?? "Unknown";

                var docRef = await _db.Collection("appointments").AddAsync(new
                {
                    AdvisorId = advisorUid, // 🔑 will be used on advisor side
                    AdvisorName = advisorName,
                    ClientName = clientName,
                    Reason = reason,
                    Date = date,
                    Time = time,
                    Status = "Pending",
                    CreatedAt = Timestamp.GetCurrentTimestamp()
                });

                return Ok(new { id = docRef.Id, message = "Appointment booked successfully!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Failed to book appointment: {ex.Message}" });
            }
        }
    }

    public class AdvisorViewModel
    {
        public string Uid { get; set; }
        public string Name { get; set; }
    }
}
