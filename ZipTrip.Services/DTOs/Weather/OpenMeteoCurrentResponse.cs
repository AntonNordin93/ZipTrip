using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json.Serialization;
namespace ZipTrip.Services.DTOs.Weather
{
    public class OpenMeteoCurrentResponse
    {
        [JsonPropertyName("latitude")]
        public double Latitude { get; set; }
        [JsonPropertyName("longitude")]
        public string Longitude { get; set; }= string.Empty;
        [JsonPropertyName("current")]
        public OpenMeteoCurrent Current { get; set; } = new();
    }

    public class OpenMeteoCurrent
    {
        [JsonPropertyName("time")]
        public string Time { get; set; } = string.Empty;
        [JsonPropertyName("temperature_2m")]
        public double Temperature2m { get; set; }
        [JsonPropertyName("wind_speed_10m")]
        public double WindSpeed10m { get; set; }
        [JsonPropertyName("precipitation_probability")]
        public double PrecipitationProbability { get; set; }
        [JsonPropertyName("weather_code")]
        public int WeatherCode { get; set; }
    }
}
