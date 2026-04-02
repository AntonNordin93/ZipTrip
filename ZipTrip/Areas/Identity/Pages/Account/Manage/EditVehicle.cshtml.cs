using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using ZipTrip.Services.Interfaces;
using ZipTrip.Services.DTOs.Vehicle;
using ZipTrip.Domain.Enums;
using System.ComponentModel.DataAnnotations;

namespace ZipTrip.Areas.Identity.Pages.Account.Manage
{
    public class EditVehicleModel : PageModel
    {
        private readonly IVehicleService _vehicleService;
        public EditVehicleModel(IVehicleService vehicleService) => _vehicleService = vehicleService;
        [TempData]
        public string? StatusMessage { get; set; }
        [BindProperty]
        public EditInputModel Input { get; set; } = new();
        public VehicleResponse VehicleInfo { get; set; }

        public class EditInputModel
        {
            [Required]
            public Guid Id { get; set; }
            [Required]
            [Display(Name = "Vehicle Nickname")]
            public string Name { get; set; } = string.Empty;
            [Required]
            [Display(Name = "Vehicle Type")]
            public VehicleType? SelectedVehicleType { get; set; }
            public int? Year { get; set; }
            [Display(Name = "Max height (Meters)")]
            public decimal? MaxHeightMeters { get; set; }
            [Display(Name = "Max weight (Kg)")]
            public decimal? MaxWeightKg { get; set; }
            [Display(Name = "Range (km)")]
            public decimal? RangeKm { get; set; }
            public bool IsDefault { get; set; }
        }
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var vehicle = await _vehicleService.GetVehicleByIdAsync(id);
            if (vehicle == null) return NotFound("Vehicle not found.");
            VehicleInfo = vehicle;
            Input = new EditInputModel
            {
                Id = vehicle.Id,
                Name = vehicle.Name,
                SelectedVehicleType = vehicle.VehicleType,
                MaxHeightMeters = vehicle.MaxHeightMeters,
                MaxWeightKg = vehicle.MaxWeightKg,
                RangeKm = vehicle.RangeKm,
                IsDefault = vehicle.IsDefault
            };
            return Page();
        }
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                var vehicle = await _vehicleService.GetVehicleByIdAsync(Input.Id);
                if (vehicle != null) VehicleInfo = vehicle;
                return Page();
            }
            var request = new VehicleRequest
            {
                Name = Input.Name,
                SelectedVehicleType = Input.SelectedVehicleType ?? VehicleType.OrdinaryCar,
                MaxHeightMeters = Input.MaxHeightMeters,
                MaxWeightKg = Input.MaxWeightKg,
                RangeKm = Input.RangeKm,
                IsDefault = Input.IsDefault
            };
            await _vehicleService.UpdateVehicleAsync(Input.Id, request);

            StatusMessage = "Vehicle updated successfully.";
            return RedirectToPage("./Vehicles");
        }
    }
}
