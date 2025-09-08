namespace StakeholderCHIETA.Services
{
    public interface IQRCodeGenerator
    {
        Task<byte[]> GenerateQRCodeAsync(string qrDataJson);

        public interface IQRCodeGenerator
        {
            Task<byte[]> GenerateQRCodeAsync(string data);
        }
    }
}
