using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace StakeholderCHIETA.Controllers
{
    [Authorize(Roles = "Admin")] // Secure the entire controller
    public class RegistrationController : Controller
    {
        private readonly FirestoreDb _firestoreDb;
        private readonly FirebaseAuth _auth;

        public RegistrationController(FirestoreDb firestoreDb, FirebaseAuth auth)
        {
            _firestoreDb = firestoreDb;
            _auth = auth;
        }

        [HttpGet]
        public IActionResult Index()
        {
            return View("~/Views/AdminViews/Registration.cshtml");
        }

        [HttpPost]
        public async Task<IActionResult> Register()
        {
            try
            {
                var email = Request.Form["email"].ToString();
                var password = Request.Form["password"].ToString();
                var role = Request.Form["Role"].ToString();
                var displayName = Request.Form["Name"].ToString();

                // Use the injected _auth instead of DefaultInstance
                var userRecordArgs = new UserRecordArgs()
                {
                    Email = email,
                    Password = password,
                    DisplayName = displayName,
                    Disabled = false
                };

                var userRecord = await _auth.CreateUserAsync(userRecordArgs);

                role = char.ToUpper(role[0]) + role.Substring(1).ToLower();

                var docRef = _firestoreDb.Collection("Users").Document(userRecord.Uid);

                var userData = new Dictionary<string, object>
                {
                    { "Name", displayName },
                    { "Role", role },
                    { "email", email },
                    // Remove password storage - it's a security risk
                    { "createdAt", Timestamp.GetCurrentTimestamp() },
                    { "isActive", true }
                };

                await docRef.SetAsync(userData);

                ViewBag.Message = $"✅ {role} user created successfully!";
                return View("Registration");
            }
            catch (Exception ex)
            {
                ViewBag.Error = $"❌ {ex.Message}";
                return View("~/Views/AdminViews/Registration.cshtml");
            }
        }
    }
}