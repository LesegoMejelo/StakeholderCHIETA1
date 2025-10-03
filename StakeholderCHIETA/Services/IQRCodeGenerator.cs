using System;
using System.Threading.Tasks;

// Services/IQRCodeGenerator.cs
namespace StakeholderCHIETA.Services
{
    public interface IQRCodeGenerator
    {
        byte[] GeneratePng(string payload, int pixelsPerModule = 6);
    }
}



/*namespace StakeholderCHIETA.Services
{
    public interface IAppointmentQRService
    {
        Task SendAppointmentQRAsync(string appointmentId, string stakeholderEmail, TimeSpan ttl);
    }
}
*/
/* public interface IQRCodeGenerator
 {
     byte[] GeneratePng(string payload, int pixelsPerModule = 6);
 }

 public class QRCodeService : IQRCodeGenerator
 {
     public byte[] GeneratePng(string payload, int pixelsPerModule = 6)
     {
         var generator = new QRCodeGenerator();
         var data = generator.CreateQrCode(payload, QRCodeGenerator.ECCLevel.M);
         var png = new PngByteQRCode(data);
         return png.GetGraphic(pixelsPerModule);
     }
 }

 */
