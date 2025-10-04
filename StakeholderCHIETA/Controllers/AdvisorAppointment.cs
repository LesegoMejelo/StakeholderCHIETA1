using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;

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

        // GET: Load appointment tracker page
        [HttpGet]
        public IActionResult AppointmentTracker()
        {
            return View("~/Views/EmployeeViews/AppointmentTracker.cshtml");
        }
        public IActionResult BoardroomBooking()
        {
            return View("~/Views/EmployeeViews/BoardroomBooking.cshtml");
        }

        public IActionResult BoardroomBookingTracker()
        {
            return View("~/Views/EmployeeViews/BoardroomBookingTracker.cshtml");
        }

        // GET: Return ALL appointments for this advisor
        [HttpGet]
        public async Task<IActionResult> AppointmentTrackerData()
        {
            try
            {
                Console.WriteLine("=== AppointmentTrackerData method called ===");

                var advisorUid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                Console.WriteLine($"Advisor UID from claims: '{advisorUid}'");

                if (string.IsNullOrEmpty(advisorUid))
                {
                    Console.WriteLine("ERROR: Advisor UID is null or empty");
                    return Unauthorized(new { error = "User not authenticated" });
                }

                Console.WriteLine("Querying appointments...");

                // Query appointments where AdvisorId matches the logged-in advisor
                var appointmentsRef = _firestoreDb.Collection("appointments");
                var query = appointmentsRef.WhereEqualTo("AdvisorId", advisorUid);
                var snapshot = await query.GetSnapshotAsync();

                Console.WriteLine($"Query completed. Found {snapshot.Documents.Count} documents");

                var appointments = new List<Dictionary<string, object>>();

                foreach (var doc in snapshot.Documents)
                {
                    try
                    {
                        Console.WriteLine($"\n--- Processing document: {doc.Id} ---");

                        // Log all fields in the document
                        var docData = doc.ToDictionary();
                        Console.WriteLine("Document contains these fields:");
                        foreach (var kvp in docData)
                        {
                            Console.WriteLine($"  '{kvp.Key}': '{kvp.Value}' (Type: {kvp.Value?.GetType().Name})");
                        }

                        // Helper method to safely get string values
                        string GetStringValue(string fieldName)
                        {
                            try
                            {
                                if (doc.ContainsField(fieldName))
                                {
                                    var value = doc.GetValue<object>(fieldName);
                                    return value?.ToString() ?? "";
                                }
                                return "";
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"Error getting field '{fieldName}': {ex.Message}");
                                return "";
                            }
                        }

                        // Create appointment object using Dictionary to preserve exact property names for JSON serialization
                        var appointment = new Dictionary<string, object>
                        {
                            { "Id", doc.Id },
                            { "AdvisorId", GetStringValue("AdvisorId") },
                            { "AdvisorName", GetStringValue("AdvisorName") },
                            { "ClientName", GetStringValue("ClientName") },
                            { "Date", GetStringValue("Date") },
                            { "Reason", GetStringValue("Reason") },
                            { "Status", GetStringValue("Status") },
                            { "Time", GetStringValue("Time") },
                            { "DeclineReason", GetStringValue("DeclineReason") },
                            { "ProposedNewDate", GetStringValue("ProposedNewDate") },
                            { "ProposedNewTime", GetStringValue("ProposedNewTime") }
                        };

                        // Validate that we got the essential fields
                        if (string.IsNullOrEmpty(appointment["ClientName"]?.ToString()) &&
                            string.IsNullOrEmpty(appointment["Date"]?.ToString()) &&
                            string.IsNullOrEmpty(appointment["Time"]?.ToString()))
                        {
                            Console.WriteLine($"⚠️  Warning: Document {doc.Id} has empty essential fields");

                            // Try alternative field names (in case of case sensitivity issues)
                            appointment["AdvisorId"] = GetStringValue("advisorId") ?? GetStringValue("AdvisorId");
                            appointment["AdvisorName"] = GetStringValue("advisorName") ?? GetStringValue("AdvisorName");
                            appointment["ClientName"] = GetStringValue("clientName") ?? GetStringValue("ClientName");
                            appointment["Date"] = GetStringValue("date") ?? GetStringValue("Date");
                            appointment["Reason"] = GetStringValue("reason") ?? GetStringValue("Reason");
                            appointment["Status"] = GetStringValue("status") ?? GetStringValue("Status");
                            appointment["Time"] = GetStringValue("time") ?? GetStringValue("Time");
                            appointment["DeclineReason"] = GetStringValue("declineReason") ?? GetStringValue("DeclineReason");
                            appointment["ProposedNewDate"] = GetStringValue("proposedNewDate") ?? GetStringValue("ProposedNewDate");
                            appointment["ProposedNewTime"] = GetStringValue("proposedNewTime") ?? GetStringValue("ProposedNewTime");

                            Console.WriteLine($"✅ Used alternative field names for: {appointment["ClientName"]}");
                        }

                        appointments.Add(appointment);
                        Console.WriteLine($"✅ Successfully processed: {appointment["ClientName"]} on {appointment["Date"]} at {appointment["Time"]} - {appointment["Status"]}");
                    }
                    catch (Exception docEx)
                    {
                        Console.WriteLine($"❌ Error processing document {doc.Id}: {docEx.Message}");
                        Console.WriteLine($"Stack trace: {docEx.StackTrace}");

                        // Add a minimal appointment object for this document so it doesn't disappear completely
                        appointments.Add(new Dictionary<string, object>
                        {
                            { "Id", doc.Id },
                            { "AdvisorId", "" },
                            { "AdvisorName", "" },
                            { "ClientName", "Error loading appointment" },
                            { "Date", "" },
                            { "Reason", "Error occurred while loading" },
                            { "Status", "Error" },
                            { "Time", "" },
                            { "DeclineReason", "" },
                            { "ProposedNewDate", "" },
                            { "ProposedNewTime", "" }
                        });
                    }
                }

                // Sort by date and time
                var sortedAppointments = appointments
                    .OrderBy(a => a["Date"]?.ToString())
                    .ThenBy(a => a["Time"]?.ToString())
                    .ToList();

                Console.WriteLine($"\n=== Returning {sortedAppointments.Count} appointments ===");

                // Log the final JSON structure
                Console.WriteLine("Final appointment data structure:");
                foreach (var apt in sortedAppointments.Take(3)) // Just log first 3 to avoid spam
                {
                    Console.WriteLine($"Appointment: Id={apt["Id"]}, ClientName={apt["ClientName"]}, Date={apt["Date"]}, Time={apt["Time"]}, Status={apt["Status"]}");
                }

                return Json(sortedAppointments);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ FATAL ERROR: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return StatusCode(500, new
                {
                    error = "Internal server error",
                    message = ex.Message
                });
            }
        }

        // Alternative: Using a model class for better parameter handling
        public class UpdateAppointmentStatusRequest
        {
            public string AppointmentId { get; set; }
            public string Status { get; set; }
            public string DeclineReason { get; set; }
            public string NewDate { get; set; }
            public string NewTime { get; set; }
        }

        // POST: Accept or Decline appointment
        [HttpPost]
        public async Task<IActionResult> UpdateStatus([FromBody] UpdateAppointmentStatusRequest request)
        {
            var appointmentId = request.AppointmentId;
            var status = request.Status;
            var declineReason = request.DeclineReason;
            var newDate = request.NewDate;
            var newTime = request.NewTime;
            {
                try
                {
                    Console.WriteLine($"\n=== UpdateStatus called ===");
                    Console.WriteLine($"appointmentId: '{appointmentId}'");
                    Console.WriteLine($"status: '{status}'");
                    Console.WriteLine($"declineReason: '{declineReason}'");
                    Console.WriteLine($"newDate: '{newDate}'");
                    Console.WriteLine($"newTime: '{newTime}'");

                    if (string.IsNullOrEmpty(appointmentId) || string.IsNullOrEmpty(status))
                    {
                        Console.WriteLine("❌ Missing required parameters");
                        return BadRequest(new { error = "Missing appointmentId or status" });
                    }

                    var docRef = _firestoreDb.Collection("appointments").Document(appointmentId);

                    // Verify document exists
                    var docSnapshot = await docRef.GetSnapshotAsync();
                    if (!docSnapshot.Exists)
                    {
                        Console.WriteLine($"❌ Document {appointmentId} not found");
                        return NotFound(new { error = "Appointment not found" });
                    }

                    Console.WriteLine($"✅ Found appointment document");

                    // Prepare update data
                    var updateData = new Dictionary<string, object>
                    {
                        { "Status", char.ToUpper(status[0]) + status.Substring(1).ToLower() } // "Accepted" or "Declined"
                    };

                    if (status.ToLower() == "declined")
                    {
                        updateData["DeclineReason"] = declineReason ?? "";
                        if (!string.IsNullOrEmpty(newDate))
                            updateData["ProposedNewDate"] = newDate;
                        if (!string.IsNullOrEmpty(newTime))
                            updateData["ProposedNewTime"] = newTime;
                    }

                    Console.WriteLine("Updating with:");
                    foreach (var kvp in updateData)
                    {
                        Console.WriteLine($"  {kvp.Key}: '{kvp.Value}'");
                    }

                    await docRef.UpdateAsync(updateData);
                    Console.WriteLine($"✅ Successfully updated appointment {appointmentId}");

                    return Ok(new { success = true, message = "Appointment updated successfully" });
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ Error updating appointment: {ex.Message}");
                    Console.WriteLine($"Stack trace: {ex.StackTrace}");
                    return StatusCode(500, new
                    {
                        error = "Failed to update appointment",
                        message = ex.Message
                    });
                }
            }
        }
    }
}