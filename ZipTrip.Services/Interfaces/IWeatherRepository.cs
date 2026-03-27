using System;
using System.Collections.Generic;
using System.Text;
using ZipTrip.Services.DTOs.Weather;
namespace ZipTrip.Services.Interfaces
{
    public interface IWeatherRepository
    {
        Task<WeatherResponse> GetFromOpenMeteoAsync(double latitude, double longitude, DateTime from, DateTime to);
        Task<WeatherResponse> GetFromSmhiAsync(double latitude, double longitude, DateTime from, DateTime to);
        Task<WeatherResponse> GetCurrentFromOpenMeteoAsync(double latitude, double longitude);

    }
}
