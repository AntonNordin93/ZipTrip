document.addEventListener("DOMContentLoaded", function () {
    const map = L.map("map", { zoomControl: true }).setView([62.0, 15.0], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy;OpenStreetMap contributors",
        maxZoom: 19,
    }).addTo(map);

    L.marker([59.3293, 18.0686]).addTo(map).bindPopup("<b>Stockholm</b><br>Startpunkt för många roadtrips!");

    L.marker([57.7089, 11.9746]).addTo(map).bindPopup("<b>Gothenburg</b><br>Västkusten börjar här!");

    window.addEventListener("resize", () => map.invalidateSize());
});
