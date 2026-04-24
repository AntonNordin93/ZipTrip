document.addEventListener("DOMContentLoaded", function () {
    const mapElement = document.getElementById("trip-map");
    if (!mapElement) return;

    const sidebarContainer = document.getElementById("sidebar-container");
    let currentStart = "";
    let currentEnd = "";

    // Karta och lager
    const isDarkMode = document.documentElement.classList.contains('dark');
    const tileUrl = isDarkMode 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    const map = L.map('trip-map', { zoomControl: true }).setView([62.0, 15.0], 5);
    L.tileLayer(tileUrl).addTo(map);
    let routeLayer = L.layerGroup().addTo(map);
    let stopsLayer = L.layerGroup().addTo(map);

    // GPS Variabler
    let userLocationMarker = null;
    let gpsWatchId = null;

    setTimeout(() => { map.invalidateSize(); }, 500);

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

    let progressInterval;

    // --- LOADER LOGIK ---
    function toggleLoader(show, title = "Scanning...", type = "Default") {
        const overlay = document.getElementById("loading-overlay");
        if (!overlay) return;

        const titleEl = document.getElementById("loading-title");
        const statusEl = document.getElementById("loading-status-text");
        const percentEl = document.getElementById("loading-percentage");
        const progress = document.getElementById("loader-progress");
        const ringBg = document.getElementById("loader-ring-bg");
        const ringSpin = document.getElementById("loader-ring-spin");
        const box = document.getElementById("loader-box");

        clearInterval(progressInterval);

        if (show) {
            const color = themeColors[type] || themeColors['Default'];

            if (titleEl) titleEl.innerText = title;
            if (ringBg) ringBg.style.borderColor = color;
            if (ringSpin) {
                ringSpin.style.borderColor = color;
                ringSpin.style.borderTopColor = 'transparent';
            }
            if (box) box.style.boxShadow = `0 0 50px ${color}40`;
            if (percentEl) { percentEl.style.color = color; percentEl.innerText = "0%"; }
            if (progress) { progress.style.backgroundColor = color; progress.style.width = "0%"; }
            if (statusEl) statusEl.innerText = "Connecting to satellites...";

            overlay.style.setProperty('display', 'flex', 'important');
            overlay.classList.remove('hidden');

            let currentVal = 0;
            progressInterval = setInterval(() => {
                if (currentVal < 40) currentVal += Math.random() * 2;
                else if (currentVal < 70) currentVal += Math.random() * 1.5;
                else if (currentVal < 95) currentVal += Math.random() * 0.5;

                if (currentVal > 99) currentVal = 99;

                let roundedVal = Math.floor(currentVal);
                if (progress) progress.style.width = roundedVal + "%";
                if (percentEl) percentEl.innerText = roundedVal + "%";

                if (statusEl) {
                    if (roundedVal > 20 && roundedVal < 60) statusEl.innerText = "Scanning route area...";
                    else if (roundedVal >= 60 && roundedVal < 85) statusEl.innerText = "Filtering results...";
                    else if (roundedVal >= 85) statusEl.innerText = "Finalizing data...";
                }
            }, 300);

        } else {
            if (progress) progress.style.width = "100%";
            if (percentEl) percentEl.innerText = "100%";
            if (statusEl) statusEl.innerText = "Complete!";

            setTimeout(() => {
                overlay.style.setProperty('display', 'none', 'important');
                overlay.classList.add('hidden');
            }, 400);
        }
    }

    // --- LIVE GPS FUNKTION ---
    function toggleNavigation() {
        if (!navigator.geolocation) {
            console.warn("Din webbläsare stöder inte platstjänster.");
            return;
        }

        const btn = document.getElementById("start-gps-btn");

        // STOPPA GPS
        if (gpsWatchId !== null) {
            navigator.geolocation.clearWatch(gpsWatchId);
            gpsWatchId = null;
            if (userLocationMarker) map.removeLayer(userLocationMarker);
            userLocationMarker = null;

            btn.innerHTML = `<svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M12 2L2 22l10-3 10 3L12 2z"></path></svg> <span class="hidden lg:inline truncate">START NAVIGATION</span>`;
            btn.classList.replace("bg-destructive", "bg-primary");
            btn.classList.replace("text-white", "text-[#0f1219]");

            if (routeLayer.getLayers().length > 0) {
                const latLngs = routeLayer.getLayers()[0].getLatLngs();
                map.fitBounds(L.polyline(latLngs).getBounds(), { padding: [50, 50] });
            }
            return;
        }

        // STARTA GPS
        btn.innerHTML = `<svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> <span class="hidden lg:inline truncate">STOP NAVIGATION</span>`;
        btn.classList.replace("bg-primary", "bg-destructive");
        btn.classList.replace("text-[#0f1219]", "text-white");

        // Tvinga Leaflet att uppdatera storleken innan vi zoomar in (ifall fönstret buggat)
        map.invalidateSize();

        gpsWatchId = navigator.geolocation.watchPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // FIX: Om emulatorn ballar ur och skickar 0,0, strunta i det!
                if (lat === 0 && lng === 0) return;

                if (!userLocationMarker) {
                    userLocationMarker = L.circleMarker([lat, lng], {
                        radius: 8,
                        fillColor: "#4285F4",
                        color: "#ffffff",
                        weight: 3,
                        opacity: 1,
                        fillOpacity: 1
                    }).addTo(map);
                } else {
                    userLocationMarker.setLatLng([lat, lng]);
                }

                map.setView([lat, lng], 15);
            },
            (error) => {
                // FIX: Ingen alert som låser webbläsaren!
                console.warn("GPS Varning (Emulator strul?):", error.message);
            },
            // Lite slappare inställningar för att göra Chrome-emulatorn nöjd
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
        );
    }

    // --- FORMULÄR - SKAPA RUTT ---
    document.addEventListener("submit", async function (e) {
        if (e.target && e.target.id === "trip-create-form") {
            e.preventDefault();
            currentStart = document.getElementById("start-location").value;
            currentEnd = document.getElementById("end-location").value;

            toggleLoader(true, "Planning Route...", "Default");

            try {
                const response = await fetch('?handler=OnPostAsync', {
                    method: 'POST',
                    body: new FormData(e.target),
                    headers: { 'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]').value }
                });
                    const result = await response.json();

                if (result.success) {

                    // Aktivera App-vy (Trip Ready gränssnitt)
                    const mapContainer = document.getElementById('map-container');
                    const sidebarContainer = document.getElementById('sidebar-container');
                    if (mapContainer) mapContainer.classList.add('trip-ready');
                    if (sidebarContainer) sidebarContainer.classList.add('trip-ready');

                    // Se till att Leaflet ritar om ordentligt
                    setTimeout(() => { map.invalidateSize(); drawRoute(result.geometry); }, 300);

                    const menuRes = await fetch('?handler=DetailsMenu');
                    const menuHtml = await menuRes.text();
                    sidebarContainer.innerHTML = menuHtml;

                    document.getElementById("display-title").innerText = `${currentStart} ➔ ${currentEnd}`;
                    document.getElementById("display-distance").innerText = `${Math.round(result.distanceKm)} km`;

                    attachStopButtons();
                    const gpsBtn = document.getElementById("start-gps-btn");
                    if (gpsBtn) gpsBtn.addEventListener("click", toggleNavigation);

                    // Lägg till mobil-dropdown logik för Stops-menyn om den finns
                    const toggleBtn = document.getElementById('toggle-stops-menu');
                    const stopsContainer = document.getElementById('stops-container');
                    const chevron = document.getElementById('stops-chevron');
                    if(toggleBtn && stopsContainer && chevron) {
                        toggleBtn.addEventListener('click', () => {
                            stopsContainer.classList.toggle('hidden');
                            if(stopsContainer.classList.contains('hidden')) {
                                chevron.style.transform = "rotate(0deg)";
                            } else {
                                chevron.style.transform = "rotate(180deg)";
                            }
                        });

                        // Dölj dropdownen igen när man valt något i mobilen och rensa menyn från skärmen
                        document.querySelectorAll('.fetch-stops-btn').forEach(btn => {
                            btn.addEventListener('click', () => {
                                if(window.innerWidth < 1024) {
                                    stopsContainer.classList.add('hidden');
                                    chevron.style.transform = "rotate(0deg)";
                                }
                            });
                        });
                    }
                }
            } catch (err) { console.error(err); }
            finally { toggleLoader(false); }
        }
    });

    // --- STOPP-KNAPPAR ---
    function attachStopButtons() {
        document.querySelectorAll('.fetch-stops-btn').forEach(btn => {
            btn.addEventListener('click', async function () {
                const type = this.getAttribute('data-type');
                const displayType = type === 'RestArea' ? 'Rest Area' : type;
                toggleLoader(true, `Locating ${displayType}s...`, type);

                try {
                    const res = await fetch(`?handler=FetchStops&start=${encodeURIComponent(currentStart)}&end=${encodeURIComponent(currentEnd)}&type=${type}`);
                    const result = await res.json();
                    stopsLayer.clearLayers();
                    if (result.success && result.stops) {
                        const targetColor = themeColors[type] || themeColors['Default'];

                        result.stops.forEach(s => {
                            // Skapa en visuell snygg cirkel anpassad efter vald färg
                            L.circleMarker([s.latitude, s.longitude], {
                                radius: 8,
                                color: targetColor,
                                fillColor: '#0f1219',
                                fillOpacity: 0.9,
                                weight: 2,
                                opacity: 1
                            })
                            .addTo(stopsLayer)
                            .bindPopup(`<strong style="color:${targetColor}">${s.name}</strong>`);
                        });
                    }
                } catch (err) { console.error(err); }
                finally { toggleLoader(false); }
            });
        });
    }

    function drawRoute(geometry) {
        routeLayer.clearLayers();
        const latLngs = geometry.map(p => [p.latitude, p.longitude]);
        L.polyline(latLngs, { color: '#18db67', weight: 6 }).addTo(routeLayer);

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

        // Rita Start-punkt (Ikon)
        L.marker(latLngs[0], { icon: startIcon })
            .addTo(routeLayer)
            .bindPopup("<b>START:</b> " + currentStart);

        // Rita Mål-punkt (Ikon)
        L.marker(latLngs[latLngs.length - 1], { icon: endIcon })
            .addTo(routeLayer)
            .bindPopup("<b>DESTINATION:</b> " + currentEnd);

        map.fitBounds(L.polyline(latLngs).getBounds(), { padding: [50, 50] });

        // --- FUSK FÖR ATT TESTA GPS ---
        console.log("📍 HÄR ÄR TEST-KOORDINATER PÅ DIN EXAKTA GRÖNA LINJE:");
        console.log("1. Start:", latLngs[0][0].toFixed(4), latLngs[0][1].toFixed(4));
        console.log("2. En fjärdedel in:", latLngs[Math.floor(latLngs.length * 0.25)][0].toFixed(4), latLngs[Math.floor(latLngs.length * 0.25)][1].toFixed(4));
        console.log("3. Halvvägs:", latLngs[Math.floor(latLngs.length * 0.5)][0].toFixed(4), latLngs[Math.floor(latLngs.length * 0.5)][1].toFixed(4));
        console.log("4. Tre fjärdedelar in:", latLngs[Math.floor(latLngs.length * 0.75)][0].toFixed(4), latLngs[Math.floor(latLngs.length * 0.75)][1].toFixed(4));
        console.log("5. Mål:", latLngs[latLngs.length - 1][0].toFixed(4), latLngs[latLngs.length - 1][1].toFixed(4));
    }
});