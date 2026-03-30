using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using ZipTrip.Services.DTOs.Weather;
using ZipTrip.Services.Interfaces;
using ZipTrip.Services.Mappings;

namespace ZipTrip.Services.Implementations
{
    public class WeatherService : IWeatherService
    {
        private readonly IWeatherRepository _repository;
        private readonly ILogger<WeatherService> _logger;
        private readonly IMemoryCache _cache;

        public WeatherService(IWeatherRepository repository, ILogger<WeatherService> logger, IMemoryCache cache)
        {
            _repository = repository;
            _logger = logger;
            _cache = cache;
        }

        public async Task<WeatherResponse> GetWeatherForIndexAsync(double latitude, double longitude)
        {
            return await GetWeatherForIndexAsync(latitude, longitude, "sv");

        }
        public async Task<WeatherResponse> GetWeatherForIndexAsync(double latitude, double longitude, string language)
        {
            string cacheKey = $"weather_index_{latitude:F4}_{longitude:F4}_{language}";

            if (_cache.TryGetValue(cacheKey, out WeatherResponse? cached))
            {
                _logger.LogInformation("Weather data for index {Lat}, {Lon} retrieved from cache.", latitude, longitude);
                return cached!;
            }

            _logger.LogInformation("Fetching weather data for index {Lat}, {Lon} from repository.", latitude, longitude);

            var response = await _repository.GetFromOpenMeteoAsync(latitude, longitude, DateTime.Today, DateTime.Today.AddDays(3));
            if (!response.Success)
            {
                _logger.LogWarning("Failed to fetch weather data for index {Lat}, {Lon}: {ErrorMessage}", latitude, longitude, response.ErrorMessage);
                response = await _repository.GetFromSmhiAsync(latitude, longitude, DateTime.Today, DateTime.Today.AddDays(3));
            }
            if (response.Success && response.Hourly != null)
            {
                foreach (var item in response.Hourly)
                {
                    var (desc, icon) = WeatherCodeMapper.GetWeatherInfo(item.WeatherCode, language);
                    item.Description = desc;
                    item.Icon = icon;
                }
            }
            var cacheOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30)
            };
            _cache.Set(cacheKey, response, cacheOptions);
            _logger.LogInformation("Weather data for index {Api} for {Lat}, {Lon} cached for 30 minutes.", response.UsedApi, latitude, longitude);
            return response;
        }

        public async Task<WeatherForecastDto> GetCurrentWeatherAsync(double latitude, double longitude)
        {
            var response = await _repository.GetCurrentFromOpenMeteoAsync(latitude, longitude);
            if (response.Success && response.Current != null)
            {
                var (desc, icon) = WeatherCodeMapper.GetWeatherInfo(response.Current.WeatherCode);
                response.Current.Description = desc;
                response.Current.Icon = icon;

                return response.Current;

            }
            _logger.LogWarning("Failed to fetch current weather data for {Lat}, {Lon} from OpenMeteo", latitude, longitude);
            return  new WeatherForecastDto();
        }
    }
}
