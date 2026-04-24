using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ZipTrip.Domain.Entities;
using ZipTrip.Domain.Enums;
using ZipTrip.Services.DTOs.Common;
using ZipTrip.Services.Interfaces;

namespace ZipTrip.Services.Implementations
{
    public class AIRecommendationService : IAIRecommendationService
    {
        private readonly IRouteStopService _routeStopService;

        public AIRecommendationService(IRouteStopService routeStopService)
        {
            _routeStopService = routeStopService;
        }

        public async Task<string> GetAIContextRecommendationsAsync(List<CoordinatePoint> routeGeometry)
        {
            var attractions = await _routeStopService.GetSuggestedStopsAsync(
                routeGeometry, 
                new List<StopType> { StopType.Attraction }
            );

            if (attractions == null || !attractions.Any())
            {
                return "Vi hittade tyvärr inga spännande sevärdheter längs just den här sträckan.";
            }

            var topAttractions = attractions.Take(3).Select(x => x.Name).ToList();

            var recommendationMessage = $"Vår AI-rekommendation: Missa inte {string.Join(", ", topAttractions)} längs din väg!";

            return recommendationMessage;
        }
    }
}
