﻿using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StakeholderCHIETA.Models
{
    public class Advisor: User
    {
        [Key, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public string employeeId { get; set; }
        [Required]
        public string department {  get; set; }
        public EmployeeRole Role { get; set; }

    }
}
