using System;
using System.Collections.Generic;
using System.Text;

namespace ZipTrip.Services.Mappings
{
    public static class WeatherCodeMapper
    {
        public static (string Description, string Icon) GetWeatherInfo(int code, string language = "sv")
        {
            bool isSwedish = language.ToLower() == "sv";
            return code switch
            {
                0 => isSwedish ? ("Klar himmel", "☀️") : ("Clear sky", "☀️"),
                1 => isSwedish ? ("Delvis molnigt", "⛅") : ("Partly cloudy", "⛅"),
                2 => isSwedish ? ("Molnigt", "☁️") : ("Cloudy", "☁️"),
                3 => isSwedish ? ("Övervägande molnigt", "☁️") : ("Overcast", "☁️"),

                45 or 48 => isSwedish ? ("Dimma", "🌫️") : ("Fog", "🌫️"),

                51 or 53 or 55 or 56 or 57 => isSwedish ? ("Duggregn", "🌧️") : ("Drizzle", "🌧️"),

                61 or 63 or 65 or 66 or 67 => isSwedish ? ("Regn", "🌧️") : ("Rain", "🌧️"),


                71 or 73 or 75 => isSwedish ? ("Snö", "❄️") : ("Snow", "❄️"),
                77 => isSwedish ? ("Snöbyar", "🌨️") : ("Snow showers", "🌨️"),

                80 or 81 or 82 => isSwedish ? ("Regnskurar", "🌦️") : ("Rainshowers", "🌦️"),
                85 or 86 => isSwedish ? ("Snöbyar", "🌨️") : ("Snow showers", "🌨️"),

                95 or 96 or 99 => isSwedish ? ("Åskväder", "⛈️") : ("Thunderstorm", "⛈️"),

                _ => isSwedish ? ("Okänt väder", "❓") : ("Unknown weather", "❓")
            };
        }

        public static string GetIcon(int code, string language = "sv")
        {
            return GetWeatherInfo(code, language).Icon;
        }

        public static string GetDescription(int code, string language = "sv")
        {
            return GetWeatherInfo(code, language).Description;
        }
    }
}
