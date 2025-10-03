// Services/QRCodeService.cs
using QRCoder;

namespace StakeholderCHIETA.Services
{
    // Rename the class if you need both implementations, e.g.:
    // public class QRCodeServiceV2
    public class QRCodeServiceV2 : IQRCodeGenerator
    {
        public byte[] GeneratePng(string payload, int pixelsPerModule = 6)
        {
            var generator = new QRCoder.QRCodeGenerator();
            var data = generator.CreateQrCode(payload, QRCoder.QRCodeGenerator.ECCLevel.M);
            var png = new QRCoder.PngByteQRCode(data);
            return png.GetGraphic(pixelsPerModule);
        }
    }
}
