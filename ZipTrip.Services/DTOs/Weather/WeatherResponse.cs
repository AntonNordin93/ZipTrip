using System;
using System.Collections.Generic;
using System.Text;

namespace ZipTrip.Services.DTOs.Weather
{
    public class WeatherResponse
    {
        public double Longitude { get; set; }
        public double Latitude { get; set; }
        public WeatherForecastDto? Current { get; set; }
        public List<WeatherForecastDto> Hourly { get; set; }=new();
        public List<WeatherForecastDto> Daily { get; set; }=new();
        public string UsedApi { get; set; } = string.Empty;
        public bool Success { get; set; }=true;
        public string? ErrorMessage { get; set; } 
    }
}
