using System;
using System.Collections.Generic;
using ZipTrip.Domain.Enums;

namespace ZipTrip.Services.DTOs.Trip
{
    public class TripDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; }= string.Empty;
        public string StartLocation { get; set; }=string.Empty;
        public string EndLocation { get; set; }=string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public VehicleType VehicleType { get; set; }
        public decimal TotalDistanceKm { get; set; }
        public decimal TotalDurationHours { get; set; }
        public decimal EstimatedCost { get; set; }
        public string? Notes { get; set; }
        public TripStatus Status { get; set; }

        public string? UserFirstName { get; set; }
        public string? UserLastName { get; set; }

        public string? UserVehicleName { get; set; }

        public List<StopDto> Stops { get; set; } = new();
    }

    public class StopDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }=string.Empty;
        public StopType Type { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public int StopOrder { get; set; }
        public decimal? EstimatedStopTimes { get; set; }
    }
}
