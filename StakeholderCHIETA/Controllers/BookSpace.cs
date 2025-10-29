using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace StakeholderCHIETA.Controllers
{
    [ApiController]
    [Route("api")]
    public class BookSpaceController : ControllerBase
    {
        private readonly FirestoreDb _db;
        public BookSpaceController(FirestoreDb db) => _db = db;

        // Helpers 
        private static string ToDateKey(DateTimeOffset dt, string tz = "Africa/Johannesburg")
        {
            // Works cross-platform. On Linux containers, IANA id is usually present.
            TimeZoneInfo tzInfo;
            try { tzInfo = TimeZoneInfo.FindSystemTimeZoneById(tz); }
            catch (TimeZoneNotFoundException)
            { tzInfo = TimeZoneInfo.FindSystemTimeZoneById("South Africa Standard Time"); }

            var local = TimeZoneInfo.ConvertTime(dt, tzInfo);
            return local.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        }

        // DTOs
        public class SpaceDto
        {
            public string Id { get; set; } = default!;
            public string Name { get; set; } = default!;
            public string Type { get; set; } = default!;
            public int Capacity { get; set; }
            public string Location { get; set; } = "";
            public bool IsActive { get; set; } = true;
        }

        public class AvailabilityRequest
        {
            public DateTimeOffset StartTime { get; set; }
            public DateTimeOffset EndTime { get; set; }
            public int AttendeeCount { get; set; }
            public string? Type { get; set; }
        }

        public class BookRequest
        {
            public string MeetingTitle { get; set; } = default!;
            public DateTimeOffset StartTime { get; set; }
            public DateTimeOffset EndTime { get; set; }
            public int AttendeeCount { get; set; }
            public string OrganizerUserId { get; set; } = default!;
            public string OrganizerName { get; set; } = "";
            public string Notes { get; set; } = "";
        }

        // Endpoints

        // List spaces from Firestore (collection: boardrooms)
        // GET /api/spaces?minCapacity=4&type=officeSpace
        [HttpGet("spaces")]
        public async Task<IActionResult> GetSpaces([FromQuery] int? minCapacity, [FromQuery] string? type)
        {
            Query q = _db.Collection("boardrooms");           // <— Query, not CollectionReference
            if (!string.IsNullOrWhiteSpace(type))
                q = q.WhereEqualTo("type", type);

            var snap = await q.GetSnapshotAsync();
            var list = snap.Documents.Select(d => new SpaceDto
            {
                Id = d.Id,
                Name = d.TryGetValue<string>("name", out var n) ? n : d.Id,
                Type = d.TryGetValue<string>("type", out var t) ? t : "boardroom",
                Capacity = d.TryGetValue<long>("capacity", out var c) ? (int)c : 0,
                Location = d.TryGetValue<string>("location", out var loc) ? loc : "",
                IsActive = d.TryGetValue<bool>("isActive", out var a) ? a : true
            });

            if (minCapacity.HasValue)
                list = list.Where(s => s.Capacity >= minCapacity.Value);

            return Ok(list.Where(s => s.IsActive));
        }


        // Availability from centralized bookings (collection: bookings)
        // POST /api/spaces/available
        [HttpPost("spaces/available")]
        public async Task<IActionResult> GetAvailable([FromBody] AvailabilityRequest req)
        {
            if (req.EndTime <= req.StartTime) return BadRequest("EndTime must be after StartTime");

            var dateKey = ToDateKey(req.StartTime);

            // Candidate spaces
            Query spacesQ = _db.Collection("boardrooms");        // <— Query here
            if (!string.IsNullOrWhiteSpace(req.Type))
                spacesQ = spacesQ.WhereEqualTo("type", req.Type);

            var spacesSnap = await spacesQ.GetSnapshotAsync();
            var candidates = spacesSnap.Documents
                .Select(d => new {
                    Id = d.Id,
                    Name = d.TryGetValue<string>("name", out var n) ? n : d.Id,
                    Type = d.TryGetValue<string>("type", out var t) ? t : "boardroom",
                    Capacity = d.TryGetValue<long>("capacity", out var cap) ? (int)cap : 0,
                    IsActive = d.TryGetValue<bool>("isActive", out var a) ? a : true
                })
                .Where(x => x.IsActive && x.Capacity >= req.AttendeeCount)
                .ToList();

            // Pull bookings for that day once; filter in memory per space
            var allBookingsSnap = await _db.Collection("bookings")
                .WhereEqualTo("dateKey", dateKey)
                .GetSnapshotAsync();

            var free = new List<object>();

            foreach (var s in candidates)
            {
                var hasConflict = allBookingsSnap.Documents.Any(doc =>
                {
                    var sid = doc.TryGetValue<string>("spaceId", out var spaceId) ? spaceId : "";
                    if (sid != s.Id) return false;

                    var status = doc.TryGetValue<string>("status", out var st) ? st : "";
                    if (status != "pending" && status != "confirmed") return false;

                    var bStart = doc.GetValue<Timestamp>("startTime").ToDateTimeOffset();
                    var bEnd = doc.GetValue<Timestamp>("endTime").ToDateTimeOffset();
                    return bStart < req.EndTime && bEnd > req.StartTime; // overlap
                });

                if (!hasConflict)
                    free.Add(new { id = s.Id, name = s.Name, type = s.Type, capacity = s.Capacity });
            }

            return Ok(free);
        }

        // Book space (writes to centralized bookings)
        // NOTE: AllowAnonymous is added for development convenience.
        // Replace with [Authorize] when your auth is wired end-to-end.
        [HttpPost("spaces/{spaceId}/book")]
        [AllowAnonymous]
        public async Task<IActionResult> Book([FromRoute] string spaceId, [FromBody] BookRequest req)
        {
            if (req.EndTime <= req.StartTime) return BadRequest("EndTime must be after StartTime");

            var spaceRef = _db.Collection("boardrooms").Document(spaceId);
            var spaceSnap = await spaceRef.GetSnapshotAsync();
            if (!spaceSnap.Exists) return NotFound("Space not found.");

            var capacity = spaceSnap.GetValue<long>("capacity");
            var isActive = spaceSnap.TryGetValue<bool>("isActive", out var a) ? a : true;
            var spaceName = spaceSnap.TryGetValue<string>("name", out var n) ? n : spaceId;
            var spaceType = spaceSnap.TryGetValue<string>("type", out var t) ? t : "boardroom";
            var spaceLocation = spaceSnap.TryGetValue<string>("location", out var loc) ? loc : "";

            if (!isActive) return BadRequest("Space is not active.");
            if (req.AttendeeCount > capacity) return BadRequest("Attendee count exceeds capacity.");

            var bookingsCol = _db.Collection("bookings");
            var dateKey = ToDateKey(req.StartTime);

            try
            {
                var created = await _db.RunTransactionAsync(async txn =>
                {
                    // Same-day bookings for this space
                    var qDate = bookingsCol
                        .WhereEqualTo("dateKey", dateKey)
                        .WhereEqualTo("spaceId", spaceId);

                    var allBookings = await txn.GetSnapshotAsync(qDate);

                    var hasConflict = allBookings.Documents.Any(doc =>
                    {
                        var status = doc.TryGetValue<string>("status", out var st) ? st : "";
                        if (status != "pending" && status != "confirmed") return false;

                        var bStart = doc.GetValue<Timestamp>("startTime").ToDateTimeOffset();
                        var bEnd = doc.GetValue<Timestamp>("endTime").ToDateTimeOffset();
                        return bStart < req.EndTime && bEnd > req.StartTime; // overlap
                    });

                    if (hasConflict)
                        throw new InvalidOperationException("Time slot taken.");

                    var docRef = bookingsCol.Document();
                    var uid = User?.Identity?.Name ?? req.OrganizerUserId ?? "anonymous";

                    var data = new Dictionary<string, object>
                    {
                        ["spaceId"] = spaceId,
                        ["spaceName"] = spaceName,
                        ["spaceType"] = spaceType,
                        ["spaceLocation"] = spaceLocation,
                        ["spaceCapacity"] = capacity,

                        ["meetingTitle"] = req.MeetingTitle,
                        ["startTime"] = req.StartTime.UtcDateTime,
                        ["endTime"] = req.EndTime.UtcDateTime,
                        ["dateKey"] = dateKey,

                        ["attendeeCount"] = req.AttendeeCount,
                        ["organizerUserId"] = uid,
                        ["organizerName"] = req.OrganizerName ?? "",
                        ["status"] = "confirmed",
                        ["notes"] = req.Notes ?? "",

                        ["createdAt"] = FieldValue.ServerTimestamp,
                        ["updatedAt"] = FieldValue.ServerTimestamp
                    };

                    txn.Create(docRef, data);
                    return new { id = docRef.Id, spaceId, spaceName };
                });

                return Ok(created);
            }
            catch (InvalidOperationException)
            {
                return Conflict("Another booking just took this time. Please choose a different slot.");
            }
        }

        // Current user's bookings
        [HttpGet("my/bookings")]
        [Authorize] // keep this protected
        public async Task<IActionResult> MyBookings()
        {
            var uid = User?.Identity?.Name ?? "";
            var q = _db.Collection("bookings").WhereEqualTo("organizerUserId", uid);
            var snap = await q.GetSnapshotAsync();

            var results = snap.Documents.Select(doc => new
            {
                id = doc.Id,
                spaceId = doc.TryGetValue<string>("spaceId", out var sid) ? sid : "",
                spaceName = doc.TryGetValue<string>("spaceName", out var sn) ? sn : "",
                spaceType = doc.TryGetValue<string>("spaceType", out var st) ? st : "",
                spaceLocation = doc.TryGetValue<string>("spaceLocation", out var sl) ? sl : "",
                spaceCapacity = doc.TryGetValue<long>("spaceCapacity", out var sc) ? (int)sc : 0,

                meetingTitle = doc.TryGetValue<string>("meetingTitle", out var mt) ? mt : "",
                startTime = doc.GetValue<Timestamp>("startTime").ToDateTime(),
                endTime = doc.GetValue<Timestamp>("endTime").ToDateTime(),
                attendeeCount = doc.TryGetValue<long>("attendeeCount", out var ac) ? ac : 0,
                status = doc.TryGetValue<string>("status", out var status) ? status : "",
                notes = doc.TryGetValue<string>("notes", out var notes) ? notes : "",
                createdAt = doc.TryGetValue<Timestamp>("createdAt", out var ca) ? ca.ToDateTime() : (DateTime?)null
            })
            .OrderBy(x => x.startTime)
            .ToList();

            return Ok(results);
        }

        // Cancel booking (aligns with JS below)
        // POST /api/bookings/{bookingId}/cancel
        [HttpPost("bookings/{bookingId}/cancel")]
        [Authorize]
        public async Task<IActionResult> CancelBooking([FromRoute] string bookingId)
        {
            var uid = User?.Identity?.Name ?? "";
            var bookingRef = _db.Collection("bookings").Document(bookingId);

            var snap = await bookingRef.GetSnapshotAsync();
            if (!snap.Exists) return NotFound("Booking not found.");

            var organizerId = snap.TryGetValue<string>("organizerUserId", out var oid) ? oid : "";
            if (organizerId != uid) return Forbid("You can only cancel your own bookings.");

            var status = snap.TryGetValue<string>("status", out var st) ? st : "";
            if (status == "cancelled") return BadRequest("Booking is already cancelled.");

            await bookingRef.UpdateAsync(new Dictionary<string, object>
            {
                ["status"] = "cancelled",
                ["updatedAt"] = FieldValue.ServerTimestamp
            });

            return Ok(new { message = "Booking cancelled successfully" });
        }

        // Optional admin listing
        [HttpGet("bookings")]
        [Authorize]
        public async Task<IActionResult> GetAllBookings([FromQuery] string? status = null, [FromQuery] string? spaceId = null, [FromQuery] string? dateKey = null)
        {
            Query q = _db.Collection("bookings");
            if (!string.IsNullOrWhiteSpace(status)) q = q.WhereEqualTo("status", status);
            if (!string.IsNullOrWhiteSpace(spaceId)) q = q.WhereEqualTo("spaceId", spaceId);
            if (!string.IsNullOrWhiteSpace(dateKey)) q = q.WhereEqualTo("dateKey", dateKey);

            var snap = await q.GetSnapshotAsync();
            var results = snap.Documents.Select(doc => new
            {
                id = doc.Id,
                spaceId = doc.TryGetValue<string>("spaceId", out var sid) ? sid : "",
                spaceName = doc.TryGetValue<string>("spaceName", out var sn) ? sn : "",
                meetingTitle = doc.TryGetValue<string>("meetingTitle", out var mt) ? mt : "",
                startTime = doc.GetValue<Timestamp>("startTime").ToDateTime(),
                endTime = doc.GetValue<Timestamp>("endTime").ToDateTime(),
                organizerName = doc.TryGetValue<string>("organizerName", out var on_) ? on_ : "",
                attendeeCount = doc.TryGetValue<long>("attendeeCount", out var ac) ? ac : 0,
                status = doc.TryGetValue<string>("status", out var st) ? st : ""
            })
            .OrderBy(x => x.startTime)
            .ToList();

            return Ok(results);
        }
    }
}
