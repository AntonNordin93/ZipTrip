using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using ZipTrip.Services.Interfaces;
using ZipTrip.Services.DTOs.Trip;
using System.Security.Claims;

namespace ZipTrip.Areas.Identity.Pages.Account.Manage
{
    public class TripsModel : PageModel
    {
        private readonly ITripService _tripService;
        private readonly IRouteCalculatorService _routeCalculatorService;

        public TripsModel(ITripService tripService, IRouteCalculatorService routeCalculatorService)
        {
            _tripService = tripService;
            _routeCalculatorService = routeCalculatorService;
        }

        [TempData]
        public string? StatusMessage { get; set; }
        public IEnumerable<TripResponse> Trips { get; set; } = new List<TripResponse>();

        public async Task<IActionResult> OnGetAsync()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return NotFound($"Unable to load user with ID '{userId}'.");
            }

            Trips = await _tripService.GetMyTripsAsync(userId);
            return Page();
        }

        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return NotFound($"Unable to load user with ID '{userId}'.");
            }

            var deleted = await _tripService.DeleteTripAsync(id, userId);
            if (deleted == null)
            {
                StatusMessage = "Error: Trip not found or you don't have permission to delete it.";
            }
            else
            {
                StatusMessage = "Trip deleted successfully.";
            }

            return RedirectToPage();
        }

        public async Task<IActionResult> OnGetTripDetailsAsync(Guid id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return new UnauthorizedResult();
            }

            var trip = await _tripService.GetTripByIdAsync(id, userId);
            if (trip == null)
            {
                return new NotFoundResult();
            }

            // Return a partial view containing the map and details
            return Partial("_TripDetailsMapPartial", trip);
        }
        
        public async Task<JsonResult> OnGetRouteDataAsync(string start, string end)
        {
            try
            {
                var routeData = await _routeCalculatorService.CalculateBaseRouteAsync(start, end);
                return new JsonResult(new { success = true, geometry = routeData.Geometry, distanceKm = routeData.DistanceKm });
            }
            catch
            {
                return new JsonResult(new { success = false });
            }
        }
    }
}
