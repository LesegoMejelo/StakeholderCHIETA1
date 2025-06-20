using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;


namespace Staekholder_CHIETA_X.Controllers
{
    public class HomeController : Controller
    {
         public IActionResult Index()
        {
            return View();
        }

        public IActionResult Home()
        {
            return View("~/Views/Home/Home.cshtml");
        }

       
    }
}
