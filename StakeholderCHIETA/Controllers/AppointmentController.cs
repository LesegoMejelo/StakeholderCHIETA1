using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Staekholder_CHIETA_X.Controllers
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
            try
            {
                Console.WriteLine("Loading appointment page...");

                var advisorsSnapshot = await _db.Collection("Users")
                                                .WhereEqualTo("Role", "Advisor")
                                                .GetSnapshotAsync();

                var advisors = advisorsSnapshot.Documents
                                    .Select(d => new AdvisorViewModel
                                    {
                                        Id = d.Id,
                                        Name = d.GetValue<string>("Name")
                                    })
                                    .ToList();

                Console.WriteLine($"Found {advisors.Count} advisors");
                foreach (var advisor in advisors)
                {
                    Console.WriteLine($"Advisor: {advisor.Name} (ID: {advisor.Id})");
                }

                return View("~/Views/StakeholderViews/Appointment/Appointment.cshtml", advisors);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading advisors: {ex.Message}");
                // Return empty list if there's an error, so the page still loads
                return View("~/Views/StakeholderViews/Appointment/Appointment.cshtml", new List<AdvisorViewModel>());
            }
        }

        // POST: Save appointment
        [HttpPost]
        [Route("api/appointment")]
        public async Task<IActionResult> Post(
            [FromForm] string advisor,
            [FromForm] string reason,
            [FromForm] string date,
            [FromForm] string time,
            [FromForm] string appointmentType = "online", // Default to online if not specified
            [FromForm] string details = "") // Optional additional details
        {
            try
            {
                Console.WriteLine("=== Appointment Submission ===");
                Console.WriteLine($"Advisor: {advisor}");
                Console.WriteLine($"Reason: {reason}");
                Console.WriteLine($"Date: {date}");
                Console.WriteLine($"Time: {time}");
                Console.WriteLine($"Type: {appointmentType}");
                Console.WriteLine($"Details: {details}");

                if (string.IsNullOrWhiteSpace(advisor) ||
                    string.IsNullOrWhiteSpace(reason) ||
                    string.IsNullOrWhiteSpace(date) ||
                    string.IsNullOrWhiteSpace(time))
                {
                    return BadRequest(new { message = "All required fields must be provided." });
                }

                // Get advisor information
                var advisorDoc = await _db.Collection("Users").Document(advisor).GetSnapshotAsync();
                if (!advisorDoc.Exists)
                {
                    Console.WriteLine($"Advisor with ID {advisor} not found");
                    return BadRequest(new { message = "Selected advisor not found" });
                }

                var advisorName = advisorDoc.GetValue<string>("Name");
                var clientName = User.Identity?.Name ?? "Anonymous User";

                Console.WriteLine($"Creating appointment for {clientName} with {advisorName}");

                // Create appointment document
                var appointmentData = new
                {
                    AdvisorId = advisor,
                    AdvisorName = advisorName,
                    ClientName = clientName,
                    Reason = reason,
                    Date = date,
                    Time = time,
                    AppointmentType = appointmentType, // Add appointment type
                    Status = "Pending",
                    CreatedAt = Timestamp.GetCurrentTimestamp(),
                    Details = !string.IsNullOrEmpty(details) ? details : null // Only include if provided
                };

                var docRef = await _db.Collection("appointments").AddAsync(appointmentData);

                Console.WriteLine($"Appointment created successfully with ID: {docRef.Id}");

                return Ok(new
                {
                    id = docRef.Id,
                    message = "Appointment booked successfully!",
                    appointmentDetails = new
                    {
                        id = docRef.Id,
                        advisorName = advisorName,
                        clientName = clientName,
                        date = date,
                        time = time,
                        type = appointmentType,
                        reason = reason
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating appointment: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { message = $"Failed to book appointment: {ex.Message}" });
            }
        }
    }

    public class AdvisorViewModel
    {
        public string Id { get; set; }
        public string Name { get; set; }
    }
}