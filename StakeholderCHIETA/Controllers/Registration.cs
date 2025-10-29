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

        private static readonly HashSet<string> ValidProvinces = new(StringComparer.OrdinalIgnoreCase)
        {
            "Gauteng","Western Cape","KwaZulu-Natal","Eastern Cape","Free State",
            "Limpopo","Mpumalanga","North West","Northern Cape"
        };

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
                // Normalize role (Title case)
                var role = char.ToUpper(dto.Role[0]) + dto.Role.Substring(1).ToLower();

                // If creating an Advisor, require a Province
                string? normalizedProvince = null;
                if (string.Equals(role, "Advisor", StringComparison.OrdinalIgnoreCase))
                {
                    if (string.IsNullOrWhiteSpace(dto.Province))
                        return BadRequest(new { message = "Province is required for Advisor users." });

                    // Trim and basic normalization (you can map to canonical names if needed)
                    normalizedProvince = dto.Province.Trim();
                    if (ValidProvinces.Count > 0 && !ValidProvinces.Contains(normalizedProvince))
                    {
                        return BadRequest(new
                        {
                            message = $"Invalid province '{dto.Province}'.",
                            allowed = ValidProvinces
                        });
                    }
                }

                var userRecordArgs = new UserRecordArgs
                {
                    Email = dto.Email,
                    Password = dto.Password,
                    DisplayName = dto.Name,
                    Disabled = false
                };

                var userRecord = await _auth.CreateUserAsync(userRecordArgs);

                var userData = new Dictionary<string, object>
                {
                    { "Name", dto.Name },
                    { "Role", role },
                    { "email", dto.Email },
                    { "password", dto.Password }, 
                    { "createdAt", Timestamp.GetCurrentTimestamp() }
                };

                // Only store Province if provided (primarily Advisors)
                if (!string.IsNullOrWhiteSpace(normalizedProvince))
                {
                    userData["Province"] = normalizedProvince;
                }
                else if (!string.IsNullOrWhiteSpace(dto.Province))
                {
                    // For non-advisors, allow storing Province if you like
                    userData["Province"] = dto.Province.Trim();
                }

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
                        role = doc.ContainsField("Role") ? doc.GetValue<string>("Role") : "",
                        province = doc.ContainsField("Province") ? doc.GetValue<string>("Province") : "",

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

        public string? Province { get; set; }
    }
}
