using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using ZipTrip.Services.Interfaces;
using ZipTrip.Services.DTOs.Vehicle;
using ZipTrip.Domain.Entities;
using ZipTrip.Domain.Enums;

namespace ZipTrip.Areas.Identity.Pages.Account.Manage
{
    public class VehiclesModel : PageModel
    {
        private readonly UserManager<User> _userManager;
        private readonly IVehicleService _vehicleService;
        public VehiclesModel(UserManager<User> userManager, IVehicleService vehicleService)
        {
            _userManager = userManager;
            _vehicleService = vehicleService;
        }
        public List<VehicleResponse> UserVehicles { get; set; } = new();

        [TempData]
        public string? StatusMessage { get; set; }
        [BindProperty]
        public InputModel Input { get; set; }= new();

        public class InputModel
        {
            [Required]
            [Display(Name = "Vehicle Nickname")]
            public string Name { get; set; } = string.Empty;

            [Required]
            [Display(Name = "Vehicle Type")]
            public VehicleType? SelectedVehicleType { get; set; }

            [Display(Name = "Brand")]
            public string? Brand { get; set; }
            [Display(Name = "Model")]
            public string? Model { get; set; }
            [Display(Name = "Year")]
            public int? Year { get; set; }

            [Display(Name = "Max height (Meters)")]
            public decimal? MaxHeightMeters { get; set; }

            [Display(Name = "Max weight (Kg)")]
            public decimal? MaxWeightKg { get; set; }

            [Display(Name = "Range (km)")]
            public decimal? RangeKm { get; set; }

            public bool IsDefault { get; set; }
        }
        public async Task<IActionResult> OnGetAsync()
        {
            var userId= _userManager.GetUserId(User);
            if (userId == null) return NotFound("Unable to load user.");

            var vehicles = await _vehicleService.GetUserVehiclesAsync(userId);
            UserVehicles = vehicles.ToList();
            return Page();
        }
        public async Task<IActionResult> OnPostAsync()
        {
            var userId = _userManager.GetUserId(User);
            if(userId == null) return NotFound("Unable to load user.");

            if (!ModelState.IsValid)
            {
                var vehicles = await _vehicleService.GetUserVehiclesAsync(userId);
                UserVehicles = vehicles.ToList();
                return Page();
            }
            var request = new VehicleRequest
            {
                Name = !string.IsNullOrWhiteSpace(Input.Name)
                ? Input.Name:$"My {Input.Brand} {Input.Model}".Trim(),
                SelectedVehicleType = Input.SelectedVehicleType ?? VehicleType.OrdinaryCar,
                MaxHeightMeters = Input.MaxHeightMeters,
                MaxWeightKg = Input.MaxWeightKg,
                RangeKm = Input.RangeKm,
                IsDefault= Input.IsDefault
            };
            await _vehicleService.AddVehicleAsync(userId, request);
            StatusMessage = "Vehicle added successfully.";
            return RedirectToPage();
        }
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var success = await _vehicleService.DeleteVehicleAsync(id);
            if (success)
            {
                StatusMessage = "Vehicle deleted successfully.";

            }
            else
            {
                StatusMessage = "Error deleting vehicle.";
            }
            return RedirectToPage();

        }
    }
}
