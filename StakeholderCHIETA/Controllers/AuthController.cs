
using Microsoft.AspNetCore.Mvc;

namespace Staekholder_CHIETA_X.Controllers
{
    public class AuthController : Controller
    {
        // GET: /Auth/Login
        [HttpGet]
        public IActionResult Login()
        {
            // By default, this will look for: 
            // Views/Auth/Login.cshtml
            // or Views/Shared/Login.cshtml
            return View();
        }

        // POST: /Auth/Login
        [HttpPost]
        public IActionResult Login(string idToken)
        {
            // Here you'll verify Firebase ID token and create session
            HttpContext.Session.SetString("UserId", idToken);

            // After login, send user to dashboard
            return RedirectToAction("Index", "Home");
        }

        // GET: /Auth/Logout
        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return RedirectToAction("Login");
        }
    }
}

































/* Originl code
 * 
 * using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Razor.Compilation;
using StakeholderCHIETA.Models;

namespace Staekholder_CHIETA_X.Controllers
{
    public class AuthController : Controller
    {
        // GET: /Auth/Login
        [HttpGet]
        public IActionResult Login()
        {
            return View("~/Views/EmployeeView/Home.cshtml"); // Looks for /Views/Auth/Login.cshtml;
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
*/
