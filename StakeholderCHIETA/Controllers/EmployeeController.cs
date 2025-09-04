using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace StakeholderCHIETA.Controllers
{

    [Route("[controller]")]
    public class EmployeeController : Controller
    {
        private readonly FirestoreDb _db;

        public EmployeeController(FirestoreDb db)
        {
            _db = db;
        }

        // GET: /Employee/List
        [HttpGet("List")]
        public async Task<IActionResult> GetEmployees()
        {
            // Fetch employees from Firestore
            return Ok(new { Message = "Employees will be returned here." });
        }
        // GET: /Employee/EmployeeLanding
        [HttpGet("EmployeeLanding")]
        public IActionResult EmployeeLanding()
        {
            return View(); // This will look for Views/Employee/EmployeeLanding.cshtml
        }
    }











        /*first code
         * 
         * public class EmployeeController : Controller
         {
             private readonly FirestoreDb _db;

             public EmployeeController(FirestoreDb db)
             {
                 _db = db;
             }

             [HttpGet("list")]
             public async Task<IActionResult> GetEmployees()
             {
                 // Fetch employees from Friestore

                 return Ok(new {Message = "Employees will be returned here." });

             }

             public IActionResult EmployeeLanding()
             {
                 return View();

             }
         }
        */
    }
