using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ZipTrip.Domain.Entities;

namespace ZipTrip.Data.Configurations
{
    public class VehicleSpecificationConfiguration: IEntityTypeConfiguration<VehicleSpecification>
    {
        public void Configure(EntityTypeBuilder<VehicleSpecification> builder)
        {
            builder.HasKey(vs => vs.Id);
            
            builder.Property(vs => vs.Name)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(vs => vs.MaxHeightMeters)
                .HasPrecision(10, 2);

            builder.Property(vs => vs.MaxWeightKg)
                .HasPrecision(10, 2);

            builder.Property(vs => vs.RangeKm)
                .HasPrecision(10, 2);
        }
    }
}
