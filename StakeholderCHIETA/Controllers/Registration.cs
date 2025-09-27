using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace StakeholderCHIETA.Controllers
{
    [Authorize(Roles = "Admin")]
    [Route("Auth")]
    public class RegistrationController : Controller
    {
        private readonly FirestoreDb _firestoreDb;
        private readonly FirebaseAuth _auth;

        public RegistrationController(FirestoreDb firestoreDb, FirebaseAuth auth)
        {
            _firestoreDb = firestoreDb;
            _auth = auth;
        }

        [HttpGet("Dashboard")]
        public IActionResult Index()
        {
            return View("~/Views/AdminViews/AdminDashboard.cshtml");
        }

        // POST: /Auth/RegisterUser
        [HttpPost("RegisterUser")]
        public async Task<IActionResult> RegisterUser([FromBody] RegisterUserDto dto)
        {
            if (string.IsNullOrEmpty(dto.Email) || string.IsNullOrEmpty(dto.Password) ||
                string.IsNullOrEmpty(dto.Name) || string.IsNullOrEmpty(dto.Role))
            {
                return BadRequest(new { message = "All fields are required." });
            }

            try
            {
                var userRecordArgs = new UserRecordArgs
                {
                    Email = dto.Email,
                    Password = dto.Password,
                    DisplayName = dto.Name,
                    Disabled = false
                };

                var userRecord = await _auth.CreateUserAsync(userRecordArgs);

                var role = char.ToUpper(dto.Role[0]) + dto.Role.Substring(1).ToLower();

                var userData = new Dictionary<string, object>
                {
                    { "Name", dto.Name },
                    { "Role", role },
                    { "email", dto.Email },
                    { "password", dto.Password }, 
                    { "createdAt", Timestamp.GetCurrentTimestamp() }
                };

                await _firestoreDb.Collection("Users").Document(userRecord.Uid).SetAsync(userData);

                return Ok(new { message = $"✅ {role} user created successfully!", uid = userRecord.Uid });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: /Auth/GetUsers
        [HttpGet("GetUsers")]
        public async Task<IActionResult> GetUsers()
        {
            try
            {
                var usersRef = _firestoreDb.Collection("Users");
                var snapshot = await usersRef.GetSnapshotAsync();

                var users = new List<object>();

                foreach (var doc in snapshot.Documents)
                {
                    users.Add(new
                    {
                        id = doc.Id,
                        name = doc.ContainsField("Name") ? doc.GetValue<string>("Name") : "",
                        email = doc.ContainsField("email") ? doc.GetValue<string>("email") : "",
                        role = doc.ContainsField("Role") ? doc.GetValue<string>("Role") : ""
                    });
                }

                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching users", error = ex.Message });
            }
        }

        // DELETE: /Auth/DeleteUser/{id}
        [HttpDelete("DeleteUser/{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            try
            {
                // Delete from FirebaseAuth
                await _auth.DeleteUserAsync(id);

                // Delete from Firestore
                await _firestoreDb.Collection("Users").Document(id).DeleteAsync();

                return Ok(new { message = "✅ User deleted successfully!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error deleting user: {ex.Message}" });
            }
        }
    }

    public class RegisterUserDto
    {
        public string Name { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public string Role { get; set; }
    }
}
