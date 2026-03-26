using System.Reflection.Metadata;
using ZipTrip.Domain.Enums;

namespace ZipTrip.Domain.Entities
{
    public class Trip
    {
        public Guid Id { get; set; }= Guid.NewGuid();
        public string Title { get; set; }= string.Empty;
        public string StartLocation { get; set; }= string.Empty;
        public string EndLocation { get; set; }= string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal TotalDistanceKm { get; set; }
        public decimal EstimatedDurationHours { get; set; }
        public decimal EstimatedCost { get; set; }
        public string? Notes { get; set; }= string.Empty;
        public TripStatus Status { get; set; }= TripStatus.Planned;

        public string UserId { get; set; }= string.Empty;
        public User User { get; set; }= null!;
        public Guid? UserVehicleId { get; set; }
        public UserVehicle? UserVehicle { get; set; }
        public ICollection<RouteStop> Stops { get; set; }= new List<RouteStop>();
    }
}
