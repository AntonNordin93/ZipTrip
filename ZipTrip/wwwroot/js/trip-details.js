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
    let selectedStopsLayer = L.layerGroup().addTo(map);

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

    let selectedStopsArray = [];

    // Parse pre-saved stops if we are entering an existing trip
    const existingStopsAttr = mapElement.getAttribute("data-stops");
    if(existingStopsAttr && existingStopsAttr !== "") {
        try {
            // Un-escape any potential HTML encoded characters just safely parse it
            const preSaved = JSON.parse(existingStopsAttr);
            if(preSaved && Array.isArray(preSaved)) {
                selectedStopsArray = preSaved.map(s => ({
                    Name: s.Name,
                    Latitude: s.Lat,
                    Longitude: s.Lng,
                    Type: s.Type
                }));
            }
        } catch(e) { console.error("Could not parse existing stops", e, existingStopsAttr); }
    }

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

            }
        } catch (e) {
            console.error("Fel vid laddning av rutt:", e);
        }
    }

    // Rita ut de redan sparade stoppen!
    function renderSavedStops() {
        selectedStopsLayer.clearLayers();
        selectedStopsArray.forEach(s => {
            const targetColor = themeColors[s.Type] || themeColors['Default'];
            L.circleMarker([s.Latitude, s.Longitude], {
                radius: 10,
                color: '#ffffff',
                fillColor: targetColor,
                fillOpacity: 1,
                weight: 3,
                opacity: 1
            }).addTo(selectedStopsLayer).bindPopup(`<b>${s.Name}</b> (Selected)`);
        });
    }

    let progressInterval;

    // Lång overlay loader identisk med Create vyn
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

    // 3. Hantera knapptryckningarna för att hämta stopp
    document.querySelectorAll('.fetch-stops-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            // Close dropdown if open
            const stopsContainer = document.getElementById('stops-container');
            const stopsChevron = document.getElementById('stops-chevron');
            if(stopsContainer) stopsContainer.classList.add('hidden');
            if(stopsChevron) stopsChevron.style.transform = "rotate(0deg)";

            const type = this.getAttribute('data-type');
            const displayType = type === 'RestArea' ? 'Rest Area' : type;

            toggleLoader(true, `Locating ${displayType}s...`, type);

            try {
                // Ensure selectedRouteType is defined or default to 'fastest'
                const currentRouteType = window.selectedRouteType || 'fastest';
                const response = await fetch(`?handler=FetchStops&start=${encodeURIComponent(startLoc)}&end=${encodeURIComponent(endLoc)}&type=${type}&routeType=${currentRouteType}`);
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
                        .bindPopup(`
                            <div style="text-align:center;">
                                <strong style="color:${targetColor}">${s.name || "Stop"}</strong><br>
                                <button class="add-stop-btn" style="margin-top:5px; padding:3px 8px; background-color:${targetColor}; color:#000; border:none; border-radius:4px; font-weight:bold; cursor:pointer;" data-name="${s.name}" data-lat="${s.latitude}" data-lng="${s.longitude}" data-type="${type}">Add to Trip</button>
                            </div>
                        `);
                    });
                } else {
                    alert("Inga stopp hittades. TomTom returnerade tomt för denna kategori.");
                }
            } catch (e) {
                console.error("Fel vid hämtning av API:", e);
                alert("Nätverksfel vid hämtning av stopp.");
            } finally {
                toggleLoader(false);
            }
        });
    });

    // Lyssna på klick för "Add to Trip" i popups
    document.addEventListener('click', function(e) {
        if(e.target && e.target.classList.contains('add-stop-btn')) {
            const btn = e.target;
            const name = btn.getAttribute('data-name');
            const lat = parseFloat(btn.getAttribute('data-lat'));
            const lng = parseFloat(btn.getAttribute('data-lng'));
            const type = btn.getAttribute('data-type');

            // Spara i arrayen if it doesn't already exist
            if(!selectedStopsArray.find(s => s.Latitude === lat && s.Longitude === lng)) {
                selectedStopsArray.push({
                    Name: name,
                    Latitude: lat,
                    Longitude: lng,
                    Type: type
                });
            }

            // Immediately visually update!
            renderSavedStops();
            map.closePopup();
        }
    });

    // Hantera spara knappen 
    const updateBtn = document.getElementById("update-trip-btn");
    const updateForm = document.getElementById("update-form");
    if(updateBtn) {
        updateBtn.addEventListener("click", async () => {
            updateBtn.innerHTML = '<span class="text-[#0f1219] font-bold">SAVING...</span>';
            const tripId = mapElement.getAttribute("data-trip-id");

            // Mocking a Request since we only have start/end logic available right here
            // On a real payload you want to fill these values from the server form
            const requestPayload = {
                StartLocation: startLoc,
                EndLocation: endLoc,
                SelectedStops: selectedStopsArray
            };

            const tokenInput = updateForm ? updateForm.querySelector('input[name="__RequestVerificationToken"]') : null;
            // Get the token from script tag if the form input failed to mount for some reason
            const token = (tokenInput ? tokenInput.value : "") || (window.antiForgeryToken || "");

            try {
                const res = await fetch(`?handler=UpdateTrip&id=${tripId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'RequestVerificationToken': token },
                    body: JSON.stringify(requestPayload)
                });

                if(!res.ok) {
                    throw new Error("HTTP error " + res.status);
                }

                const svResult = await res.json();
                if(svResult.success) {
                    updateBtn.innerHTML = '<span class="text-[#0f1219] font-bold">SAVED ✓</span>';
                    setTimeout(() => updateBtn.innerHTML = `
                        <svg class="w-5 h-5 shrink-0 text-[#0f1219]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        <span class="hidden lg:inline truncate">SAVE CHANGES</span>
                    `, 2000);
                } else {
                    updateBtn.innerHTML = '<span class="text-[#0f1219] font-bold">ERROR</span>';
                    setTimeout(() => updateBtn.innerHTML = `
                        <svg class="w-5 h-5 shrink-0 text-[#0f1219]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        <span class="hidden lg:inline truncate">SAVE CHANGES</span>
                    `, 2000);
                }
            } catch(e) {
                console.error(e);
                updateBtn.innerHTML = '<span class="text-[#0f1219] font-bold">FAILED</span>';
                setTimeout(() => updateBtn.innerHTML = `
                    <svg class="w-5 h-5 shrink-0 text-[#0f1219]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    <span class="hidden lg:inline truncate">SAVE CHANGES</span>
                `, 2000);
            }
        });
    }

    // Kör igång kartan!
    initMap();
    renderSavedStops();
});