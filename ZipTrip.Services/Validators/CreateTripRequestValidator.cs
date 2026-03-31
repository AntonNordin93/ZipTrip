using System;
using System.Collections.Generic;
using System.Text;
using FluentValidation;
using ZipTrip.Services.DTOs.Trip;

namespace ZipTrip.Services.Validators
{
    public class CreateTripRequestValidator: AbstractValidator<CreateTripRequest>
    {
        public CreateTripRequestValidator() 
        {
            RuleFor(x => x.Title)
                .NotEmpty().WithMessage("Title is required.")
                .MaximumLength(100).WithMessage("Title cannot exceed 100 characters.");

            RuleFor(x => x.StartLocation)
                .NotEmpty().WithMessage("Start location is required.")
                .MaximumLength(200).WithMessage("Start location cannot exceed 200 characters.");

            RuleFor(x => x.EndLocation)
                .NotEmpty().WithMessage("End location is required.")
                .MaximumLength(200).WithMessage("End location cannot exceed 200 characters.");

            RuleFor(x => x.StartDate)
                .GreaterThan(DateTime.UtcNow).WithMessage("Start date must be in the future.");

            RuleFor(x => x.VehicleType)
                .IsInEnum().WithMessage("Invalid vehicle type.");
             RuleFor(x => x.UserVehicleId)
                .NotEmpty().When(x => x.UserVehicleId.HasValue).WithMessage("User vehicle ID cannot be empty if provided.");
        }
    }
}
