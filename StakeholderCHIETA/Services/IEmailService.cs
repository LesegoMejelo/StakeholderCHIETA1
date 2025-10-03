namespace StakeholderCHIETA.Services
{
    public interface IEmailService
    {
        Task SendAsync(string to, string subject, string htmlBody,
                       string? attachmentFileName = null,
                       byte[]? attachmentBytes = null,
                       string? attachmentContentType = null);
    }
}






            /*   public interface IEmailService
               {
                   Task SendEmailWithAttachmentAsync(string to, string subject, string htmlBody,
                       byte[] attachmentBytes, string attachmentName, string contentId);
               }
            */
       

