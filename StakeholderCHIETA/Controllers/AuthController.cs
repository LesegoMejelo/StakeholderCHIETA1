using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Linq;
using StakeholderCHIETA_X.Models.DTOs.Auth;

namespace StakeholderCHIETA.Controllers
{
    public class AuthController : Controller
    {
        #region Dependencies & Fields
        private readonly FirebaseAuth _auth;
        private readonly FirestoreDb _firestoreDb;
        #endregion

        #region Constructor
        public AuthController(FirebaseAuth auth, FirestoreDb firestoreDb)
        {
            _auth = auth;
            _firestoreDb = firestoreDb;
        }
        #endregion

        #region Views (Login Page)
        // GET: /Auth/Login
        [HttpGet]
        public IActionResult Login() => View();
        #endregion

        #region Authentication (Login / Logout)
        // POST: /Auth/Login
        [HttpPost]
        public async Task<IActionResult> Login([FromForm] string idToken)
        {
            try
            {
                var decodedToken = await _auth.VerifyIdTokenAsync(idToken);
                var firebaseUid = decodedToken.Uid;

                // Get docs from both collections
                var userDocTask = _firestoreDb.Collection("Users").Document(firebaseUid).GetSnapshotAsync();
                var adminDocTask = _firestoreDb.Collection("Admin").Document(firebaseUid).GetSnapshotAsync();

                await Task.WhenAll(userDocTask, adminDocTask);

                var userDoc = userDocTask.Result;
                var adminDoc = adminDocTask.Result;

                if (!userDoc.Exists && !adminDoc.Exists)
                {
                    return Unauthorized(new
                    {
                        success = false,
                        message = "User not found in Users or Admin collections.",
                        uid = firebaseUid
                    });
                }

                // Prefer Admin if exists
                var doc = adminDoc.Exists ? adminDoc : userDoc;

                // Extract fields safely
                string role = doc.ContainsField("Role") ? doc.GetValue<string>("Role") : "";
                string email = doc.ContainsField("email") ? doc.GetValue<string>("email") : "";
                string name = doc.ContainsField("Name") ? doc.GetValue<string>("Name") : "";
                string password = doc.ContainsField("password") ? doc.GetValue<string>("password") : "";

                // Normalize role (first letter uppercase, rest lowercase)
                role = string.IsNullOrEmpty(role) ? "" : char.ToUpper(role[0]) + role.Substring(1).ToLower();

                Console.WriteLine($"Login attempt - UID: {firebaseUid}, Role: {role}, Email: {email}");

                var claims = new List<Claim>
                {
                    new Claim(ClaimTypes.NameIdentifier, firebaseUid),
                    new Claim(ClaimTypes.Name, name ?? ""),
                    new Claim(ClaimTypes.Email, email ?? ""),
                    new Claim(ClaimTypes.Role, role),
                };

                var identity = new ClaimsIdentity(claims, "Firebase");
                var principal = new ClaimsPrincipal(identity);
                await HttpContext.SignInAsync(principal);

                // Role-based redirect
                string? redirectUrl = role.ToLower() switch
                {
                    "client" => Url.Action("Home", "Stakeholder"),
                    "advisor" => Url.Action("Home", "Advisor"),
                    "admin" => Url.Action("Index", "Registration"),
                    _ => Url.Action("Login", "Auth")
                };

                return Ok(new { success = true, role, redirectUrl });
            }
            catch (Exception ex)
            {
                return Unauthorized(new
                {
                    success = false,
                    message = $"Authentication failed: {ex.Message}",
                    stackTrace = ex.StackTrace
                });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Logout()
        {
            // Clears the user’s session/cookies
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

            // Redirect back to login page
            return RedirectToAction("Login", "Auth");
        }
        #endregion


        #region Admin APIs (Register / Get Users)
        [HttpPost("RegisterUser")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RegisterUser([FromBody] RegisterUserDto model)
        {
            if (string.IsNullOrEmpty(model.Email) ||
                string.IsNullOrEmpty(model.Password) ||
                string.IsNullOrEmpty(model.Name) ||
                string.IsNullOrEmpty(model.Role))
            {
                return BadRequest(new { message = "All fields are required." });
            }

            try
            {
                var role = char.ToUpper(model.Role[0]) + model.Role.Substring(1).ToLower();

                var userRecordArgs = new UserRecordArgs
                {
                    Email = model.Email,
                    Password = model.Password,
                    DisplayName = model.Name
                };
                UserRecord userRecord = await _auth.CreateUserAsync(userRecordArgs);

                var userData = new Dictionary<string, object>
                {
                    { "Name", model.Name },
                    { "Role", role },
                    { "email", model.Email },
                    { "password", model.Password },
                    { "createdAt", Timestamp.GetCurrentTimestamp() }
                };

                await _firestoreDb.Collection("Users").Document(userRecord.Uid).SetAsync(userData);

                return Ok(new { message = "User registered successfully!", uid = userRecord.Uid });
            }
            catch (FirebaseAuthException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("GetUsers")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetUsers()
        {
            try
            {
                var usersRef = _firestoreDb.Collection("Users");
                var snapshot = await usersRef.GetSnapshotAsync();

                var users = snapshot.Documents
                    .Select(d => new
                    {
                        id = d.Id,
                        name = d.ContainsField("Name") ? d.GetValue<string>("Name") : "",
                        email = d.ContainsField("email") ? d.GetValue<string>("email") : "",
                        role = d.ContainsField("Role") ? d.GetValue<string>("Role") : ""
                    })
                    .ToList(); // materialize the result

                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching users", error = ex.Message });
            }
        }
        #endregion
    }
}

