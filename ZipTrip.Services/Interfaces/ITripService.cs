using System;
using System.Collections.Generic;
using System.Text;
using ZipTrip.Domain.Enums;
using ZipTrip.Services.DTOs.Trip;


namespace ZipTrip.Services.Interfaces
{
    public interface ITripService
    {
        Task<TripDto> CreateTripAsync(CreateTripRequest request, string userId);
        Task<TripDto?> GetTripByIdAsync(Guid tripId, string userId);
        Task<IEnumerable<TripDto>> GetMyTripsAsync(string userId);
        Task<TripDto?> UpdateTripAsync(Guid tripId, CreateTripRequest request, string userId);
        Task<TripDto?> DeleteTripAsync(Guid tripId,string userId);
        Task<bool> ChangeTripStatusAsync(Guid tripId, TripStatus newStatus, string userId);

    }
}
