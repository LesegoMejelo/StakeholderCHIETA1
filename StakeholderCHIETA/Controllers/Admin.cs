using Microsoft.AspNetCore.Mvc;
using StakeholderCHIETA.Filters;

namespace StakeholderCHIETA.Controllers
{
    [AuthorizeRole("Admin")]
    public class Admin : Controller
    {
        public IActionResult Home()
        {
            return View("~/Views/AdminViews/Home/Index.cshtml");
        }
    }
}
