using System;
using System.Collections.Generic;
using System.Text;

namespace ZipTrip.Services.DTOs.Weather
{
    public class WeatherForecastDto
    {
        public DateTime Time { get; set; }
        public double TemperatureC { get; set; }
        public double WindSpeedMs { get; set; }
        public int WeatherCode { get; set; }
        public string Description { get; set; }= string.Empty;
        public string Icon { get; set; } = "☀️";
        public double PrecipitationProbability { get; set; }
        public string Source { get; set; } = "Unknown";
        
        public string TempC=> $"{TemperatureC:F1}°C";
        public string TempF => $"{(TemperatureC * 9 / 5 + 32):F1}°F";
        public string WindKmh=> $"{(WindSpeedMs * 3.6):F1} km/h";
        public string WindMs => $"{WindSpeedMs:F1} m/s";

        public string PrecipitationDisplay => $"{PrecipitationProbability:F0}%";


    }
}
