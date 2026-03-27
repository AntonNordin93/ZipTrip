using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json.Serialization;
namespace ZipTrip.Services.DTOs.Weather
{
    public class OpenMeteoResponse
    {
        [JsonPropertyName("latitude")]
        public double Latitude { get; set; }

        [JsonPropertyName("longitude")]
        public double Longitude { get; set; }

        [JsonPropertyName("hourly")]
        public OpenMeteoHourly Hourly { get; set; } = new();
    }
    public class OpenMeteoHourly
    {
        [JsonPropertyName("time")]
        public List<string> Time { get; set; } = new();
        [JsonPropertyName("temperature_2m")]
        public List<double> Temperature2m { get; set; } = new();
        [JsonPropertyName("wind_speed_10m")]
        public List<double> WindSpeed10m { get; set; } = new();
        [JsonPropertyName("precipitation_probability")]
        public List<double> PrecipitationProbability { get; set; } = new();
        [JsonPropertyName("weather_code")]
        public List<int> WeatherCode { get; set; } = new();
    }
}
