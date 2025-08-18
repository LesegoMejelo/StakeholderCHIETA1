using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using StakeholderCHIETA.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;



namespace StakeholderApp.Controllers
{
    public class AppointmentController : Controller
    {
        private readonly FirestoreDb _firestoreDb;

        public AppointmentController(FirestoreDb firestoreDb)
        {
            _firestoreDb = firestoreDb;
        }

        // Show booking form
        [HttpGet]
        public IActionResult Book()
        {
            return View();
        }

        // Handle booking submission
        [HttpPost]
       
        public async Task<IActionResult> Book(Appointment appointment, string Time)
        {
            appointment.AppointmentId = Guid.NewGuid().ToString();
            appointment.Status = "Pending";

            // Combine Date + Time into one DateTime
            if (!string.IsNullOrEmpty(Time))
            {
                var parsedTime = TimeSpan.Parse(Time);
                appointment.Date = appointment.Date.Date + parsedTime;
            }

            var docRef = _firestoreDb.Collection("appointments").Document(appointment.AppointmentId);
            await docRef.SetAsync(appointment);

            ViewBag.Message = "Appointment request sent!";
            return View();
        }


        // Advisor dashboard (view all appointments)
        [HttpGet]
        public async Task<IActionResult> Dashboard()
        {
            var snapshot = await _firestoreDb.Collection("appointments").GetSnapshotAsync();
            var appointments = snapshot.Documents.Select(d => d.ConvertTo<StakeholderCHIETA.Models.Appointment>()).ToList();
            return View(appointments);
        }

        // Advisor accepts/rejects
        [HttpPost]
        public async Task<IActionResult> UpdateStatus(string appointmentId, string status)
        {
            var docRef = _firestoreDb.Collection("appointments").Document(appointmentId);
            await docRef.UpdateAsync("Status", status);

            return RedirectToAction("Dashboard");
        }
    }
}
