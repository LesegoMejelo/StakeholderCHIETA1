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
                advisorId = advisor,
                reason = reason,
                date = date,
                time = time,
                status = "Pending",
                createdAt = Timestamp.GetCurrentTimestamp()
            });

            return Ok(new { id = docRef.Id, message = "Appointment booked" });
        }

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Book()
        {
            return View("~/Views/Appointment/Book.cshtml");
        }
    }
}
