using Microsoft.AspNetCore.Mvc;

namespace Staekholder_CHIETA_X.Controllers
{
    public class InquiryController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Inquiry()
        {
            return View("~/Views/Inquiry/Inquiry.cshtml");
        }
    }
}
