using System;
using System.Collections.Generic;
using System.Text;
using ZipTrip.Domain.Entities;

namespace ZipTrip.Services.Interfaces
{
    public interface ITripRepository
    {
        Task<Trip?>GetByIdAsync(Guid id);
        Task<IEnumerable<Trip>> GetAllByUserIdAsync(string userId);
        Task<IEnumerable<Trip>> GetAllAsync();
        Task AddAsync(Trip trip);
        Task UpdateAsync(Trip trip);
        Task DeleteAsync(Guid id);
        Task <bool> ExistsAsync(Guid id);
    }
}
