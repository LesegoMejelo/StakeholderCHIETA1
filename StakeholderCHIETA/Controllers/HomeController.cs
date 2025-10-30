using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;


namespace Staekholder_CHIETA_X.Controllers
{
    public class HomeController : Controller
    {

        public IActionResult Stakeholder()
        {
            return View("~/Views/StakeholderViews/Home/Home.cshtml");
        }

        public IActionResult Employee()
        {
            return View("~/Views/EmployeeViews/EmployeeLanding.cshtml");        }    }
}               