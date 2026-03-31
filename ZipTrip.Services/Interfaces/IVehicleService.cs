using System;
using System.Collections.Generic;
using System.Text;
using ZipTrip.Services.DTOs.Vehicle;

namespace ZipTrip.Services.Interfaces
{
    public interface IVehicleService
    {
        Task<IEnumerable<VehicleResponse>> GetUserVehiclesAsync(string userId);
        Task<VehicleResponse?> GetVehicleByIdAsync(Guid id);
        Task<VehicleResponse> AddVehicleAsync(string userId, VehicleRequest request);
        Task<VehicleResponse?> UpdateVehicleAsync(Guid id, VehicleRequest request);
        Task<IEnumerable<VehicleResponse>> GetStandardSpecsAsync();
        Task <bool> DeleteVehicleAsync(Guid id);
    }
}
