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
    }
}
