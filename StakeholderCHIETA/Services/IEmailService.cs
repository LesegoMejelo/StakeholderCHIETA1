namespace StakeholderCHIETA.Services

    {
        public interface IEmailService
        {
            Task SendEmailWithAttachmentAsync(string to, string subject, string htmlBody,
                byte[] attachmentBytes, string attachmentName, string contentId);
        }
    }

