using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using System.Text.Json;
using ZipTrip.Services.DTOs.Common;
using ZipTrip.Services.DTOs.Trip;
using ZipTrip.Services.Interfaces;

namespace ZipTrip.Services.Implementations
{
    public class RouteCalculatorService : IRouteCalculatorService
    {
        private readonly HttpClient _httpClient;

        public RouteCalculatorService(HttpClient httpClient)
        {
            _httpClient = httpClient;

            if (!_httpClient.DefaultRequestHeaders.Contains("User-Agent"))
            {
                _httpClient.DefaultRequestHeaders.Add("User-Agent", "ZipTripApp/1.0");
            }
        }

        public async Task<RouteCalculationResult?> CalculateBaseRouteAsync(string startLocation, string endLocation)
        {

            var start = await GetCoordsAsync(startLocation);
            var end = await GetCoordsAsync(endLocation);

            if (start == null || end == null) {
                return null;
            }

            var osrmUrl = $"https://router.project-osrm.org/route/v1/driving/" +
                          $"{start.Longitude.ToString(CultureInfo.InvariantCulture)},{start.Latitude.ToString(CultureInfo.InvariantCulture)};" +
                          $"{end.Longitude.ToString(CultureInfo.InvariantCulture)},{end.Latitude.ToString(CultureInfo.InvariantCulture)}" +
                          $"?overview=full&geometries=geojson";
            var response = await _httpClient.GetAsync(osrmUrl);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(content);

            var route = doc.RootElement.GetProperty("routes")[0];

            var result = new RouteCalculationResult
            {
                DistanceKm = (decimal)route.GetProperty("distance").GetDouble() / 1000m,
                DurationHours = (decimal)route.GetProperty("duration").GetDouble() / 3600m
            };

            var geometry = route.GetProperty("geometry").GetProperty("coordinates");
            foreach (var point in geometry.EnumerateArray())
            {
                result.Geometry.Add(new CoordinatePoint
                {
                    Longitude = point[0].GetDouble(),
                    Latitude = point[1].GetDouble()
                });
            }
            return result;
        }
        private async Task<CoordinatePoint?> GetCoordsAsync(string location)
        {
            var url = $"https://nominatim.openstreetmap.org/search?format=json&q={Uri.EscapeDataString(location)}&limit=1";

            try
            {
                var response = await _httpClient.GetAsync(url);
                var content = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize < JsonElement[]>(content);

                if(data==null||data.Length==0)
                {
                    return null;
                }

                return new CoordinatePoint
                {
                    Latitude = double.Parse(data[0].GetProperty("lat").GetString()!, CultureInfo.InvariantCulture),
                    Longitude = double.Parse(data[0].GetProperty("lon").GetString()!, CultureInfo.InvariantCulture)
                };
            }
            catch
            {
                return null;
            }
        }
    }
}
