using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace StakeholderCHIETA.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendEmailWithAttachmentAsync(string to, string subject, string htmlBody,
            byte[] attachmentBytes, string attachmentName, string contentId)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_config["Email:SenderName"], _config["Email:SenderEmail"]));
            message.To.Add(new MailboxAddress("", to));
            message.Subject = subject;

            var builder = new BodyBuilder();
            builder.HtmlBody = htmlBody;

            // Add QR code as embedded image
            var image = builder.LinkedResources.Add(attachmentName, attachmentBytes);
            image.ContentId = contentId;

            message.Body = builder.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(_config["Email:SmtpServer"],
                int.Parse(_config["Email:SmtpPort"]), SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(_config["Email:Username"], _config["Email:Password"]);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
    }

}
