using Microsoft.AspNetCore.Mvc;
using StakeholderCHIETA.Filters;

namespace StakeholderCHIETA.Controllers
{
    [AuthorizeRole("Admin")]
    public class Admin : Controller
    {
        public IActionResult Login()
        {
            return View("~/Views/Auth/Login.cshtml");
        }

        public IActionResult Registration()
        {
            return View("~/Views/AdminViews/Registration.cshtml");
        }
    }
}
