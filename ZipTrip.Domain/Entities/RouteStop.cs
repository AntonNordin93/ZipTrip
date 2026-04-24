

using ZipTrip.Domain.Enums;

namespace ZipTrip.Domain.Entities
{
    public class RouteStop
    {
        public Guid Id { get; set; }= Guid.NewGuid();
        public string Name { get; set; }= string.Empty;
        public StopType Type { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public int StopOrder { get; set; }
        public decimal? EstimatedStopTimesMinutes { get; set; }
        public string? Notes { get; set; }

        public string? ExternalId { get; set; }
        public string? Provider { get; set; }
        public Guid TripId { get; set; }
        public Trip Trip { get; set; }= null!;
    }
}
