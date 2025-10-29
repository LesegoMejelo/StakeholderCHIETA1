using QRCoder;

namespace StakeholderCHIETA.Services
{
    public class QRCodeService : IQRCodeGenerator
    {
        public byte[] GeneratePng(string text, int pixelsPerModule = 8)
        {
            if (string.IsNullOrWhiteSpace(text))
                throw new ArgumentException("QR content cannot be empty.", nameof(text));

            if (pixelsPerModule < 2) pixelsPerModule = 2; // keep it readable

            using var generator = new QRCodeGenerator();
            using var data = generator.CreateQrCode(text, QRCodeGenerator.ECCLevel.M);

            // PngByteQRCode avoids System.Drawing dependencies and works cross-platform
            var pngQr = new PngByteQRCode(data);
            // You can add optional parameters here (e.g., darkColorHex, lightColorHex, drawQuietZones)
            return pngQr.GetGraphic(pixelsPerModule);
        }

        // (Optional) If you had an older signature, keep a shim to avoid refactors elsewhere:
        // public byte[] GenerateQrCode(string text) => GeneratePng(text, 8);
    }
}
