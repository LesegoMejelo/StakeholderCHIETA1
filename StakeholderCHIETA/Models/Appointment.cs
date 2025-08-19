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
        public string Advisor { get; set; }

        [FirestoreProperty]
        public DateTime Date { get; set; }

        [FirestoreProperty]
        public string Time { get; set; }

        [FirestoreProperty]
        public string Reason { get; set; }

        [FirestoreProperty]
        public string Status { get; set; } = "Pending";
    }
}
