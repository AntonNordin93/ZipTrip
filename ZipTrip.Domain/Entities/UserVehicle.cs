using System;
using ZipTrip.Domain.Enums;

namespace ZipTrip.Domain.Entities
{
    public class UserVehicle
    {
        public Guid Id { get; set; }= Guid.NewGuid();
        public string Name { get; set; }= string.Empty;
        public VehicleType VehicleType { get; set; }
        public decimal? MaxHeightMeters { get; set; }
        public decimal? MaxWeightKg { get; set; }
        public decimal? RangeKm { get; set; }
        public bool IsDefault { get; set; }= false;
         public string UserId { get; set; }= string.Empty;
         public User User { get; set; }= null!;
    }
}
