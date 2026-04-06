using System;
using System.Collections.Generic;
using System.Text;
using ZipTrip.Services.DTOs.Common;

namespace ZipTrip.Services.DTOs.Trip
{
    public class RouteCalculationResult
    {
        public decimal DistanceKm { get; set; }
        public decimal DurationHours { get; set; }

        public List<CoordinatePoint> Geometry { get; set; } = new();
    }
}
