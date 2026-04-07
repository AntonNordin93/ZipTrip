using System.Globalization;
using System.Reflection.Metadata.Ecma335;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using ZipTrip.Domain.Entities;
using ZipTrip.Domain.Enums;
using ZipTrip.Services.DTOs.Common;
using ZipTrip.Services.Interfaces;

namespace ZipTrip.Services.Implementations
{
    public class RouteStopService : IRouteStopService
    {
        private readonly HttpClient _httpClient;
        private readonly string _nobilApiKey;

        public RouteStopService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _nobilApiKey = configuration["Nobil:ApiKey"] ?? "anon";

            if (!_httpClient.DefaultRequestHeaders.Contains("User-Agent"))
            {
                _httpClient.DefaultRequestHeaders.Add("User-Agent", "ZipTripApp/1.0");
            }
        }
        public async Task<List<RouteStop>> GetSuggestedStopsAsync(List<CoordinatePoint> routeGeometry, List<StopType> typesToFind)
        {
            var allStops = new List<RouteStop>();
            if (routeGeometry == null || routeGeometry.Count == 0) return allStops;
            var checkPoints = new List<CoordinatePoint>();

            int maxCheckPoints = 10;
            int step=Math.Max(1,routeGeometry.Count / maxCheckPoints);
            for (int i = 0; i < routeGeometry.Count; i += step)
            {
                checkPoints.Add(routeGeometry[i]);
            }

            if (!checkPoints.Contains(routeGeometry.Last()))
            {
                checkPoints.Add(routeGeometry.Last());
            }
            ;


            foreach (var point in checkPoints)
            {
                var tasks = new List<Task<List<RouteStop>>>();
                foreach (var type in typesToFind)
                {
                    if (type == StopType.Charging)
                        tasks.Add(GetNobilStopsAsync(point));
                    else
                        tasks.Add(GetOverpassStopsAsync(point, type));
                }

                var results = await Task.WhenAll(tasks);
                foreach (var stopList in results)
                {
                    allStops.AddRange(stopList);
                }
                await Task.Delay(500);
            }
            return allStops.GroupBy(s => s.Name).Select(g => g.First()).Take(25).ToList();
        }
        private async Task<List<RouteStop>> GetNobilStopsAsync(CoordinatePoint point)
        {
            var url = $"https://nobil.no/api/server/search.php?apikey={_nobilApiKey}&apiver=3&action=near&lat={point.Latitude.ToString(CultureInfo.InvariantCulture)}&lon={point.Longitude.ToString(CultureInfo.InvariantCulture)}&radius=5000";

            try
            {
                var response = await _httpClient.GetAsync(url);
                var content = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(content);
                var list = new List<RouteStop>();
                if (doc.RootElement.TryGetProperty("chargerstations", out var stations))
                {
                    foreach (var s in stations.EnumerateArray())
                    {
                        var m = s.GetProperty("cs");
                        list.Add(new RouteStop
                        {
                            ExternalId = m.GetProperty("id").GetRawText(),
                            Provider = "Nobil",
                            Name = m.GetProperty("name").GetString() ?? "Chargingstation",
                            Type = StopType.Charging,
                            Latitude = double.Parse(m.GetProperty("lat").GetString()!, CultureInfo.InvariantCulture),
                            Longitude = double.Parse(m.GetProperty("lon").GetString()!, CultureInfo.InvariantCulture)
                        });
                    }
                }
                return list;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"API FEL: {ex.Message}");
                return new List<RouteStop>();
            }

        }
        private async Task<List<RouteStop>> GetOverpassStopsAsync(CoordinatePoint point, StopType type)
        {
            var tag = type switch
            {
                StopType.Fuel => "amenity=fuel",
                StopType.Camping => "tourism=camp_site",
                StopType.Lodging => "tourism=hotel",
                StopType.Sightseeing => "tourism=attraction",
                StopType.GrillArea => "amenity=bbq",
                StopType.Restaurant => "amenity=restaurant",
                StopType.RestArea => "highway=rest_area",
                _ => "tourism=viewpoint"
            };
            var query = $"[out:json];node[{tag}](around:5000,{point.Latitude.ToString(CultureInfo.InvariantCulture)},{point.Longitude.ToString(CultureInfo.InvariantCulture)});out;";
            var url = $"https://overpass-api.de/api/interpreter?data={Uri.EscapeDataString(query)}";

            try
            {
                var response = await _httpClient.GetAsync(url);
                var content = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(content);
                var list = new List<RouteStop>();
                foreach (var el in doc.RootElement.GetProperty("elements").EnumerateArray())
                {
                    list.Add(new RouteStop
                    {
                        ExternalId = el.GetProperty("id").GetRawText(),
                        Provider = "OpenStreetMap",
                        Name = el.TryGetProperty("tags", out var t) && t.TryGetProperty("name", out var n)
                        ? (n.GetString()!.Length > 190 ? n.GetString()!.Substring(0, 190) + "..." : n.GetString()!)
                        : $"{type} Spot",
                        Type = type,
                        Latitude = el.GetProperty("lat").GetDouble(),
                        Longitude = el.GetProperty("lon").GetDouble()
                    });
                }
                return list;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"API FEL: {ex.Message}");
                return new List<RouteStop>();
            }
        }
    }
}
