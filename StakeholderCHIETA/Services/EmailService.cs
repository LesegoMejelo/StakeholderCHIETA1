using MailKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using MimeKit;
using MimeKit.Utils;

namespace StakeholderCHIETA.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration config, ILogger<EmailService> logger)
        {
            _config = config;
            _logger = logger;
            ValidateEmailConfig();
        }

        private void ValidateEmailConfig()
        {
            var required = new[]
            {
                "Email:SmtpServer","Email:SmtpPort","Email:SenderEmail",
                "Email:SenderName","Email:Username","Email:Password"
            };

            foreach (var key in required)
            {
                if (string.IsNullOrWhiteSpace(_config[key]))
                    throw new InvalidOperationException($"Missing configuration: {key}");
            }

            // Gmail typically requires From == Username (or at least an alias on that account)
            if (!string.Equals(_config["Email:SenderEmail"], _config["Email:Username"], StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("SenderEmail ({Sender}) != Username ({User}). Gmail may reject or rewrite the From header.",
                    _config["Email:SenderEmail"], _config["Email:Username"]);
            }
        }

        public async Task SendEmailAsync(string to, string subject, string htmlBody)
        {
            var msg = BuildBasicMessage(to, subject, htmlBody);
            await SendAsync(msg);
        }

        public async Task SendEmailWithAttachmentAsync(
            string to, string subject, string htmlBody,
            byte[] attachmentBytes, string attachmentName, string contentId)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_config["Email:SenderName"], _config["Email:SenderEmail"]));
            message.To.Add(new MailboxAddress("", to));
            message.Subject = subject;
            message.Date = DateTimeOffset.Now;
            message.MessageId = MimeUtils.GenerateMessageId();

            var builder = new BodyBuilder { HtmlBody = htmlBody };

            if (attachmentBytes is not null && attachmentBytes.Length > 0)
            {
                // Embedded image for inline <img src="cid:qrCode">
                var image = builder.LinkedResources.Add(attachmentName, attachmentBytes);
                image.ContentId = contentId; // e.g., "qrCode"
            }

            message.Body = builder.ToMessageBody();
            await SendAsync(message);
        }

        private MimeMessage BuildBasicMessage(string to, string subject, string htmlBody)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_config["Email:SenderName"], _config["Email:SenderEmail"]));
            message.To.Add(new MailboxAddress("", to));
            message.Subject = subject;
            message.Date = DateTimeOffset.Now;
            message.MessageId = MimeUtils.GenerateMessageId();
            message.Body = new BodyBuilder { HtmlBody = htmlBody }.ToMessageBody();
            return message;
        }

        private async Task SendAsync(MimeMessage message)
        {
            var host = _config["Email:SmtpServer"];
            var port = int.Parse(_config["Email:SmtpPort"]); // typically 587
            var user = _config["Email:Username"];
            var pass = _config["Email:Password"];

            // Gmail is picky: From should match the authenticated account
            var fromAddr = message.From.Mailboxes.FirstOrDefault()?.Address;
            if (!string.Equals(fromAddr, user, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Message From {From} != SMTP Username {User}. Setting From to Username to satisfy Gmail.",
                    fromAddr, user);
                message.From.Clear();
                message.From.Add(new MailboxAddress(_config["Email:SenderName"], user));
            }

            // Detailed SMTP log to console (you can route to a file if you prefer)
            using var protocolLogger = new ProtocolLogger(Console.OpenStandardOutput());
            using var client = new SmtpClient(protocolLogger);

            // Optional: avoid failures on strict cert revocation checks in some corp networks
            client.CheckCertificateRevocation = false;

            try
            {
                _logger.LogInformation("Connecting SMTP {Host}:{Port} (StartTLS)…", host, port);
                await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);

                // Some environments negotiate mechanisms you don't want
                client.AuthenticationMechanisms.Remove("XOAUTH2");

                _logger.LogInformation("Authenticating as {User}…", user);
                await client.AuthenticateAsync(user, pass);

                _logger.LogInformation("Sending message to {To} with subject '{Subject}'…",
                    string.Join(", ", message.To.Mailboxes.Select(m => m.Address)), message.Subject);
                await client.SendAsync(message);
                _logger.LogInformation("Message sent successfully via {Host}:{Port}.", host, port);
            }
            catch (Exception ex587)
            {
                _logger.LogWarning(ex587, "Send via 587 failed. Trying SMTPS 465…");

                try
                {
                    if (client.IsConnected) await client.DisconnectAsync(true);

                    await client.ConnectAsync(host, 465, SecureSocketOptions.SslOnConnect);
                    client.AuthenticationMechanisms.Remove("XOAUTH2");
                    await client.AuthenticateAsync(user, pass);

                    await client.SendAsync(message);
                    _logger.LogInformation("Message sent successfully via {Host}:465.", host);
                }
                catch (Exception ex465)
                {
                    _logger.LogError(ex465, "Send failed via 465 as well.");
                    throw; // let the exception bubble so you see it in logs
                }
            }
            finally
            {
                if (client.IsConnected) await client.DisconnectAsync(true);
            }
        }
    }
}
