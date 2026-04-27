using System;
using ZipTrip.Domain.Enums; 
using ZipTrip.Domain.Entities;

namespace ZipTrip.Services.DTOs.Trip
{
    public class TripRequest
    {
        public string Title { get; set; }= string.Empty;
        public string StartLocation { get; set; }=string.Empty;
        public string EndLocation { get; set; }=string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public VehicleType VehicleType { get; set; }

        public string? Notes { get; set; }
        public Guid? UserVehicleId { get; set; }

        public List<RouteStopRequest> SelectedStops { get; set; } = new();
    }

    public class RouteStopRequest
    {
        public string Name { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string Type { get; set; } = string.Empty;
    }
}
