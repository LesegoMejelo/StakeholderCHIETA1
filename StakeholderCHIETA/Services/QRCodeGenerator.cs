/* using QRCoder;

namespace StakeholderCHIETA.Services
{
    public class QRCodeService : IQRCodeGenerator
    {
        public async Task<byte[]> GenerateQRCodeAsync(string data)
        {
            using var qrGenerator = new QRCoder.QRCodeGenerator(); // explicitly use QRCoder’s class
            var qrCodeData = qrGenerator.CreateQrCode(data, QRCoder.QRCodeGenerator.ECCLevel.Q);

            using var qrCode = new PngByteQRCode(qrCodeData);
            return qrCode.GetGraphic(20);
        }
    }
}
*/