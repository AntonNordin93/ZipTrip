using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ZipTrip.Domain.Entities;

namespace ZipTrip.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.Property(u => u.FirstName).HasMaxLength(100);
        builder.Property(u => u.LastName).HasMaxLength(100);
        builder.Property(u => u.Address).HasMaxLength(200);
        builder.Property(u => u.City).HasMaxLength(100);
        builder.Property(u => u.PostalCode).HasMaxLength(20);
        builder.Property(u => u.Country).HasMaxLength(100);
    }
}