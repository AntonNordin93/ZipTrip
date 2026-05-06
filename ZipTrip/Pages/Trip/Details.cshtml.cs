using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using ZipTrip.Domain.Enums;
using ZipTrip.Services.DTOs.Trip;
using ZipTrip.Services.DTOs.Vehicle;
using ZipTrip.Services.Interfaces;

namespace ZipTrip.Pages.Trip
{
    public class DetailsModel : PageModel
    {
        private readonly IRouteStopService _routeStopService;
        private readonly IRouteCalculatorService _routeCalculatorService;
        private readonly IAIRecommendationService _aiRecommendationService;
        private readonly ITripService _tripService;
        private readonly IVehicleService _vehicleService; // injected vehicle service

        public DetailsModel(IRouteStopService routeStopService, IRouteCalculatorService routeCalculatorService, IAIRecommendationService aiRecommendationService, ITripService tripService, IVehicleService vehicleService)
        {
            _routeStopService = routeStopService;
            _routeCalculatorService = routeCalculatorService;
            _aiRecommendationService = aiRecommendationService;
            _tripService = tripService;
            _vehicleService = vehicleService;
        }

        public TripResponse? Trip { get; set; }
        public string? AIRecommendation { get; set; }
        public List<VehicleResponse> UserVehicles { get; set; } = new List<VehicleResponse>(); // Property to hold user's vehicles

        public async Task<IActionResult> OnGetAsync(Guid? id, string? start, string? end)
        {
            if (User.Identity?.IsAuthenticated == true)
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    UserVehicles = (await _vehicleService.GetUserVehiclesAsync(userId)).ToList();
                }
            }

            // IF SPARA FRÅN PROFILEN VIA GUID ID:
            if (id.HasValue && id.Value != Guid.Empty && User.Identity?.IsAuthenticated == true)
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    Trip = await _tripService.GetTripByIdAsync(id.Value, userId);
                    if (Trip != null) return Page();
                }
            }

            // GAMLA LOGIKEN FÖR DETAILS (FALLBACK IFALL SPARA INTE ÄR AKTIVERAT)
            if (string.IsNullOrEmpty(start) || string.IsNullOrEmpty(end))
                return RedirectToPage("/Trip/Create");

            Trip = new TripResponse
            {
                StartLocation = start,
                EndLocation = end,
                Title = "Your Trip Plan"
            };

            try 
            {
                var routeData = await _routeCalculatorService.CalculateBaseRouteAsync(start, end);
                Trip.DurationHours = routeData.DurationHours;
                Trip.TotalDistanceKm = routeData.DistanceKm;
                AIRecommendation = await _aiRecommendationService.GetAIContextRecommendationsAsync(routeData.Geometry);
            }
            catch 
            {
                AIRecommendation = null;
            }

            return Page();
        }

        public async Task<IActionResult> OnPostUpdateTripAsync([FromBody] TripRequest request, Guid id)
        {
            if (User.Identity?.IsAuthenticated != true)
                return new JsonResult(new { success = false, message = "Not authenticated" });

            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return new JsonResult(new { success = false, message = "User not found" });

            var updatedTrip = await _tripService.UpdateTripAsync(id, request, userId);

            if (updatedTrip != null)
                return new JsonResult(new { success = true });

            return new JsonResult(new { success = false, message = "Could not update trip" });
        }

        public async Task<JsonResult> OnGetFetchStopsAsync(string start, string end, string type, string routeType = "fastest")
        {
            try
            {
                if (!Enum.TryParse<StopType>(type, true, out var stopType))
                    return new JsonResult(new { success = false, message = "Ogiltig typ" });

                // 1. Hämta ruttens geometri
                var routeData = await _routeCalculatorService.CalculateBaseRouteAsync(start, end, routeType);

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

        public async Task<IActionResult> OnGetCalculateRouteAsync(string start, string end, string routeType = "fastest")
        {
            if (string.IsNullOrEmpty(start) || string.IsNullOrEmpty(end))
                return new JsonResult(new { success = false });

            var routeData = await _routeCalculatorService.CalculateBaseRouteAsync(start, end, routeType);

            if (routeData == null) return new JsonResult(new { success = false });

            return new JsonResult(new { success = true, geometry = routeData.Geometry, distanceKm = routeData.DistanceKm, durationHours = routeData.DurationHours });
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