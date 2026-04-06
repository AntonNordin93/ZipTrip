using ZipTrip.Domain.Entities;
using ZipTrip.Domain.Enums;
using ZipTrip.Services.DTOs.Common;

namespace ZipTrip.Services.Interfaces
{
    public interface IRouteStopService
    {
        Task<List<RouteStop>> GetSuggestedStopsAsync(List<CoordinatePoint> routeGeometry,List<StopType> typesToFind);
    }
}
