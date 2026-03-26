using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ZipTrip.Domain.Entities;

namespace ZipTrip.Data.Configurations
{
    public class UserVehicleConfiguration: IEntityTypeConfiguration<UserVehicle>
    {
        public void Configure(EntityTypeBuilder<UserVehicle> builder)
        {
            builder.HasKey(v => v.Id);

            builder.Property(v => v.Name)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(v => v.MaxHeightMeters)
                .HasPrecision(10, 2);

            builder.Property(v=> v.MaxWeightKg)
                .HasPrecision(10, 2);

            builder.Property(v => v.RangeKm)
                .HasPrecision(18, 2);

            builder.HasOne(v => v.User)
                .WithMany(u => u.Vehicles)
                .HasForeignKey(v => v.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
