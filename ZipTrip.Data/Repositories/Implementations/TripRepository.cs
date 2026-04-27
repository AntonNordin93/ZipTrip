using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.EntityFrameworkCore;
using ZipTrip.Domain.Entities;
using ZipTrip.Data.Repositories.Interfaces;


namespace ZipTrip.Data.Repositories.Implementations
{
    public class TripRepository: ITripRepository
    {
        private readonly ZipTripDbContext _context;
        public TripRepository(ZipTripDbContext context) {
            _context = context;
        }

        public async Task <Trip?> GetByIdAsync(Guid id) 
        {

            return await _context.Trips
                .Include(t => t.Stops)
                .Include(t => t.UserVehicle)
                .FirstOrDefaultAsync(t => t.Id == id);
        }

        public async Task<IEnumerable<Trip>> GetAllByUserIdAsync(string userId)
        {
            return await _context.Trips
                .Include(t => t.Stops)
                .Include(t => t.UserVehicle)
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.StartDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<Trip>> GetAllAsync() 
        {
            return await _context.Trips
                .Include(t => t.Stops)
                .Include(t => t.UserVehicle)
                .OrderByDescending(t => t.StartDate)
                .ToListAsync();
        }

        public async Task AddAsync(Trip trip) 
        {
            await _context.Trips.AddAsync(trip);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Trip trip)
        {
            // _context.Trips.Update(trip);
            // EF Core will track the changes we made in the service layer
            await _context.SaveChangesAsync();
        }

        public async Task ClearStopsForTripAsync(Guid tripId)
        {
            var stops = await _context.RouteStops.Where(s => s.TripId == tripId).ToListAsync();
            _context.RouteStops.RemoveRange(stops);
            await _context.SaveChangesAsync();
        }

        public async Task AddStopsDirectlyAsync(IEnumerable<RouteStop> stops)
        {
            await _context.RouteStops.AddRangeAsync(stops);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var trip=await _context.Trips.FindAsync(id);
            if(trip != null)
            {
                _context.Trips.Remove(trip);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<bool> ExistsAsync(Guid id)
        {
            return await _context.Trips.AnyAsync(t => t.Id == id);
        }


    }
}
