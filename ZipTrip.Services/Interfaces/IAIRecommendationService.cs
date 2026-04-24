using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ZipTrip.Domain.Entities;
using ZipTrip.Services.DTOs.Common;

namespace ZipTrip.Services.Interfaces
{
    public interface IAIRecommendationService
    {
        Task<string> GetAIContextRecommendationsAsync(List<CoordinatePoint> routeGeometry);
    }
}
