using Microsoft.AspNetCore.Mvc;
using StakeholderCHIETA.Models;

namespace StakeholderCHIETA.Controllers
{
    public class EnquiryMasterController : Controller
    {
        private readonly EnquiryDBContext _dbContext;

        public EnquiryMasterController(EnquiryDBContext dbContext)
        {
            _dbContext = dbContext;
        }

        [HttpGet]
        public IActionResult Create()
        {
            return View();
        }

        [HttpPost]
        public IActionResult Create(Enquiries model)
        {
            if (ModelState.IsValid)
            {
                model.Status = Status.Pending;
                _dbContext.Enquiry.Add(model);
                _dbContext.SaveChanges();
                return RedirectToAction("Success");
            }

            return View(model);
        }

        public IActionResult Success()
        {
            return View();
        }
    }
}
