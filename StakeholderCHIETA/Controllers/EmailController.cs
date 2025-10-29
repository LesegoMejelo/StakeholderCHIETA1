using Microsoft.AspNetCore.Mvc;
using StakeholderCHIETA.Services;

[Route("diag/email")]
public class EmailDiagController : Controller
{
    private readonly IEmailService _email;

    public EmailDiagController(IEmailService email) => _email = email;

    [HttpGet("send")]
    public async Task<IActionResult> Send(string to)
    {
        try
        {
            await _email.SendEmailAsync(
                to ?? "kwakhanyakunene@gmail.com",
                "SMTP smoke test",
                "<p>If you can read this, SMTP works 🎉</p>");

            return Ok("Sent");
        }
        catch (Exception ex)
        {
            // You’ll see full stack + SMTP transcript in console logs
            return StatusCode(500, ex.ToString());
        }
    }
}
