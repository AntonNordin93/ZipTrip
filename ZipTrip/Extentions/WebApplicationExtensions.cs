using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Serilog;

namespace ZipTrip.Extensions;

public static class WebApplicationExtensions
{
    public static IServiceCollection AddWebServices(this IServiceCollection services)
    {
        services.AddRazorPages();

        services.ConfigureHttpJsonOptions(options =>
        {
            options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
            options.SerializerOptions.WriteIndented = true;
            options.SerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        });

        return services;
    }

    public static WebApplication UseZipTripMiddleware(this WebApplication app)
    {
        if (app.Environment.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
        }

        else
        {
            app.UseExceptionHandler("/Error");
            app.UseHsts();
        }
        app.UseStatusCodePagesWithReExecute("/Error/{0}");

        app.UseSerilogRequestLogging(options=>
        {
            options.MessageTemplate ="HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
        });

        if(!app.Environment.IsDevelopment())
        {
            app.UseHttpsRedirection();
        }

        app.UseStaticFiles();
        app.UseRouting();
        app.UseAuthentication();
        app.UseAuthorization();

        return app;
    }
}