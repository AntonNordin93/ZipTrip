using FluentValidation;
using Microsoft.AspNetCore.Identity;   
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ZipTrip.Data;
using ZipTrip.Data.Repositories.Implementations;
using ZipTrip.Data.Repositories.Interfaces;
using ZipTrip.Services.Implementations;
using ZipTrip.Services.Interfaces;
using ZipTrip.Services.Mappings;
using ZipTrip.Services.Validators;
using ZipTrip.Domain.Entities;

namespace ZipTrip.Services.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<ITripService, TripService>();
        services.AddScoped<IRouteCalculatorService, RouteCalculatorService>();
        services.AddScoped<IAIRecommendationService, AIRecommendationService>();
        services.AddScoped<ITripRepository,TripRepository>();
        services.AddScoped<IVehicleService, VehicleService>();
        services.AddScoped<IWeatherService, WeatherService>();
        services.AddHttpClient<IWeatherRepository, WeatherRepository>();
        services.AddMemoryCache();
        services.AddAutoMapper(cfg=>cfg.AddProfile<MappingProfile>());
        services.AddValidatorsFromAssemblyContaining<CreateTripRequestValidator>();
        

        return services;
    }

    /// <summary>
    /// Registrerar DbContext + Identity här i Services så att Web slipper referera Data
    /// </summary>
    public static IServiceCollection AddDatabase(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<ZipTripDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

        services.AddDefaultIdentity<User>(options =>
        {
            options.SignIn.RequireConfirmedAccount = false;
        })
        .AddRoles<IdentityRole>()
        .AddEntityFrameworkStores<ZipTripDbContext>();

        return services;
    }
}