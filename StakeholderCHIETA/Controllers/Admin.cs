using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Globalization;

namespace StakeholderCHIETA.Controllers
{
    // This one controller serves the Admin dashboard view AND the metrics API.
    [Authorize(Roles = "Admin")]
    [Route("admin")]
    public class AdminController : Controller
    {
        private readonly FirestoreDb _db;
        public AdminController(FirestoreDb db) => _db = db;


        // VIEW: /admin  -> Admin dashboard page

        [HttpGet("")]
        public IActionResult Dashboard()
        {
            return View("~/Views/AdminViews/AdminDashboard.cshtml");
        }


        // API: /admin/metrics  -> JSON used by the dashboard front-end

        [HttpGet("metrics")]
        [Produces("application/json")]
        public async Task<IActionResult> GetMetrics()
        {
            // ---- Date window: last 12 months from start of current month
            var todayLocal = DateTime.Today; // adjust if you need specific TZ
            var start12 = new DateTime(todayLocal.Year, todayLocal.Month, 1).AddMonths(-11);

            // USERS
            var usersSnap = await _db.Collection("Users").GetSnapshotAsync();
            var totalUsers = usersSnap.Count;

            // APPOINTMENTS 
            // Expected fields:
            //   Date (Timestamp or ISO string), Status: pending|accepted|rescheduled|completed|cancelled|declined
            var apptSnap = await _db.Collection("appointments")
                .WhereGreaterThanOrEqualTo("Date", Timestamp.FromDateTime(DateTime.SpecifyKind(start12, DateTimeKind.Utc)))
                .GetSnapshotAsync();

            int apptUpcoming = 0, apptToday = 0, apptCompletedThisMonth = 0, apptCancelledThisMonth = 0;
            var apptMonthly = new Dictionary<string, int>(); // "MMM" -> count

            foreach (var d in apptSnap.Documents)
            {
                var map = d.ToDictionary();
                var status = (map.TryGetValue("Status", out var s) ? s?.ToString() : "pending")!.ToLowerInvariant();

                var dtLocal = ExtractDate(map, "Date");
                if (dtLocal == DateTime.MinValue) continue;

                var key = dtLocal.ToString("MMM", CultureInfo.InvariantCulture);
                apptMonthly[key] = apptMonthly.TryGetValue(key, out var c) ? c + 1 : 1;

                if (dtLocal > todayLocal && (status is "pending" or "accepted" or "rescheduled")) apptUpcoming++;
                if (dtLocal == todayLocal && (status is "pending" or "accepted" or "rescheduled")) apptToday++;

                if (dtLocal.Month == todayLocal.Month && dtLocal.Year == todayLocal.Year)
                {
                    if (status == "completed") apptCompletedThisMonth++;
                    if (status == "cancelled") apptCancelledThisMonth++;
                }
            }

            // INQUIRIES
            // Expected fields:
            //   CreatedDate (Timestamp or ISO), Status: Open|In Progress|Resolved|Closed (case-insensitive)
            //   ClosedDate (optional Timestamp/ISO)
            var inqSnap = await _db.Collection("inquiries")
                .WhereGreaterThanOrEqualTo("CreatedDate", Timestamp.FromDateTime(DateTime.SpecifyKind(start12, DateTimeKind.Utc)))
                .GetSnapshotAsync();

            int inqOpen = 0, inqClosed = 0, inqOpenedThisMonth = 0, inqResolvedThisMonth = 0;
            var inqMonthly = new Dictionary<string, int>();

            foreach (var d in inqSnap.Documents)
            {
                var map = d.ToDictionary();
                var status = (map.TryGetValue("Status", out var s) ? s?.ToString() : "Open")!.ToLowerInvariant();

                var createdLocal = ExtractDate(map, "CreatedDate");
                if (createdLocal == DateTime.MinValue) continue;

                var key = createdLocal.ToString("MMM", CultureInfo.InvariantCulture);
                inqMonthly[key] = inqMonthly.TryGetValue(key, out var c) ? c + 1 : 1;

                if (status is "closed" or "resolved") inqClosed++; else inqOpen++;

                if (createdLocal.Month == todayLocal.Month && createdLocal.Year == todayLocal.Year)
                    inqOpenedThisMonth++;

                var closedLocal = ExtractDate(map, "ClosedDate");
                if (closedLocal != DateTime.MinValue &&
                    closedLocal.Month == todayLocal.Month && closedLocal.Year == todayLocal.Year)
                    inqResolvedThisMonth++;
            }

            // Ordered 12-month labels and series
            var labels = Enumerable.Range(0, 12)
                .Select(i => start12.AddMonths(i).ToString("MMM", CultureInfo.InvariantCulture))
                .ToList();

            var apptSeries = labels.Select(m => apptMonthly.TryGetValue(m, out var c) ? c : 0).ToList();
            var inqSeries = labels.Select(m => inqMonthly.TryGetValue(m, out var c) ? c : 0).ToList();

            var dto = new AdminMetricsDto
            {
                Labels = labels,
                TotalUsers = totalUsers,
                AppointmentsUpcoming = apptUpcoming,
                AppointmentsToday = apptToday,
                AppointmentsCompletedThisMonth = apptCompletedThisMonth,
                AppointmentsCancelledThisMonth = apptCancelledThisMonth,
                InquiriesOpen = inqOpen,
                InquiriesClosed = inqClosed,
                InquiriesOpenedThisMonth = inqOpenedThisMonth,
                InquiriesResolvedThisMonth = inqResolvedThisMonth,
                AppointmentsByMonth = apptSeries,
                InquiriesByMonth = inqSeries
            };

            return Json(dto);
        }


