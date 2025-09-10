using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;

namespace Staekholder_CHIETA_X.Controllers
{
    public class AppointmentController : Controller
    {
        private readonly FirestoreDb _db;

        public AppointmentController(FirestoreDb db)
        {
            _db = db;
        }

        // GET: Display the Appointment page with advisors
        public async Task<IActionResult> Index()
        {
            // Fetch advisors from Users collection
            var advisorsSnapshot = await _db.Collection("Users")
                                            .WhereEqualTo("Role", "Advisor")
                                            .GetSnapshotAsync();

            // Map documents to a simple model
            var advisors = advisorsSnapshot.Documents
                                .Select(d => new AdvisorViewModel
                                {
                                    Id = d.Id,
                                    Name = d.GetValue<string>("Name")
                                })
                                .ToList();

            return View("~/Views/StakeholderViews/Appointment/Appointment.cshtml", advisors);
        }

        // POST: Save appointment to Firestore
        [HttpPost]
        [Route("api/appointment")]
        public async Task<IActionResult> Post(
            [FromForm] string advisor,
            [FromForm] string reason,
            [FromForm] string date,
            [FromForm] string time)
        {
            var docRef = await _db.Collection("appointments").AddAsync(new
            {
                Advisor = advisor,
                Reason = reason,
                Date = date,
                Time = time,
                Status = "Pending",
                createdAt = Timestamp.GetCurrentTimestamp()
            });

            return Ok(new { id = docRef.Id, message = "Appointment booked" });
        }
    }

    // Simple ViewModel for advisors
    public class AdvisorViewModel
    {
        public string Id { get; set; }
        public string Name { get; set; }
    }
}
