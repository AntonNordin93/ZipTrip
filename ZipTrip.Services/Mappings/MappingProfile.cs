using System;
using System.Collections.Generic;
using System.Text;
using AutoMapper;
using ZipTrip.Domain.Entities;
using ZipTrip.Services.DTOs.Requests;
using ZipTrip.Services.DTOs.Responses;

namespace ZipTrip.Services.Mappings
{
    public class MappingProfile: Profile
    {
        public MappingProfile() 
        {
            CreateMap<CreateTripRequest, Trip>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.UserId, opt => opt.Ignore())
            .ForMember(dest => dest.User, opt => opt.Ignore())
            .ForMember(dest => dest.UserVehicle, opt => opt.Ignore())
            .ForMember(dest => dest.Stops, opt => opt.Ignore())
            .ForMember(dest => dest.Status, opt => opt.Ignore())
            .ForMember(dest => dest.EndDate, opt => opt.Ignore());

            CreateMap<Trip, TripDto>()
                .ForMember(dest=> dest.UserFirstName, opt => opt.MapFrom(src => src.User.FirstName))
                .ForMember(dest => dest.UserLastName, opt => opt.MapFrom(src => src.User.LastName))
                .ForMember(dest=>dest.UserVehicleName, opt => opt.MapFrom(src => src.UserVehicle != null ? src.UserVehicle.Name : null))
                .ForMember(dest => dest.Stops, opt => opt.MapFrom(src => src.Stops));

            CreateMap<RouteStop, StopDto>();
        }

    }
}
