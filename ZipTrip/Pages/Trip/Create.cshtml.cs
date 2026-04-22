using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using ZipTrip.Domain.Enums;
using ZipTrip.Services.DTOs.Trip;
using ZipTrip.Services.Interfaces;

namespace ZipTrip.Pages.Trip
{
    public class CreateModel : PageModel
    {
        private readonly IRouteCalculatorService _routeCalculatorService;
        private readonly IRouteStopService _routeStopService;

        public CreateModel(IRouteCalculatorService routeCalculatorService, IRouteStopService routeStopService)
        {
            _routeCalculatorService = routeCalculatorService;
            _routeStopService = routeStopService;
        }

        [BindProperty]
        public TripRequest Input { get; set; } = new TripRequest();

        public void OnGet() { }

        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid) return new JsonResult(new { success = false });
            var routeData = await _routeCalculatorService.CalculateBaseRouteAsync(Input.StartLocation, Input.EndLocation);
            return new JsonResult(new { success = true, geometry = routeData.Geometry, distanceKm = routeData.DistanceKm });
        }

        public IActionResult OnGetDetailsMenu()
        {
            return Partial("_TripDetailsPartial", this);
        }

        public async Task<JsonResult> OnGetFetchStopsAsync(string start, string end, string type)
        {
            try
            {
                if (!Enum.TryParse<StopType>(type, true, out var stopType)) return new JsonResult(new { success = false });
                var routeData = await _routeCalculatorService.CalculateBaseRouteAsync(start, end);
                var stops = await _routeStopService.GetSuggestedStopsAsync(routeData.Geometry, new List<StopType> { stopType });
                return new JsonResult(new { success = true, stops = stops.Select(s => new { name = s.Name, latitude = s.Latitude, longitude = s.Longitude }) });
            }
            catch { return new JsonResult(new { success = false }); }
        }
    }
}