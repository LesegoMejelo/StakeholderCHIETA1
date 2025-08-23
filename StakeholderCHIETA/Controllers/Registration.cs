using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace StakeholderCHIETA.Controllers
{
    public class RegistrationController : Controller
    {
        private readonly FirestoreDb _firestoreDb;

        public RegistrationController(FirestoreDb firestoreDb)
        {
            _firestoreDb = firestoreDb;
        }

        // Show registration form (only for admins)
        [HttpGet]
        public IActionResult Index()
        {
            return View("Registration");
        }

        // Handle registration
        [HttpPost]
        public async Task<IActionResult> Register(string email, string password, string role, string displayName)
        {
            try
            {
                // 1️⃣ Create user in Firebase Auth
                var userRecordArgs = new UserRecordArgs()
                {
                    Email = email,
                    Password = password,
                    DisplayName = displayName,
                    Disabled = false
                };

                var userRecord = await FirebaseAuth.DefaultInstance.CreateUserAsync(userRecordArgs);

                // 2️⃣ Save user info + role in Firestore
                var docRef = _firestoreDb.Collection("users").Document(userRecord.Uid);
                await docRef.SetAsync(new
                {
                    email = email,
                    role = role, // "client", "advisor", or "admin"
                    displayName = displayName,
                    createdAt = Timestamp.GetCurrentTimestamp(),
                    isActive = true
                });

                ViewBag.Message = "✅ User created successfully!";
                return View("Registration");
            }
            catch (Exception ex)
            {
                ViewBag.Error = $"❌ {ex.Message}";
                return View("Registration");
            }
        }
    }
}

