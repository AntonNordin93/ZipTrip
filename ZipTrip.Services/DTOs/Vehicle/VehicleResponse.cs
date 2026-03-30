using System;
using System.Collections.Generic;
using System.Text;

namespace ZipTrip.Services.DTOs.Vehicle
{
    public class VehicleResponse
    {
        public Guid Id { get; set; }
        public string Name { get; set; }=string.Empty;
        public string VehicleTypeName { get; set; }=string.Empty;
        public decimal? MaxHeightMeters { get; set; }
        public decimal? MaxWeightKg { get;set; }
        public decimal? MaxRangeKm { get;set; }
        public bool IsDefault { get; set; }
    }
}
