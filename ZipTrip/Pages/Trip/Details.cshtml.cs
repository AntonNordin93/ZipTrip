using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using ZipTrip.Domain.Enums;
using ZipTrip.Services.DTOs.Trip;
using ZipTrip.Services.Interfaces;

namespace ZipTrip.Pages.Trip
{
    public class DetailsModel : PageModel
    {
        private readonly IRouteStopService _routeStopService;
        private readonly IRouteCalculatorService _routeCalculatorService;

        public DetailsModel(IRouteStopService routeStopService, IRouteCalculatorService routeCalculatorService)
        {
            _routeStopService = routeStopService;
            _routeCalculatorService = routeCalculatorService;
        }

        public TripResponse? Trip { get; set; }

        public async Task<IActionResult> OnGetAsync(string start, string end)
        {
            if (string.IsNullOrEmpty(start) || string.IsNullOrEmpty(end))
                return RedirectToPage("/Trip/Create");

            Trip = new TripResponse
            {
                StartLocation = start,
                EndLocation = end,
                Title = "Din Resplan"
            };

            return Page();
        }

        public async Task<JsonResult> OnGetFetchStopsAsync(string start, string end, string type)
        {
            try
            {
                if (!Enum.TryParse<StopType>(type, true, out var stopType))
                    return new JsonResult(new { success = false, message = "Ogiltig typ" });

                // 1. Hämta ruttens geometri
                var routeData = await _routeCalculatorService.CalculateBaseRouteAsync(start, end);

                // 2. Hämta stopp längs rutten via TomTom
                var stops = await _routeStopService.GetSuggestedStopsAsync(routeData.Geometry, new List<StopType> { stopType });

                // 3. Formatera datan så JavaScriptet förstår den (viktigt med gemener på namnen här)
                var formattedStops = stops.Select(s => new {
                    name = s.Name ?? "Okänd station",
                    latitude = s.Latitude,
                    longitude = s.Longitude
                }).ToList();

                return new JsonResult(new { success = true, stops = formattedStops });
            }
            catch (Exception ex)
            {
                // Logga felet internt om det behövs
                return new JsonResult(new { success = false, message = ex.Message });
            }
        }

        public async Task<JsonResult> OnGetRouteDataAsync(string start, string end)
        {
            try
            {
                var data = await _routeCalculatorService.CalculateBaseRouteAsync(start, end);
                return new JsonResult(data);
            }
            catch
            {
                return new JsonResult(null);
            }
        }
    }
}