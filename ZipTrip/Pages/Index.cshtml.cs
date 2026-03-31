using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.RazorPages;
using ZipTrip.Services.Interfaces;
using ZipTrip.Services.DTOs.Weather;
using ZipTrip.Services.DTOs.Vehicle;
using ZipTrip.Services.DTOs.Trip;
using ZipTrip.Domain.Entities;

namespace ZipTrip.Pages
{
    public class IndexModel : PageModel
    {
        private readonly IWeatherService _weatherService;
        private readonly IVehicleService _vehicleService;
        private readonly UserManager<User> _userManager;
        public IndexModel(IWeatherService weatherService, IVehicleService vehicleService, UserManager<User> userManager)
        {
            _weatherService = weatherService;
            _vehicleService = vehicleService;
            _userManager = userManager;
        }
        public WeatherForecastDto? CurrentWeather { get; set; }
        public IEnumerable<VehicleResponse>? UserVehicles { get; set; }= new List<VehicleResponse>();

        public IEnumerable<VehicleResponse>? StandardSpecs { get; set; } = new List<VehicleResponse>();


        public async Task OnGetAsync()
        {
            CurrentWeather = await _weatherService.GetCurrentWeatherAsync(59.3293, 18.0686); // Coordinates for Stockholm

            var user = await _userManager.GetUserAsync(User);
            if (user != null)
            {
                UserVehicles= await _vehicleService.GetUserVehiclesAsync(user.Id);
            }

            StandardSpecs = await _vehicleService.GetStandardSpecsAsync();
        }
    }
}
