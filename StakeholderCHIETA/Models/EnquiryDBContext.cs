
using Microsoft.EntityFrameworkCore;
using System;

namespace StakeholderCHIETA.Models
{
    public class EnquiryDBContext : DbContext
    {
        public EnquiryDBContext(DbContextOptions<EnquiryDBContext> options) : base(options)
        {

        }
        public DbSet<Enquiries> Enquiry {  get; set; } 
        public DbSet<EnquiryType> EnquiryType { get; set; }
        public DbSet<EnquiryStatus> EnquiryStatuses { get; set; }
        public DbSet <Stakeholder> Stakeholders { get; set; }
       
    }
}