using Microsoft.AspNetCore.Mvc;

namespace StakeholderCHIETA.Services
{
    namespace StakeholderCHIETA.Services
    {
        public class EmailAttachment
        {
            public string FileName { get; }
            public byte[] Content { get; }
            public string ContentType { get; }

            public EmailAttachment(string fileName, byte[] content, string contentType)
            {
                FileName = fileName;
                Content = content;
                ContentType = contentType;
            }
        }
    }

    public class EmailAttachment : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
