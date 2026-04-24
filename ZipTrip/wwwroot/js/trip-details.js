document.addEventListener("DOMContentLoaded", function () {
    const mapElement = document.getElementById("trip-map");
    if (!mapElement) return;

    const startLoc = mapElement.getAttribute("data-start");
    const endLoc = mapElement.getAttribute("data-end");
    const spinner = document.getElementById('loading-spinner');

    // 1. Initiera kartan
    const isDarkMode = document.documentElement.classList.contains('dark');
    const tileUrl = isDarkMode 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    const map = L.map('trip-map', { zoomControl: true }).setView([62.0, 15.0], 5);
    L.tileLayer(tileUrl, {
        attribution: '&copy; CARTO'
    }).addTo(map);

    // Skapa separata lager för rutten och stoppen så de inte krockar
    let routeLayer = L.layerGroup().addTo(map);
    let stopsLayer = L.layerGroup().addTo(map);

    const themeColors = {
        'Fuel': '#18db67',
        'Charging': '#30e5f2',
        'Restaurant': '#f89e21',
        'Attraction': '#ce60f8',
        'Camping': '#4d8df5',
        'Lodging': '#f24694',
        'RestArea': '#ff4757',
        'Default': '#18db67'
    };

    // Tvinga kartan att rita ut sig korrekt i containern
    setTimeout(() => { map.invalidateSize(); }, 500);

    // 2. Funktion för att rita rutten och Start/Mål
    async function initMap() {
        try {
            const response = await fetch(`?handler=RouteData&start=${encodeURIComponent(startLoc)}&end=${encodeURIComponent(endLoc)}`);
            const data = await response.json();

            if (data && data.geometry && data.geometry.length > 0) {
                const latLngs = data.geometry.map(p => [p.latitude, p.longitude]);

                // Rita själva linjen
                L.polyline(latLngs, { color: '#18db67', weight: 6, opacity: 0.8 }).addTo(routeLayer);

                const startIcon = L.divIcon({
                    className: 'bg-transparent border-0',
                    html: `<div style="color:#3b82f6; filter:drop-shadow(0 0 8px rgba(59,130,246,0.8));"><svg width="28" height="28" viewBox="0 0 24 24" fill="#0f1219" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4" fill="currentColor"></circle></svg></div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                    popupAnchor: [0, -14]
                });

                const endIcon = L.divIcon({
                    className: 'bg-transparent border-0',
                    html: `<div style="color:#ffffff; filter:drop-shadow(0 0 8px rgba(255,255,255,0.8));"><svg width="28" height="28" viewBox="0 0 24 24" fill="#0f1219" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3" fill="currentColor"></circle></svg></div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 28],
                    popupAnchor: [0, -28]
                });

                // Rita START (Ikon)
                L.marker(latLngs[0], { icon: startIcon })
                    .addTo(routeLayer)
                    .bindPopup("<b>START:</b> " + startLoc);

                // Rita MÅL (Ikon)
                L.marker(latLngs[latLngs.length - 1], { icon: endIcon })
                    .addTo(routeLayer)
                    .bindPopup("<b>MÅL:</b> " + endLoc);

                // Zooma in kartan så att hela rutten syns
                map.fitBounds(L.polyline(latLngs).getBounds(), { padding: [50, 50] });

                const distanceEl = document.getElementById('trip-distance');
                if (distanceEl) {
                    distanceEl.innerText = Math.round(data.distanceKm) + " km";
                }
            }
        } catch (e) {
            console.error("Fel vid laddning av rutt:", e);
        }
    }

    // 3. Hantera knapptryckningarna för att hämta stopp
    document.querySelectorAll('.fetch-stops-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            const type = this.getAttribute('data-type');

            // Visa laddningssnurran
            if (spinner) {
                spinner.classList.remove('hidden');
                spinner.classList.add('flex');
            }

            try {
                const response = await fetch(`?handler=FetchStops&start=${encodeURIComponent(startLoc)}&end=${encodeURIComponent(endLoc)}&type=${type}`);
                const result = await response.json();

                // Rensa bort gamla mackar/restauranger från kartan
                stopsLayer.clearLayers();

                if (result.success && result.stops && result.stops.length > 0) {
                    const targetColor = themeColors[type] || themeColors['Default'];

                    result.stops.forEach(s => {
                        L.circleMarker([s.latitude, s.longitude], {
                            radius: 8,
                            color: targetColor,
                            fillColor: '#0f1219',
                            fillOpacity: 0.9,
                            weight: 2,
                            opacity: 1
                        })
                        .addTo(stopsLayer)
                        .bindPopup(`<strong style="color:${targetColor}">${s.name || "Station"}</strong>`);
                    });
                } else {
                    alert("Inga stopp hittades. TomTom returnerade tomt för denna kategori.");
                }
            } catch (e) {
                console.error("Fel vid hämtning av API:", e);
                alert("Nätverksfel vid hämtning av stopp.");
            } finally {
                // Dölj laddningssnurran
                if (spinner) {
                    spinner.classList.add('hidden');
                    spinner.classList.remove('flex');
                }
            }
        });
    });

    // Kör igång kartan!
    initMap();
});