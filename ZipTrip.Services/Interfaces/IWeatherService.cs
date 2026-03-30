using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using ZipTrip.Services.DTOs.Weather;

namespace ZipTrip.Services.Interfaces
{
    public interface IWeatherService
    {
        Task <WeatherResponse> GetWeatherForIndexAsync(double latitude, double longitude);
        Task <WeatherForecastDto> GetCurrentWeatherAsync(double latitude, double longitude);
        Task <WeatherResponse> GetWeatherForIndexAsync(double latitude, double longitude, string language);
    }
}
