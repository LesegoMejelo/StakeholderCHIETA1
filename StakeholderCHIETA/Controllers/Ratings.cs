using Microsoft.AspNetCore.Mvc;

namespace StakeholderCHIETA.Controllers
{
    public class Ratings : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
