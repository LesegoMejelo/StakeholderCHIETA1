using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;


namespace Staekholder_CHIETA_X.Controllers
{
    public class HomeController : Controller
    {
       /* public IActionResult Home()
        {
            return View("~/Views/Home/Home.cshtml");
        }
       */
        public IActionResult Index()
        {
            return View("~/Views/StakeholderViews/Home/Home.cshtml");
        }

       


    }
}