using QRCoder;

namespace StakeholderCHIETA.Services
{
    public class QRCodeService : IQRCodeGenerator
    {
        public byte[] GeneratePng(string payload, int pixelsPerModule = 6)
        {
            using var qrGenerator = new QRCoder.QRCodeGenerator();
            var qrCodeData = qrGenerator.CreateQrCode(payload, QRCoder.QRCodeGenerator.ECCLevel.Q);

            using var qrCode = new PngByteQRCode(qrCodeData);
            return qrCode.GetGraphic(pixelsPerModule);
        }
    }
}
