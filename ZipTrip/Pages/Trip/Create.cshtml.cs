using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using ZipTrip.Domain.Enums;
using ZipTrip.Services.DTOs.Trip;
using ZipTrip.Services.Interfaces;

namespace ZipTrip.Pages.Trip
{
    public class CreateModel : PageModel
    {
        private readonly IVehicleService _vehicleService;
        private readonly IRouteCalculatorService _routeCalculatorService;
        private readonly IRouteStopService _routeStopService; // <-- VIKTIGT: Lägg till denna

        public CreateModel(IVehicleService vehicleService, IRouteCalculatorService routeCalculatorService, IRouteStopService routeStopService)
        {
            _vehicleService = vehicleService;
            _routeCalculatorService = routeCalculatorService;
            _routeStopService = routeStopService;
        }

        [BindProperty]
        public TripRequest Input { get; set; } = new TripRequest();

        public void OnGet() { }

        // HANDLER 1: Tar emot formuläret (via AJAX) och skickar tillbaka Ruttens kooridnater (JSON)
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                return new JsonResult(new { success = false, message = "Fyll i alla fält korrekt." });
            }

            // Exempel på din arkitektur:
            // Spara till DB här: await _tripRepository.SaveTripAsync(Input);

            var routeData = await _routeCalculatorService.CalculateBaseRouteAsync(Input.StartLocation, Input.EndLocation);

            return new JsonResult(new
            {
                success = true,
                geometry = routeData.Geometry,
                distanceKm = routeData.DistanceKm
            });
        }

        // HANDLER 2: När JavaScriptet ber om nästa meny, skickar vi HTML-koden för "_TripDetailsPartial"
        public IActionResult OnGetDetailsMenu()
        {
            return Partial("_TripDetailsPartial", this);
        }

        // HANDLER 3: När kunden klickar på "Gas Stations", hämtar vi mackarna från TomTom
        public async Task<JsonResult> OnGetFetchStopsAsync(string start, string end, string type)
        {
            try
            {
                if (!Enum.TryParse<StopType>(type, true, out var stopType))
                    return new JsonResult(new { success = false });

                var routeData = await _routeCalculatorService.CalculateBaseRouteAsync(start, end);
                var stops = await _routeStopService.GetSuggestedStopsAsync(routeData.Geometry, new List<StopType> { stopType });

                var formatted = stops.Select(s => new {
                    name = s.Name ?? "Station",
                    latitude = s.Latitude,
                    longitude = s.Longitude
                }).ToList();

                return new JsonResult(new { success = true, stops = formatted });
            }
            catch { return new JsonResult(new { success = false }); }
        }
    }
}