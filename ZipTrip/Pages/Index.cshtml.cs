using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using ZipTrip.Services.Interfaces;
using ZipTrip.Services.DTOs.Weather;
namespace ZipTrip.Pages
{
    public class IndexModel : PageModel
    {
        private readonly IWeatherService _weatherService;
        public IndexModel(IWeatherService weatherService)
        {
            _weatherService = weatherService;
        }
        public WeatherForecastDto? CurrentWeather { get; set; }
        
        public async Task OnGetAsync()
        {
            // För Stockholm, Sverige
            double latitude = 59.3293;
            double longitude = 18.0686;
            CurrentWeather = await _weatherService.GetCurrentWeatherAsync(latitude, longitude);
        }
    }
}