        // Helpers

        [NonAction]
        private static DateTime ExtractDate(IDictionary<string, object> map, string key)
        {
            if (!map.TryGetValue(key, out var val) || val is null)
                return DateTime.MinValue;

            // Firestore Timestamp
            if (val is Timestamp ts)
                return ts.ToDateTime().ToLocalTime().Date;

            // ISO/string or dd/MM/yyyy
            if (val is string s)
                return ParseDateLoose(s);

            // Timestamp-like dictionaries (edge)
            if (val is IDictionary<string, object> o &&
                (o.ContainsKey("_seconds") || o.ContainsKey("seconds")))
            {
                var secs = o.ContainsKey("_seconds") ? Convert.ToInt64(o["_seconds"]) : Convert.ToInt64(o["seconds"]);
                return DateTimeOffset.FromUnixTimeSeconds(secs).LocalDateTime.Date;
            }

            return DateTime.MinValue;
        }

        [NonAction]
        private static DateTime ParseDateLoose(string s)
        {
            if (string.IsNullOrWhiteSpace(s)) return DateTime.MinValue;
            if (DateTime.TryParse(s, out var dt)) return dt.ToLocalTime().Date;

            // dd/MM/yyyy -> yyyy-MM-dd
            var m = System.Text.RegularExpressions.Regex.Match(s, @"^(\d{2})\/(\d{2})\/(\d{4})$");
            if (m.Success &&
                DateTime.TryParse($"{m.Groups[3].Value}-{m.Groups[2].Value}-{m.Groups[1].Value}", out var d2))
                return d2.Date;

            // yyyy-MM-ddTHH:mm:ss -> take date part
            if (s.Length > 10 && s.Contains('T'))
            {
                var onlyDate = s[..10];
                if (DateTime.TryParse(onlyDate, out var d3)) return d3.Date;
            }

            return DateTime.MinValue;
        }

        // DTO returned to the dashboard
        public class AdminMetricsDto
        {
            public List<string> Labels { get; set; } = new();
            public int TotalUsers { get; set; }
            public int AppointmentsUpcoming { get; set; }
            public int AppointmentsToday { get; set; }
            public int AppointmentsCompletedThisMonth { get; set; }
            public int AppointmentsCancelledThisMonth { get; set; }
            public int InquiriesOpen { get; set; }
            public int InquiriesClosed { get; set; }
            public int InquiriesOpenedThisMonth { get; set; }
            public int InquiriesResolvedThisMonth { get; set; }
            public List<int> AppointmentsByMonth { get; set; } = new();
            public List<int> InquiriesByMonth { get; set; } = new();
        }
    }
}