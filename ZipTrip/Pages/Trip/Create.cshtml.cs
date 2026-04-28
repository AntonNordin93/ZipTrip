using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using ZipTrip.Domain.Enums;
using ZipTrip.Services.DTOs.Trip;
using ZipTrip.Services.DTOs.Vehicle;
using ZipTrip.Services.Interfaces;

namespace ZipTrip.Pages.Trip
{
    public class CreateModel : PageModel
    {
        private readonly IRouteCalculatorService _routeCalculatorService;
        private readonly IRouteStopService _routeStopService;
        private readonly ITripService _tripService;
        private readonly IVehicleService _vehicleService; // injected vehicle service

        public CreateModel(IRouteCalculatorService routeCalculatorService, IRouteStopService routeStopService, ITripService tripService, IVehicleService vehicleService)
        {
            _routeCalculatorService = routeCalculatorService;
            _routeStopService = routeStopService;
            _tripService = tripService;
            _vehicleService = vehicleService;
        }

        [BindProperty]
        public TripRequest Input { get; set; } = new TripRequest();

        // Property to hold user's vehicles
        public List<VehicleResponse> UserVehicles { get; set; } = new List<VehicleResponse>();

        public async Task OnGetAsync() 
        {
            if (User.Identity?.IsAuthenticated == true)
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    UserVehicles = (await _vehicleService.GetUserVehiclesAsync(userId)).ToList();
                }
            }
        }

        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid) return new JsonResult(new { success = false });

            // Provide default "fastest" if not supplied from the client
            var routeData = await _routeCalculatorService.CalculateBaseRouteAsync(Input.StartLocation, Input.EndLocation);

            if (routeData == null)
            {
                return new JsonResult(new { success = false, message = "Could not calculate route." });
            }

            return new JsonResult(new { success = true, geometry = routeData.Geometry, distanceKm = routeData.DistanceKm, durationHours = routeData.DurationHours });
        }

        public async Task<IActionResult> OnGetCalculateRouteAsync(string start, string end, string routeType = "fastest")
        {
            if (string.IsNullOrEmpty(start) || string.IsNullOrEmpty(end))
                return new JsonResult(new { success = false });

            var routeData = await _routeCalculatorService.CalculateBaseRouteAsync(start, end, routeType);

            if (routeData == null) return new JsonResult(new { success = false });

            return new JsonResult(new { success = true, geometry = routeData.Geometry, distanceKm = routeData.DistanceKm, durationHours = routeData.DurationHours });
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
            // Populate UserVehicles before returning partial
            if (User.Identity?.IsAuthenticated == true)
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    UserVehicles = _vehicleService.GetUserVehiclesAsync(userId).Result.ToList();
                }
            }
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