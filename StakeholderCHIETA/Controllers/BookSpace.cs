using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace StakeholderCHIETA.Controllers
{
    [Authorize(Roles = "Advisor")]
    public class BookSpace : Controller
    {
        private readonly FirestoreDb _firestoreDb;

        public BookSpace(FirestoreDb firestoreDb)
        {
            _firestoreDb = firestoreDb;
        }

        // GET: Calendar/booking page
        [HttpGet("boardroom-booking")]
        [Authorize(Roles = "Advisor")]
        public IActionResult Book()
        {
            return View("~/Views/EmployeeViews/BoardroomBooking.cshtml");
        }

        // GET: Return bookings for a given month (to color calendar)
        [HttpGet]
        [Route("api/officebookings/month")]
        public async Task<IActionResult> GetBookingsForMonth(int year, int month)
        {
            var startDate = new DateTime(year, month, 1);
            var endDate = startDate.AddMonths(1);

            var snapshot = await _firestoreDb.Collection("officeBookings")
                                             .WhereGreaterThanOrEqualTo("Date", startDate.ToString("yyyy-MM-dd"))
                                             .WhereLessThan("Date", endDate.ToString("yyyy-MM-dd"))
                                             .GetSnapshotAsync();

            var bookings = snapshot.Documents.Select(d => new
            {
                Id = d.Id,
                Room = d.ContainsField("Room") ? d.GetValue<string>("Room") : "",
                Date = d.ContainsField("Date") ? d.GetValue<string>("Date") : "",
                TimeSlot = d.ContainsField("TimeSlot") ? d.GetValue<string>("TimeSlot") : "",
                Status = d.ContainsField("Status") ? d.GetValue<string>("Status") : "Booked"
            });

            return Json(bookings);
        }

        // POST: Book a room
        [HttpPost]
        [Route("api/officebookings")]
        public async Task<IActionResult> BookRoom(
            [FromForm] string room,
            [FromForm] string date,
            [FromForm] string timeSlot,
            [FromForm] string purpose,
            [FromForm] string email)
        {
            if (string.IsNullOrWhiteSpace(room) ||
                string.IsNullOrWhiteSpace(date) ||
                string.IsNullOrWhiteSpace(timeSlot) ||
                string.IsNullOrWhiteSpace(purpose) ||
                string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(new { message = "All fields are required." });
            }

            var advisorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Unknown";
            var advisorName = User.Identity?.Name ?? "Unknown";

            try
            {
                // Check if already booked
                var snapshot = await _firestoreDb.Collection("officeBookings")
                                                 .WhereEqualTo("Room", room)
                                                 .WhereEqualTo("Date", date)
                                                 .WhereEqualTo("TimeSlot", timeSlot)
                                                 .GetSnapshotAsync();

                if (snapshot.Any())
                {
                    return BadRequest(new { message = "This room is already booked for the selected time." });
                }

                var docRef = await _firestoreDb.Collection("officeBookings").AddAsync(new
                {
                    AdvisorId = advisorId,
                    AdvisorName = advisorName,
                    Email = email,
                    Room = room,
                    Date = date,
                    TimeSlot = timeSlot,
                    Purpose = purpose,
                    Status = "Booked",
                    CreatedAt = Timestamp.GetCurrentTimestamp()
                });

                return Ok(new { id = docRef.Id, message = "Room booked successfully!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Failed to book room: {ex.Message}" });
            }
        }

        // GET: My bookings (advisor history)
        [HttpGet]
        [Route("api/officebookings/my")]
        public async Task<IActionResult> MyBookings()
        {
            var advisorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(advisorId))
                return Unauthorized();

            var snapshot = await _firestoreDb.Collection("officeBookings")
                                             .WhereEqualTo("AdvisorId", advisorId)
                                             .OrderByDescending("Date")
                                             .GetSnapshotAsync();

            var bookings = snapshot.Documents.Select(d => new
            {
                Id = d.Id,
                Room = d.GetValue<string>("Room"),
                Date = d.GetValue<string>("Date"),
                TimeSlot = d.GetValue<string>("TimeSlot"),
                Purpose = d.GetValue<string>("Purpose"),
                Status = d.GetValue<string>("Status")
            });

            return Json(bookings);
        }
    }
}
