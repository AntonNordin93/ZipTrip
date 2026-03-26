using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ZipTrip.Domain.Entities;

namespace ZipTrip.Data.Configurations;

public class TripConfiguration : IEntityTypeConfiguration<Trip>
{
    public void Configure(EntityTypeBuilder<Trip> builder)
    {
        builder.HasKey(t => t.Id);

        builder.Property(t => t.Title).IsRequired().HasMaxLength(200);
        builder.Property(t => t.StartLocation).IsRequired().HasMaxLength(150);
        builder.Property(t => t.EndLocation).IsRequired().HasMaxLength(150);
        builder.Property(t => t.TotalDistanceKm).HasPrecision(18, 2);
        builder.Property(t => t.EstimatedDurationHours).HasPrecision(18, 2);
        builder.Property(t => t.EstimatedCost).HasPrecision(18, 2);
        builder.Property(t => t.Notes).HasMaxLength(1000);

        builder.HasOne(t => t.User)
               .WithMany(u => u.Trips)
               .HasForeignKey(t => t.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(t => t.UserVehicle)
               .WithMany()
               .HasForeignKey(t => t.UserVehicleId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}