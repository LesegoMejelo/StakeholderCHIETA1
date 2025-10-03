using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc;
using StakeholderCHIETA.Services;
using Microsoft.AspNetCore.Authorization;



namespace StakeholderCHIETA.Controllers
    {
        public class CheckInController : Controller
        {
            private readonly ITokenService _tokens;

            public CheckInController(ITokenService tokens) => _tokens = tokens;

            // GET /CheckIn?t=<rawToken|tokenId>&a=<appointmentId>
            [HttpGet("/CheckIn")]
            [AllowAnonymous] // scanning shouldn’t require login
            public async Task<IActionResult> Index([FromQuery] string t, [FromQuery] string a)
            {
                if (string.IsNullOrWhiteSpace(t) || string.IsNullOrWhiteSpace(a))
                    return BadRequest("Missing token or appointment.");

                var ok = await _tokens.ValidateAndConsumeAsync(t, a);
                if (!ok)
                    return View("~/Views/CheckIn/Failed.cshtml");

                return View("~/Views/CheckIn/Success.cshtml");
            }
        }
    }

















    /* public class CheckInController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
   */

