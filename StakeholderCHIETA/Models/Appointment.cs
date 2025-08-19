using Google.Cloud.Firestore;
using System;

namespace StakeholderCHIETA.Models
{
    [FirestoreData]
    public class Appointment
    {
        [FirestoreProperty]
        public string AppointmentId { get; set; }

        [FirestoreProperty]
        public string ClientId { get; set; }
        public string ClientName { get; set; }

        [FirestoreProperty]
        public string AdvisorId { get; set; }

        [FirestoreProperty]
        public DateTime Date { get; set; }

        [FirestoreProperty]
        public string Purpose { get; set; }

        [FirestoreProperty]
        public string Status { get; set; } = "Pending";
    }
}
