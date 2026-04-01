using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Threading.Tasks;
using ZipTrip.Domain.Entities;

namespace ZipTrip.Data.Seeders
{
    public static class UserSeeder
    {
        public static async Task SeedUsersAndRolesAsync(IServiceProvider serviceProvider)
        {
            var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            var userManager = serviceProvider.GetRequiredService<UserManager<User>>();

            string[] roles = { "Admin", "User" };
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole(role));
                }
            }

            if (await userManager.FindByEmailAsync("admin@ziptrip.se") == null)
            {
                var adminUser = new User
                {
                    UserName = "admin@ziptrip.se",
                    Email = "admin@ziptrip.se",
                    EmailConfirmed = true, 
                    FirstName = "Anna",
                    LastName = "Adminsson",
                    DateOfBirth = new DateOnly(1985, 5, 20),
                    Address = "Servergatan 1",
                    PostalCode = "123 45",
                    City = "Stockholm",
                    Country = "Sweden",
                    CreatedDate = DateTime.UtcNow
                };

                var result = await userManager.CreateAsync(adminUser, "Admin123!");
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(adminUser, "Admin");
                }
            }

            if (await userManager.FindByEmailAsync("user@ziptrip.se") == null)
            {
                var standardUser = new User
                {
                    UserName = "user@ziptrip.se",
                    Email = "user@ziptrip.se",
                    EmailConfirmed = true,
                    FirstName = "Test",
                    LastName = "Testsson",
                    DateOfBirth = new DateOnly(1992, 11, 15),
                    Address = "Vägen 42",
                    PostalCode = "852 30",
                    City = "Sundsvall",
                    Country = "Sweden",
                    CreatedDate = DateTime.UtcNow
                };

                var result = await userManager.CreateAsync(standardUser, "User123!");
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(standardUser, "User");
                }
            }
        }
    }
}