using System;
using System.Collections.Generic;
using System.Text;
using System.ComponentModel.DataAnnotations;

namespace ZipTrip.Domain.Enums
{
    public enum VehicleType
    {
        [Display(Name = "Ordinary Car")]
        OrdinaryCar,
        [Display(Name = "Electric Car")]
        ElectricCar,
        [Display(Name = "Motor Home")]
        MotorHome,
        [Display(Name = "Car with Trailer")]
        CarWithTrailer,
    }
}
