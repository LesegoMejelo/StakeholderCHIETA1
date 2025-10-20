using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace StakeholderCHIETA.Controllers
{
    [Route("[controller]")]
    public class EmployeeController : Controller
    {
        #region Dependencies & Fields
        private readonly FirestoreDb _db;
        #endregion

        #region Constructor
        public EmployeeController(FirestoreDb db)
        {
            _db = db;
        }
        #endregion

        #region API: Employees
        // GET: /Employee/List
        [HttpGet("List")]
        public async Task<IActionResult> GetEmployees()
        {
            // Fetch employees from Firestore
            return Ok(new { Message = "Employees will be returned here." });
        }
        #endregion

        #region Views
        // GET: /Employee/EmployeeLanding
        [HttpGet("EmployeeLanding")]
        public IActionResult EmployeeLanding()
        {
            // Looks for Views/Employee/EmployeeLanding.cshtml
            return View();
        }
        #endregion
    }
}
