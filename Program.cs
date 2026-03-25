using ZipTrip.Services.Extensions;
using ZipTrip.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Database + Identity via Services (ren arkitektur)
builder.Services.AddDatabase(builder.Configuration);

// Application services
builder.Services.AddApplicationServices();

// Web-specifika tjänster
builder.Services.AddWebServices();

var app = builder.Build();

// Middleware
app.UseZipTripMiddleware();
app.MapRazorPages();

app.Run();