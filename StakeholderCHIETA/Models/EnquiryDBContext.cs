using Microsoft.EntityFrameworkCore;
using System;

namespace StakeholderCHIETA.Models
{
    public class EnquiryDBContext : DbContext
    {
        public EnquiryDBContext(DbContextOptions<EnquiryDBContext> options) : base(options)
        {

        }
    }
}