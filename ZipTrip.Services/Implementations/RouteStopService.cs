using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Caching.Memory;
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
        private readonly IMemoryCache _cache;

        public RouteStopService(HttpClient httpClient, IConfiguration configuration, IMemoryCache cache)
        {
            _httpClient = httpClient;
            _cache = cache;
            _tomtomApiKey = configuration["TomTom:ApiKey"] ?? throw new ArgumentNullException("ApiKey saknas");
        }

        public async Task<List<RouteStop>> GetSuggestedStopsAsync(List<CoordinatePoint> routeGeometry, List<StopType> typesToFind)
        {
            var allStops = new List<RouteStop>();
            if (routeGeometry == null || routeGeometry.Count < 2) return allStops;

            var type = typesToFind.FirstOrDefault();

            // 1. Skapa unik Cache-nyckel
            var firstPoint = routeGeometry.First();
            var lastPoint = routeGeometry.Last();
            string cacheKey = $"Stops_{firstPoint.Latitude}_{firstPoint.Longitude}_{lastPoint.Latitude}_{lastPoint.Longitude}_{type}";

            // 2. Kolla Cache - Blixtsnabb laddning om datan redan finns!
            if (_cache.TryGetValue(cacheKey, out List<RouteStop>? cachedStops) && cachedStops != null)
            {
                return cachedStops;
            }

            string searchTerm = type switch
            {
                StopType.Fuel => "gas station",
                StopType.Charging => "ev charging station",
                StopType.Restaurant => "restaurant",
                _ => "poi"
            };

            // 3. Original-loopen (Täcker hela vägen, säkert och stabilt)
            int numSegments = 20;
            int segmentSize = routeGeometry.Count / numSegments;

            for (int i = 0; i < numSegments; i++)
            {
                var segment = routeGeometry.Skip(i * segmentSize).Take(segmentSize + 1).ToList();
                var stops = await SearchSegmentAsync(segment, searchTerm, type);

                foreach (var stop in stops)
                {
                    if (!allStops.Any(x => x.ExternalId == stop.ExternalId))
                    {
                        allStops.Add(stop);
                    }
                }

                await Task.Delay(250); // Paus så TomTom inte blockerar
            }

            // 4. Spara resultatet i cachen i 30 minuter
            var cacheOptions = new MemoryCacheEntryOptions().SetAbsoluteExpiration(TimeSpan.FromMinutes(30));
            _cache.Set(cacheKey, allStops, cacheOptions);

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