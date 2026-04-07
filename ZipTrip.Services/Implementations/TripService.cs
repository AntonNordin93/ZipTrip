using System;
using System.Collections.Generic;
using System.Text;
using ZipTrip.Services.Interfaces;
using AutoMapper;
using ZipTrip.Data.Repositories.Interfaces;
using ZipTrip.Domain.Entities;
using ZipTrip.Domain.Enums;
using ZipTrip.Services.DTOs.Trip;


namespace ZipTrip.Services.Implementations
{
    public class TripService : ITripService
    {
        private readonly ITripRepository _tripRepository;
        private readonly IRouteCalculatorService _routeCalculatorService;
        private readonly IRouteStopService _routeStopService;
        private readonly IMapper _mapper;
        public TripService(ITripRepository tripRepository, IRouteCalculatorService routeCalculatorService, IRouteStopService routeStopService, IMapper mapper)
        {
            _tripRepository = tripRepository;
            _routeCalculatorService = routeCalculatorService;
            _routeStopService = routeStopService;
            _mapper = mapper;
        }
        public async Task<TripResponse> CreateTripAsync(TripRequest request, string userId)
        {
            var routeData= await _routeCalculatorService.CalculateBaseRouteAsync(request.StartLocation, request.EndLocation);
            var trip = _mapper.Map<Trip>(request);
            trip.UserId = userId;
            trip.Status = TripStatus.Planned;

            if(routeData != null) 
            {
                trip.TotalDistanceKm = routeData.DistanceKm;
                trip.EstimatedDurationHours = routeData.DurationHours;

                var allStopTypes = Enum.GetValues(typeof(StopType)).Cast<StopType>().ToList();

                var suggestedStops = await _routeStopService.GetSuggestedStopsAsync(routeData.Geometry, allStopTypes);
                 int order=1;
                foreach(var stop in suggestedStops)
                {
                    stop.StopOrder = order++;
                    stop.TripId = trip.Id;
                    trip.Stops.Add(stop);
                }
            }

            await _tripRepository.AddAsync(trip);
            return _mapper.Map<TripResponse>(trip);
        }

        public async Task<TripResponse?> GetTripByIdAsync(Guid tripId, string userId)
        {
            var trip = await _tripRepository.GetByIdAsync(tripId);
            if (trip == null || trip.UserId != userId)
                return null;
            return _mapper.Map<TripResponse>(trip);
        }

        public async Task<IEnumerable<TripResponse>> GetMyTripsAsync(string userId)
        {
            var trips = await _tripRepository.GetAllByUserIdAsync(userId);
            return _mapper.Map<IEnumerable<TripResponse>>(trips);
        }

        public async Task<TripResponse?> UpdateTripAsync(Guid tripId, TripRequest request, string userId)
        {
            var routeData = await _routeCalculatorService.CalculateBaseRouteAsync(request.StartLocation, request.EndLocation);
            var trip = await _tripRepository.GetByIdAsync(tripId);
            if (trip == null || trip.UserId != userId)
                return null;
            _mapper.Map(request, trip);

            if (routeData != null)
            {
                trip.TotalDistanceKm = routeData.DistanceKm;
                trip.EstimatedDurationHours = routeData.DurationHours;

                trip.Stops.Clear();
                await _tripRepository.UpdateAsync(trip);
                var allStopTypes = Enum.GetValues(typeof(StopType)).Cast<StopType>().ToList();

                var suggestedStops = await _routeStopService.GetSuggestedStopsAsync(routeData.Geometry, allStopTypes);
                int order = 1;
                foreach (var stop in suggestedStops)
                {
                    stop.StopOrder = order++;
                    trip.Stops.Add(stop);
                }

            }
            await _tripRepository.UpdateAsync(trip);
            return _mapper.Map<TripResponse>(trip);
        }

        public async Task<TripResponse?> DeleteTripAsync(Guid tripId, string userId)
        {
            var trip = await _tripRepository.GetByIdAsync(tripId);
            if (trip == null || trip.UserId != userId)
                return null;
            await _tripRepository.DeleteAsync(tripId);
            return _mapper.Map<TripResponse>(trip);
        }
        public async Task<bool> ChangeTripStatusAsync(Guid tripId, TripStatus newStatus, string userId)
        {
            var trip = await _tripRepository.GetByIdAsync(tripId);
            if (trip == null || trip.UserId != userId)
                return false;
            trip.Status = newStatus;
            await _tripRepository.UpdateAsync(trip);
            return true;
        }
    }
}
