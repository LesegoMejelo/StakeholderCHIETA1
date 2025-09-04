using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

        // POST: /Auth/Login
        [HttpPost]
        public async Task<IActionResult> Login(string idToken)
        {
            try
            {
                var decodedToken = await _auth.VerifyIdTokenAsync(idToken);
                var firebaseUid = decodedToken.Uid;

                if (string.IsNullOrEmpty(idToken))
                {
                    return BadRequest(new { message = "No token received by server." });
                }

                var userDoc = await _firestoreDb.Collection("Users").Document(firebaseUid).GetSnapshotAsync();
                if (!userDoc.Exists)
                {
                    return Unauthorized(new { message = "User not found in database." });
                }

                var role = userDoc.GetValue<string>("Role");
                var email = userDoc.GetValue<string>("email");
                var name = userDoc.GetValue<string>("Name");

                // Create ClaimsPrincipal
                var claims = new List<Claim>
                {
                    new Claim(ClaimTypes.NameIdentifier, firebaseUid),
                    new Claim(ClaimTypes.Name, name),
                    new Claim(ClaimTypes.Email, email),
                    new Claim(ClaimTypes.Role, role)
                };

                var identity = new ClaimsIdentity(claims, "Firebase");
                var principal = new ClaimsPrincipal(identity);
                await HttpContext.SignInAsync(principal);

                // Redirect based on role
                return Ok(new
                {
                    role,
                    redirectUrl = role switch
                    {
                        "Client" => Url.Action("Home", "Stakeholder"),
                        "Advisor" => Url.Action("Home", "Advisor"),
                        "Admin" => Url.Action("Home", "Admin"),
                        _ => Url.Action("Login", "Auth")
                    }
                });

            }
            catch (Exception ex)
            {
                // Returns a JSON object with an error message on failure
                return Unauthorized(new { message = $"Authentication failed: {ex.Message}" });
            }
        }

        // POST: /Auth/Register (only Admins)
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RegisterUser([FromForm] string email, [FromForm] string password, [FromForm] string name, [FromForm] string role)
        {
            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password) || string.IsNullOrEmpty(name) || string.IsNullOrEmpty(role))
                return BadRequest(new { message = "All fields are required." });

            try
            {
                var userRecordArgs = new UserRecordArgs
                {
                    Email = email,
                    Password = password,
                    DisplayName = name
                };
                UserRecord userRecord = await _auth.CreateUserAsync(userRecordArgs);

                var usersRef = _firestoreDb.Collection("Users");
                await usersRef.Document(userRecord.Uid).SetAsync(new
                {
                    name,
                    email,
                    role,
                    createdAt = FieldValue.ServerTimestamp
                });

                return Ok(new { message = "User registered successfully!", uid = userRecord.Uid });
            }
            catch (FirebaseAuthException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: /Auth/Logout
        [HttpGet]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync();
            return RedirectToAction("Login");
        }
    }
}