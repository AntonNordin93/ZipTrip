using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using ZipTrip.Services.DTOs.Common;
using ZipTrip.Services.DTOs.Trip;
using ZipTrip.Services.Interfaces;

namespace ZipTrip.Services.Implementations
{
    public class RouteCalculatorService : IRouteCalculatorService
    {
        private readonly HttpClient _httpClient;
        private readonly string _tomtomApiKey;

        public RouteCalculatorService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _tomtomApiKey = configuration["TomTom:ApiKey"] ?? string.Empty;

            if (!_httpClient.DefaultRequestHeaders.Contains("User-Agent"))
            {
                _httpClient.DefaultRequestHeaders.Add("User-Agent", "ZipTripApp/1.0");
            }
        }

        public async Task<RouteCalculationResult?> CalculateBaseRouteAsync(string startLocation, string endLocation, string routeType = "fastest")
        {
            var start = await GetCoordsAsync(startLocation);
            var end = await GetCoordsAsync(endLocation);

            if (start == null || end == null) {
                return null;
            }

            // Mappa lokala typer till TomToms routeType och vehicleLoadType
            // TomTom routeTypes: fastest, shortest, eco, thrilling
            string tomTomRouteType = "fastest";

            if (routeType.Equals("scenic", StringComparison.OrdinalIgnoreCase))
            {
                tomTomRouteType = "thrilling";
            }
            else if (routeType.Equals("short", StringComparison.OrdinalIgnoreCase))
            {
                tomTomRouteType = "shortest";
            }

            // Using TomTom API! 
            string tomtomUrl = $"https://api.tomtom.com/routing/1/calculateRoute/" +
                               $"{start.Latitude.ToString(CultureInfo.InvariantCulture)},{start.Longitude.ToString(CultureInfo.InvariantCulture)}:" +
                               $"{end.Latitude.ToString(CultureInfo.InvariantCulture)},{end.Longitude.ToString(CultureInfo.InvariantCulture)}" +
                               $"/json?routeType={tomTomRouteType}&traffic=false&travelMode=car&key={_tomtomApiKey}";

            var response = await _httpClient.GetAsync(tomtomUrl);
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"TomTom API Error: {response.StatusCode} - {errorContent}");
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(content);

            var route = doc.RootElement.GetProperty("routes")[0];
            var summary = route.GetProperty("summary");

            var result = new RouteCalculationResult
            {
                DistanceKm = (decimal)summary.GetProperty("lengthInMeters").GetInt32() / 1000m,
                DurationHours = (decimal)summary.GetProperty("travelTimeInSeconds").GetInt32() / 3600m
            };

            var legs = route.GetProperty("legs")[0];
            var points = legs.GetProperty("points");

            foreach (var point in points.EnumerateArray())
            {
                result.Geometry.Add(new CoordinatePoint
                {
                    Latitude = point.GetProperty("latitude").GetDouble(),
                    Longitude = point.GetProperty("longitude").GetDouble()
                });
            }

            return result;
        }
        private async Task<CoordinatePoint?> GetCoordsAsync(string location)
        {
            var url = $"https://api.tomtom.com/search/2/geocode/{Uri.EscapeDataString(location)}.json?key={_tomtomApiKey}&limit=1";

            try
            {
                var response = await _httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode) return null;

                var content = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(content);

                var results = doc.RootElement.GetProperty("results");
                if (results.GetArrayLength() == 0)
                {
                    return null;
                }

                var position = results[0].GetProperty("position");

                return new CoordinatePoint
                {
                    Latitude = position.GetProperty("lat").GetDouble(),
                    Longitude = position.GetProperty("lon").GetDouble()
                };
            }
            catch
            {
                return null;
            }
        }
    }
}
