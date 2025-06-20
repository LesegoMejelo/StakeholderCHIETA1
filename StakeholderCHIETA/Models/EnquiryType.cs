using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StakeholderCHIETA.Models
{
    public class EnquiryType
    {
        [Key, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int TypeId { get; set; }
        public string typeName { get; set; }
    }
}
