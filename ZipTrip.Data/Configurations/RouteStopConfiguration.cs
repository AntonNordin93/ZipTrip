using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ZipTrip.Domain.Entities;
namespace ZipTrip.Data.Configurations
{
    public class RouteStopConfiguration
    {
        public void Configure(EntityTypeBuilder<RouteStop> builder)
        {
            builder.HasKey(s => s.Id);

            builder.Property(s => s.Name)
                .IsRequired()
                .HasMaxLength(200);

            builder.Property(s=>s.EstimatedStopTimesMinutes)
                .HasPrecision(18, 2);

            builder.Property(s => s.Notes)
                .HasMaxLength(500);

            builder.HasOne(s => s.Trip)
                .WithMany(t => t.Stops)
                .HasForeignKey(s => s.TripId)
                .OnDelete(DeleteBehavior.Cascade);

        }
    }
}
