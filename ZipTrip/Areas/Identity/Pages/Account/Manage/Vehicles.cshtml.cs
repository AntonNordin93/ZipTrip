using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.EntityFrameworkCore;
using ZipTrip.Domain.Entities;
using ZipTrip.Domain.Enums;

namespace ZipTrip.Areas.Identity.Pages.Account.Manage
{
    public class VehiclesModel : PageModel
    {
        private readonly UserManager<User> _userManager;
        public VehiclesModel(UserManager<User> userManager)
        {
            _userManager = userManager;
        }
        public List<UserVehicle> UserVehicles { get; set; } = new();

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
        }
        public async Task<IActionResult> OnGetAsync()
        {
            var user = await _userManager.Users
                .Include(x => x.Vehicles)
                .FirstOrDefaultAsync(u => u.Id == _userManager.GetUserId(User));
            if (user == null)
            {
                return NotFound($"Unable to load user with ID '{_userManager.GetUserId(User)}'.");
            }
            UserVehicles = user.Vehicles.ToList();
            return Page();
        }
        public async Task<IActionResult> OnPostAsync()
        {
            var user = await _userManager.Users
                .Include(x => x.Vehicles)
                .FirstOrDefaultAsync(u => u.Id == _userManager.GetUserId(User));
            if (user == null)
            {
                return NotFound($"Unable to load user with ID '{_userManager.GetUserId(User)}'.");
            }
            if (!ModelState.IsValid)
            {
                UserVehicles = user.Vehicles.ToList();
                return Page();
            }
            var newVehicle = new UserVehicle
            {
                Name = !string.IsNullOrWhiteSpace(Input.Name)
               ? Input.Name
               : $"{Input.Brand} {Input.Model}".Trim(),

                VehicleType = Input.SelectedVehicleType ?? VehicleType.OrdinaryCar,
                MaxHeightMeters = Input.MaxHeightMeters,
                MaxWeightKg = Input.MaxWeightKg,
                RangeKm = Input.RangeKm,
                UserId = user.Id,
                IsDefault = !user.Vehicles.Any()
            };

            user.Vehicles.Add(newVehicle);
            await _userManager.UpdateAsync(user);
            StatusMessage = "Vehicle added successfully.";
            return RedirectToPage();
        }
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var user = await _userManager.Users
                .Include(x => x.Vehicles)
                .FirstOrDefaultAsync(u => u.Id == _userManager.GetUserId(User));

            var vehicle = user?.Vehicles.FirstOrDefault(v => v.Id == id);
            if (vehicle != null)
            {
                user?.Vehicles.Remove(vehicle);
                await _userManager.UpdateAsync(user);
                StatusMessage = "Vehicle deleted successfully.";
            }
            return RedirectToPage();
        }
    }
}
