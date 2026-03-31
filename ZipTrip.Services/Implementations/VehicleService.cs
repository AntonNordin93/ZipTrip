using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.EntityFrameworkCore;
using ZipTrip.Data;
using ZipTrip.Domain.Entities;
using ZipTrip.Services.DTOs.Vehicle;
using ZipTrip.Services.Interfaces;

namespace ZipTrip.Services.Implementations
{
    public class VehicleService : IVehicleService
    {
        private readonly ZipTripDbContext _context;
        private readonly IMapper _mapper;

        public VehicleService(ZipTripDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }
        public async Task<IEnumerable<VehicleResponse>> GetUserVehiclesAsync(string userId)
        {
            return await _context.UserVehicles
                .Where(v => v.UserId == userId)
                .ProjectTo<VehicleResponse>(_mapper.ConfigurationProvider)
                .ToListAsync();
        }
        public async Task<VehicleResponse?> GetVehicleByIdAsync(Guid id)
        {
            return await _context.UserVehicles
                .Where(v => v.Id == id)
                .ProjectTo<VehicleResponse>(_mapper.ConfigurationProvider)
                .FirstOrDefaultAsync(v => v.Id == id);
        }

        public async Task<VehicleResponse> AddVehicleAsync(string userId, VehicleRequest request)
        {
            var vehicle = _mapper.Map<UserVehicle>(request);
            vehicle.UserId = userId;
            _context.UserVehicles.Add(vehicle);
            await _context.SaveChangesAsync();
            return _mapper.Map<VehicleResponse>(vehicle);
        }

        public async Task<VehicleResponse?> UpdateVehicleAsync(Guid id, VehicleRequest request)
        {
            var existingVehicle = await _context.UserVehicles.FindAsync(id);
            if (existingVehicle == null) return null;
            _mapper.Map(request, existingVehicle);
            await _context.SaveChangesAsync();
            return _mapper.Map<VehicleResponse>(existingVehicle);
        }
        public async Task<IEnumerable<VehicleResponse>> GetStandardSpecsAsync()
        {
            return await _context.VehicleSpecifications
                .ProjectTo<VehicleResponse>(_mapper.ConfigurationProvider)
                .ToListAsync();
        }
        public async Task<bool> DeleteVehicleAsync(Guid id)
        {
            var vehicle = await _context.UserVehicles.FindAsync(id);
            if (vehicle == null) return false;
            _context.UserVehicles.Remove(vehicle);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
