using StakeholderCHIETA.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;


namespace StakeholderCHIETA.Controllers
{
    public class EnquiryMasterController
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
            if (modelState.IsValid) {
                model.Status = EnquiryStatus.Pending;
                _dbContext.Enquiry.Add(model);
                _dbContext.SaveChanges();
                return RedirectToAction("Success"); 
        }
    }
}
