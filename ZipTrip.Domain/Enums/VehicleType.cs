using System;
using System.Collections.Generic;
using System.Text;
using System.ComponentModel.DataAnnotations;

namespace ZipTrip.Domain.Enums
{
    public enum VehicleType
    {
        [Display(Name = "Ordinary Car")]
        OrdinaryCar=0,
        [Display(Name = "Electric Car")]
        ElectricCar=1,
        [Display(Name = "Motor Home")]
        MotorHome=2,
        [Display(Name = "Caravan/trailer")]
        Caravan=3
    }
}
