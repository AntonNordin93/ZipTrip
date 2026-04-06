using System;
using System.Collections.Generic;
using System.Text;
using ZipTrip.Domain.Enums;
using ZipTrip.Services.DTOs.Trip;


namespace ZipTrip.Services.Interfaces
{
    public interface ITripService
    {
        Task<TripResponse> CreateTripAsync(TripRequest request, string userId);
        Task<TripResponse?> GetTripByIdAsync(Guid tripId, string userId);
        Task<IEnumerable<TripResponse>> GetMyTripsAsync(string userId);
        Task<TripResponse?> UpdateTripAsync(Guid tripId, TripRequest request, string userId);
        Task<TripResponse?> DeleteTripAsync(Guid tripId,string userId);
        Task<bool> ChangeTripStatusAsync(Guid tripId, TripStatus newStatus, string userId);

    }
}
