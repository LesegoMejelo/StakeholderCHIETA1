using Microsoft.AspNetCore.Mvc;
using StakeholderCHIETA.Filters;
using Microsoft.AspNetCore.Authorization;
using Google.Api;

namespace StakeholderCHIETA.Controllers
{
    [Authorize(Roles = "Admin")]
    public class AdminController : Controller
    {
      
        public IActionResult Registration()
        {
            return View("~/Views/AdminViews/AdminDashboard.cshtml");
        }
    }
    
    
    
}

//role-based access controller
