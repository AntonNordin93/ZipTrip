using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Security.Claims;
using ZipTrip.Domain.Enums;
using ZipTrip.Services.DTOs.Common;
using ZipTrip.Services.DTOs.Trip;
using ZipTrip.Services.Interfaces;

namespace ZipTrip.Pages.Trip
{
    public class DetailsModel : PageModel
    {
        private readonly ITripService _tripService;
        private readonly IRouteStopService _routeStopService;
        private readonly IRouteCalculatorService _routeCalculatorService;

        public DetailsModel(ITripService tripService, IRouteStopService routeStopService, IRouteCalculatorService routeCalculatorService)
        {
            _tripService = tripService;
            _routeStopService = routeStopService;
            _routeCalculatorService = routeCalculatorService;
        }

        public TripResponse? Trip { get; set; } = default!;

        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null)
            {
                return RedirectToPage("/Account/Login");
            }

            var trip = await _tripService.GetTripByIdAsync(id, userId);
            if (trip == null)
            {
                return NotFound();
            }
            Trip = trip;
            return Page();
        }
        public async Task<JsonResult> OnGetFetchStopsAsync(string start, string end, string type)
        {
            try
            {
                if (!Enum.TryParse<StopType>(type, true, out var stopType))
                {
                    return new JsonResult(new { success = false, message = "Invalid stop type" });
                }

                var routeData = await _routeCalculatorService.CalculateBaseRouteAsync(start, end);
                if (routeData == null || !routeData.Geometry.Any())
                {
                    return new JsonResult(new { success = false, message = "Failed to calculate route" });
                }

                var TypesToFind = new List<StopType> { stopType };
                var stops = await _routeStopService.GetSuggestedStopsAsync(routeData.Geometry, TypesToFind);

                return new JsonResult(new { success = true, stops });


            }
            catch (Exception ex)
            {
                return new JsonResult(new { success = false, message = ex.Message });
            }
        }
        public async Task<JsonResult> OnGetRouteDataAsync(string start, string end)
        {
            var routeData = await _routeCalculatorService.CalculateBaseRouteAsync(start, end);
            return new JsonResult(routeData);
        }
    }
}
