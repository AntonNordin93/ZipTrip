using System;
using System.Collections.Generic;
using System.Net.Http.Json;
using System.Text;
using ZipTrip.Services.Interfaces;
using ZipTrip.Services.DTOs.Weather;
using System.Threading.Tasks;

namespace ZipTrip.Services.Implementations
{
    public class WeatherRepository : IWeatherRepository
    {
        private readonly HttpClient _httpClient;
        public WeatherRepository(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }
        public async Task<WeatherResponse> GetFromOpenMeteoAsync(double latitude, double longitude, DateTime from, DateTime to)
        {
            try
            {
                var url = $"https://api.open-meteo.com/v1/forecast?" +
                      $"latitude={latitude}&longitude={longitude}" +
                      $"&hourly=temperature_2m,wind_speed_10m,precipitation_probability,weather_code" +
                      $"&timezone=Europe%2FStockholm" +
                      $"&start_date={from:yyyy-MM-dd}&end_date={to:yyyy-MM-dd}";

                var response = await _httpClient.GetFromJsonAsync<OpenMeteoResponse>(url);

                if (response == null)
                {
                    return new WeatherResponse
                    {
                        Success = false,
                        ErrorMessage = "Inget svar från Open-Meteo"
                    };
                }
                var weatherResponse = new WeatherResponse
                {
                    Longitude = longitude,
                    Latitude = latitude,
                    UsedApi = "Open-Meteo",
                    Success = true,
                    Hourly = new List<WeatherForecastDto>()
                };
                return weatherResponse;

            }
            catch (Exception ex)
            {
                return new WeatherResponse
                {
                    Success = false,
                    ErrorMessage = $"Open-Meteo Fel: {ex.Message}"
                };
            }
        }
        public async Task<WeatherResponse> GetFromSmhiAsync(double latitude, double longitude, DateTime from, DateTime to)
        {
            return new WeatherResponse
            {
                Success = false,
                ErrorMessage = "SMHI API inte implementerat än"
            };
        }

        public async Task<WeatherResponse> GetCurrentFromOpenMeteoAsync(double latitude, double longitude)
        {
            try
            {
                var url = $"https://api.open-meteo.com/v1/forecast?" +
                      $"latitude={latitude}&longitude={longitude}" +
                      $"&hourly=temperature_2m,wind_speed_10m,precipitation_probability,weather_code";

                var response = await _httpClient.GetFromJsonAsync<OpenMeteoResponse>(url);

                return new WeatherResponse
                {
                    Longitude = longitude,
                    Latitude = latitude,
                    UsedApi = "Open-Meteo",
                    Success = true,

                };

            }
            catch (Exception ex)
            {
                return new WeatherResponse
                {
                    Success = false,
                    ErrorMessage = $"Open-Meteo Fel: {ex.Message}"
                };
            }
        }
    }
}
