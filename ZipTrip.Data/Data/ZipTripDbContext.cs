using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ZipTrip.Domain.Entities;

namespace ZipTrip.Data;

public class ZipTripDbContext : IdentityDbContext<User>   
{
    public ZipTripDbContext(DbContextOptions<ZipTripDbContext> options)
        : base(options) { }

    public DbSet<UserVehicle> UserVehicles { get; set; } = null!;
    public DbSet<Trip> Trips { get; set; } = null!;
    public DbSet<RouteStop> RouteStops { get; set; } = null!;
    public DbSet<VehicleSpecification> VehicleSpecifications { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ZipTripDbContext).Assembly);
    }
}