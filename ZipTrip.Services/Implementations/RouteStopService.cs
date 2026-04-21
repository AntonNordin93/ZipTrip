using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using ZipTrip.Domain.Entities;
using ZipTrip.Domain.Enums;
using ZipTrip.Services.DTOs.Common;
using ZipTrip.Services.Interfaces;

namespace ZipTrip.Services.Implementations
{
    public class RouteStopService : IRouteStopService
    {
        private readonly HttpClient _httpClient;
        private readonly string _tomtomApiKey;

        public RouteStopService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _tomtomApiKey = configuration["TomTom:ApiKey"] ?? throw new ArgumentNullException("ApiKey saknas");
        }

        public async Task<List<RouteStop>> GetSuggestedStopsAsync(List<CoordinatePoint> routeGeometry, List<StopType> typesToFind)
        {
            var allStops = new List<RouteStop>();
            if (routeGeometry == null || routeGeometry.Count < 2) return allStops;

            string searchTerm = typesToFind.FirstOrDefault() switch
            {
                StopType.Fuel => "gas station",
                StopType.Charging => "ev charging station",
                StopType.Restaurant => "restaurant",
                _ => "poi"
            };


            int numSegments = 20;
            int segmentSize = routeGeometry.Count / numSegments;


            for (int i = 0; i < numSegments; i++)
            {
                var segment = routeGeometry.Skip(i * segmentSize).Take(segmentSize + 1).ToList();


                var stops = await SearchSegmentAsync(segment, searchTerm, typesToFind.FirstOrDefault());

                foreach (var stop in stops)
                {
                    if (!allStops.Any(x => x.ExternalId == stop.ExternalId))
                    {
                        allStops.Add(stop);
                    }
                }


                await Task.Delay(200);
            }

            return allStops;
        }

        private async Task<List<RouteStop>> SearchSegmentAsync(List<CoordinatePoint> segment, string searchTerm, StopType type)
        {
            var stops = new List<RouteStop>();


            string url = $"https://api.tomtom.com/search/2/searchAlongRoute/{searchTerm}.json?key={_tomtomApiKey}&maxDetourTime=1800&limit=2";

            var points = segment.Select(p => new { lat = p.Latitude, lon = p.Longitude }).ToList();

            if (points.Count > 30)
            {
                int step = points.Count / 30;
                points = points.Where((x, i) => i % step == 0).ToList();
            }

            var payload = new { route = new { points = points } };
            var content = new StringContent(JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");

            try
            {
                var response = await _httpClient.PostAsync(url, content);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("results", out var results))
                    {
                        foreach (var item in results.EnumerateArray())
                        {
                            stops.Add(new RouteStop
                            {
                                ExternalId = item.GetProperty("id").GetString(),
                                Name = item.GetProperty("poi").GetProperty("name").GetString(),
                                Latitude = item.GetProperty("position").GetProperty("lat").GetDouble(),
                                Longitude = item.GetProperty("position").GetProperty("lon").GetDouble(),
                                Type = type
                            });
                        }
                    }
                }
            }
            catch { }
            return stops;
        }
    }
}