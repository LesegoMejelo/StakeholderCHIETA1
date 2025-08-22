
using Microsoft.AspNetCore.Mvc;

namespace Staekholder_CHIETA_X.Controllers
{
    public class AuthController : Controller
    {
        // GET: /Auth/Login
        [HttpGet]
        public IActionResult Login()
        {
            return View(); // Looks for /Views/Auth/Login.cshtml
        }

        // POST: /Auth/Login
        [HttpPost]
        public IActionResult Login(string idToken)
        {
            // Here you'll verify Firebase ID token and create session
            HttpContext.Session.SetString("UserId", idToken);
            return RedirectToAction("Index", "Home"); // send user to dashboard
        }

        // Logout
        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return RedirectToAction("Login");
        }
    }
}
