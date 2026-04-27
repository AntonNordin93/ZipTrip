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

            }

            if (request.SelectedStops != null && request.SelectedStops.Any())
            {
                foreach (var stopReq in request.SelectedStops)
                {
                    if (Enum.TryParse<StopType>(stopReq.Type, true, out var stopType))
                    {
                        var routeStop = new RouteStop
                        {
                            Name = stopReq.Name,
                            Latitude = stopReq.Latitude,
                            Longitude = stopReq.Longitude,
                            Type = stopType,
                            Trip = trip
                        };
                        trip.Stops.Add(routeStop);
                    }
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
            var trip = await _tripRepository.GetByIdAsync(tripId);
            if (trip == null || trip.UserId != userId)
                return null;

            // Update core properties if they changed
            trip.Title = string.IsNullOrEmpty(request.Title) ? trip.Title : request.Title;
            
            // Only recalculate route if start/end actually changed
            if(trip.StartLocation != request.StartLocation || trip.EndLocation != request.EndLocation) 
            {
                var routeData = await _routeCalculatorService.CalculateBaseRouteAsync(request.StartLocation, request.EndLocation);
                if (routeData != null)
                {
                    trip.StartLocation = request.StartLocation;
                    trip.EndLocation = request.EndLocation;
                    trip.TotalDistanceKm = routeData.DistanceKm;
                    trip.EstimatedDurationHours = routeData.DurationHours;
                }
            }

            // Entity framework fix for related collections: 
            // Wipe DB Representation of Stopps completely.
            await _tripRepository.ClearStopsForTripAsync(trip.Id);

            var stopsToInsert = new List<RouteStop>();

            if (request.SelectedStops != null && request.SelectedStops.Any())
            {
                foreach (var stopReq in request.SelectedStops)
                {
                    if (Enum.TryParse<StopType>(stopReq.Type, true, out var stopType))
                    {
                        var routeStop = new RouteStop
                        {
                            Id = Guid.NewGuid(), // Generating fresh Id manually again since we bypass context tracking
                            Name = string.IsNullOrEmpty(stopReq.Name) ? "Unknown Stop" : stopReq.Name,
                            Latitude = stopReq.Latitude,
                            Longitude = stopReq.Longitude,
                            Type = stopType,
                            TripId = trip.Id
                        };
                        stopsToInsert.Add(routeStop);
                    }
                }
            }

            // Insert new stops directly into DbSet thereby ignoring the Trip Proxy and Update cascades completely
            if (stopsToInsert.Any())
            {
                await _tripRepository.AddStopsDirectlyAsync(stopsToInsert);
            }

            // Re-fetch final data after detached DB modifications for accurate mapped response
            var updatedTrip = await _tripRepository.GetByIdAsync(trip.Id);
            return _mapper.Map<TripResponse>(updatedTrip ?? trip);
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
