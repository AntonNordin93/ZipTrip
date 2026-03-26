using System;
using System.Collections.Generic;
using System.Text;
using ZipTrip.Domain.Enums;

namespace ZipTrip.Domain.Entities
{
    public class VehicleSpecification
    {
        public Guid Id { get; set; }= Guid.NewGuid();
        public VehicleType Type { get; set; }
        public string Name { get; set; }= string.Empty;
        public decimal MaxHeightMeters { get; set; }
        public decimal MaxWeightKg { get; set; }
        public decimal RangeKm { get; set; }
        public bool NeedCampingCheck { get; set; }
    }
}
