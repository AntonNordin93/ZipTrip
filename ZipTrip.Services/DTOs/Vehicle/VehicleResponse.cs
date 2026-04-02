using System;
using System.Collections.Generic;
using System.Text;
using ZipTrip.Domain.Enums;
namespace ZipTrip.Services.DTOs.Vehicle
{
    public class VehicleResponse
    {
        public Guid Id { get; set; }
        public string Name { get; set; }=string.Empty;
        public VehicleType VehicleType { get; set; }
        public decimal? MaxHeightMeters { get; set; }
        public decimal? MaxWeightKg { get;set; }
        public decimal? RangeKm { get;set; }
        public int? Year { get; set; }
        public bool IsDefault { get; set; }
    }
}
