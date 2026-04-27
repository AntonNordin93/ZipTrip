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
        private readonly ITripService _tripService;

        public CreateModel(IRouteCalculatorService routeCalculatorService, IRouteStopService routeStopService, ITripService tripService)
        {
            _routeCalculatorService = routeCalculatorService;
            _routeStopService = routeStopService;
            _tripService = tripService;
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

        public async Task<IActionResult> OnPostSaveTripAsync([FromBody] TripRequest request)
        {
            if (User.Identity?.IsAuthenticated == true)
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    request.Title = string.IsNullOrEmpty(request.Title) ? $"{request.StartLocation} to {request.EndLocation}" : request.Title;

                    // Explicitly construct the proper format for validation
                    var sanitizedRequest = new TripRequest
                    {
                        Title = request.Title,
                        StartLocation = request.StartLocation,
                        EndLocation = request.EndLocation,
                        StartDate = request.StartDate,
                        VehicleType = request.VehicleType,
                        SelectedStops = request.SelectedStops
                    };

                    var savedTrip = await _tripService.CreateTripAsync(sanitizedRequest, userId);
                    return new JsonResult(new { success = true, tripId = savedTrip.Id });
                }
            }
            return new JsonResult(new { success = false, message = "Not authenticated" });
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