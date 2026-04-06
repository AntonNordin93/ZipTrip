using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Security.Claims;
using ZipTrip.Domain.Enums;
using ZipTrip.Services.DTOs.Trip;
using ZipTrip.Services.Interfaces;

namespace ZipTrip.Pages.Trip
{
    public class CreateModel : PageModel
    {
        private readonly ITripService _tripService;
        private readonly IVehicleService _vehicleService;
        private readonly IRouteCalculatorService _routeCalculatorService;

        public CreateModel(ITripService tripService, IVehicleService vehicleService, IRouteCalculatorService routeCalculatorService)
        {
            _tripService = tripService;
            _vehicleService = vehicleService;
            _routeCalculatorService = routeCalculatorService;
        }

        [BindProperty]
        public TripRequest Input { get; set; } = new TripRequest();
        public List<SelectListItem> UserVehicles { get; set; } = new List<SelectListItem>();

        public bool IsAuthenticated => User.Identity?.IsAuthenticated ?? false;

        public async Task<IActionResult> OnGetAsync()
        {
            if (IsAuthenticated)
            {
                await LoadVehiclesDropdownAsync();
            }
            Input.StartDate = DateTime.Now.AddDays(1);
            return Page();
        }
        public async Task<IActionResult> OnPostAsync()
        {
            if (!IsAuthenticated)
            {
                return RedirectToPage("/Account/Login");
            }
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null)
            {
                return RedirectToPage("/Account/Login");
            }
            if (!ModelState.IsValid)
            {
                await LoadVehiclesDropdownAsync();
                return Page();
            }
            try
            {
                var newTrip = await _tripService.CreateTripAsync(Input, userId);
                TempData["SuccessMessage"] = "Trip created successfully!";
                return RedirectToPage("/Index");
            }
            catch (Exception)
            {
                ModelState.AddModelError(string.Empty, "An error occurred while creating the trip. Please try again.");
                await LoadVehiclesDropdownAsync();
                return Page();
            }
        }
        private async Task LoadVehiclesDropdownAsync()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId != null)
            {
                var vehicles = await _vehicleService.GetUserVehiclesAsync(userId);
                UserVehicles = vehicles.Select(v => new SelectListItem
                {
                    Value = v.Id.ToString(),
                    Text = $"{v.Name} ({v.VehicleType})"
                }).ToList();
            }
            UserVehicles.Insert(0, new SelectListItem { Value = "", Text = "Select a vehicle (optional)" });
        }

        public async Task<JsonResult> OnGetRoutePreviewAsync(string start, string end)
        {
            var result = await _routeCalculatorService.CalculateBaseRouteAsync(start, end);
            return new JsonResult(result);
        }
    }
}
