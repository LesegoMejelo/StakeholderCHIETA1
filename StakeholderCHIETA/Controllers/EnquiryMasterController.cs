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
        public IActionResult Create
    }
}
