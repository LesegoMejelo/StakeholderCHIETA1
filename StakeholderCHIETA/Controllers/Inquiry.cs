using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;

namespace Staekholder_CHIETA_X.Controllers
{


    public class InquiryController : Controller
    {
        private readonly FirestoreDb _db;

        public InquiryController(FirestoreDb db)
        {
            _db = db;
        }


        [HttpPost]
        [Route("api/inquiry")]
        public async Task<IActionResult> Post([FromForm] string name, [FromForm] string message, [FromForm] string inquiryType)
        {
            var docRef = await _db.Collection("inquiries").AddAsync(new
            {
                name = name,
                message = message,
                inquiryType = inquiryType,
                createdAt = Timestamp.GetCurrentTimestamp()
            });

            return Ok(new { id = docRef.Id, message = "Inquiry submitted" });
        }
        public IActionResult Index()
        {
            return View();
        }
        
        public IActionResult Inquiry()
        {
            return View("~/Views/StakeholderViews/Inquiry/Inquiry.cshtml");

        }
    }
}
