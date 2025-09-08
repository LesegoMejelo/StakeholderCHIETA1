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

namespace StakeholderCHIETA.Controllers
{
    public class AuthController : Controller
    {
        private readonly FirebaseAuth _auth;
        private readonly FirestoreDb _firestoreDb;

        public AuthController(FirebaseAuth auth, FirestoreDb firestoreDb)
        {
            _auth = auth;
            _firestoreDb = firestoreDb;
        }

        // GET: /Auth/Login
        [HttpGet]
        public IActionResult Login() => View();

        /* Keep [Authorize] only on the parts of your app that require the user to already be logged in (like booking appointments, admin dashboards, etc.).
        // POST: /Auth/Login
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Login([FromForm] string idToken)
        */
        [AllowAnonymous]
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



        // POST: /Auth/Register (only Admins)
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RegisterUser([FromForm] string email, [FromForm] string password, [FromForm] string Name, [FromForm] string Role)
        {
            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password) || string.IsNullOrEmpty(Name) || string.IsNullOrEmpty(Role))
                return BadRequest(new { message = "All fields are required." });

            try
            {
                // Normalize role
                Role = char.ToUpper(Role[0]) + Role.Substring(1).ToLower();

                // Create Firebase user
                var userRecordArgs = new UserRecordArgs
                {
                    Email = email,
                    Password = password,
                    DisplayName = Name
                };
                UserRecord userRecord = await _auth.CreateUserAsync(userRecordArgs);

                // Save Firestore user
                var usersRef = _firestoreDb.Collection("Users");

                var userData = new Dictionary<string, object>
                {
                    { "Name", Name ?? "" },
                    { "Role", Role },
                    { "email", email },
                    { "password", password }, // ⚠️ consider removing
                    { "isActive", true },
                    { "createdAt", Timestamp.GetCurrentTimestamp() }
                };

                await usersRef.Document(userRecord.Uid).SetAsync(userData);

                return Ok(new { message = "User registered successfully!", uid = userRecord.Uid });
            }
            catch (FirebaseAuthException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        
    }
}
