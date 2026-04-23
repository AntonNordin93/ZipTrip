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

                // Rita START (Grön ring med mörk mitt)
                L.circleMarker(latLngs[0], { radius: 10, color: '#18db67', fillColor: '#000', fillOpacity: 1, weight: 3 })
                    .addTo(routeLayer)
                    .bindPopup("<b>START:</b> " + startLoc);

                // Rita MÅL (Röd ring med mörk mitt)
                L.circleMarker(latLngs[latLngs.length - 1], { radius: 10, color: '#ff4444', fillColor: '#000', fillOpacity: 1, weight: 3 })
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
                    result.stops.forEach(s => {
                        // Använder standard Leaflet-nålar (L.marker)
                        // Dessa ritas ALLTID ut, oavsett om Tailwind-CSS bråkar eller inte.
                        L.marker([s.latitude, s.longitude])
                            .addTo(stopsLayer)
                            .bindPopup(`<b>${s.name || "Station"}</b>`);
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