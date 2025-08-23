using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using StakeholderCHIETA;
using System.Threading.Tasks;

namespace Staekholder_CHIETA_X.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : Controller
    {
        private readonly FirebaseAuth _auth;
        private readonly FirestoreDb _firestoreDb;

        // The constructor now receives both Firebase Auth and FirestoreDb
        public AuthController(FirebaseAuth auth, FirestoreDb firestoreDb)
        {
            _auth = auth;
            _firestoreDb = firestoreDb;
        }

        // Action for administrators to register new users
        [HttpPost("register")]
        [AuthorizeAdmin] // Apply the custom authorization filter
        public async Task<IActionResult> RegisterUser([FromForm] string email, [FromForm] string password, [FromForm] string name, [FromForm] string role)
        {
            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password) || string.IsNullOrEmpty(name) || string.IsNullOrEmpty(role))
            {
                return BadRequest(new { message = "All fields are required." });
            }

            try
            {
                // 1. Create a user in Firebase Authentication
                var userArgs = new UserRecordArgs
                {
                    Email = email,
                    Password = password,
                    DisplayName = name,
                };
                UserRecord userRecord = await _auth.CreateUserAsync(userArgs);

                // 2. Create a document in the "Users" collection
                CollectionReference usersRef = _firestoreDb.Collection("Users");
                await usersRef.Document(userRecord.Uid).SetAsync(new
                {
                    name = name,
                    email = email,
                    role = role, // Store the user's role here
                    createdAt = FieldValue.ServerTimestamp,
                });

                return Ok(new { message = "User registered successfully!", uid = userRecord.Uid });
            }
            catch (FirebaseAuthException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Admin-facing login page
        [HttpGet("admin-login")]
        public IActionResult AdminLogin()
        {
            return View(); // This returns a view named AdminLogin.cshtml
        }

        // General user login page (if applicable)
        [HttpGet("login")]
        public IActionResult Login()
        {
            return View(); // This returns a view named Login.cshtml
        }

        // POST: /Auth/Login
        [HttpPost]
        public IActionResult Login(string idToken)
        {
            // Here you'll verify Firebase ID token and create a session
            HttpContext.Session.SetString("UserId", idToken);
            return RedirectToAction("Index", "Home"); // send user to dashboard
        }

        // Action for logging out
        [HttpGet("logout")]
        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return RedirectToAction("Login");
        }
        

    }
}
