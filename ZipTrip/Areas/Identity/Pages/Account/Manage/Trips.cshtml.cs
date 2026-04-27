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
        public TripsModel(ITripService tripService) => _tripService = tripService;

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
    }
}
