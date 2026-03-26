using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;

namespace ZipTrip.Domain.Entities;

public class User : IdentityUser
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }


    public string? Address { get; set; }
    public string? City { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; } = "Sweden";

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginDate { get; set; }

    public ICollection<UserVehicle> Vehicles { get; set; } = new List<UserVehicle>();
    public ICollection<Trip> Trips { get; set; } = new List<Trip>();
}