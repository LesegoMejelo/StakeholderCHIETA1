namespace StakeholderCHIETA.Services
{
    public interface IQRCodeGenerator
    {
        // pixelsPerModule default of 8 gives a crisp QR without being huge
        byte[] GeneratePng(string text, int pixelsPerModule = 8);
    }
}
