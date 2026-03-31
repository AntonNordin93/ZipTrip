using System;
using System.Collections.Generic;
using System.Text;

namespace ZipTrip.Services.DTOs.Vehicle
{
    public class VehicleRequest
    {
        public string Name { get; set; }=string.Empty;
        public int VehicleType { get; set; }
        public decimal? MaxHeightMeters { get; set; }
        public decimal? MaxWeightKg { get; set; }
        public decimal? MaxRangeKm { get; set; }
        public bool IsDefault { get; set; }

    }
}
