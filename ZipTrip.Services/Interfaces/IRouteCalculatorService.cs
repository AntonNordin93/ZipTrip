using System;
using System.Collections.Generic;
using System.Text;
using ZipTrip.Services.DTOs.Trip;

namespace ZipTrip.Services.Interfaces
{
    public interface IRouteCalculatorService
    {
        Task<RouteCalculationResult?> CalculateBaseRouteAsync(string startLocation, string endLocation);
    }
}
