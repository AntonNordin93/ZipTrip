using ZipTrip.Extensions;
using ZipTrip.Services.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDatabase(builder.Configuration);
builder.Services.AddApplicationServices();
builder.Services.AddWebServices();

var app = builder.Build();

app.UseZipTripMiddleware();
app.MapRazorPages();        // ← Detta är det viktiga

app.Run();