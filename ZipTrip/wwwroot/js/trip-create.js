document.addEventListener("DOMContentLoaded", function () {
    const mapElement = document.getElementById("trip-map");
    if (!mapElement) return;

    const sidebarContainer = document.getElementById("sidebar-container");
    let currentStart = "";
    let currentEnd = "";

    const map = L.map('trip-map', { zoomControl: true }).setView([62.0, 15.0], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
    let routeLayer = L.layerGroup().addTo(map);
    let stopsLayer = L.layerGroup().addTo(map);

    setTimeout(() => { map.invalidateSize(); }, 500);

    const themeColors = {
        'Fuel': '#18db67',
        'Charging': '#30e5f2',
        'Restaurant': '#f89e21',
        'Default': '#18db67'
    };

    let progressInterval; // Variabel för att hålla koll på tickandet

    // DYNAMISK PROCENT-LOADER
    function toggleLoader(show, title = "Scanning...", type = "Default") {
        const overlay = document.getElementById("loading-overlay");
        const titleEl = document.getElementById("loading-title");
        const statusEl = document.getElementById("loading-status-text");
        const percentEl = document.getElementById("loading-percentage");
        const progress = document.getElementById("loader-progress");
        const ringBg = document.getElementById("loader-ring-bg");
        const ringSpin = document.getElementById("loader-ring-spin");
        const box = document.getElementById("loader-box");

        if (!overlay) return;

        // Rensa alltid föregående timer
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
            if (percentEl) {
                percentEl.style.color = color;
                percentEl.innerText = "0%";
            }
            if (progress) {
                progress.style.backgroundColor = color;
                progress.style.width = "0%";
            }
            if (statusEl) statusEl.innerText = "Connecting to satellites...";

            overlay.style.setProperty('display', 'flex', 'important');
            overlay.classList.remove('hidden');

            // --- FAKE PROGRESS LOGIC ---
            // Simulerar laddning upp till 99%
            let currentVal = 0;
            progressInterval = setInterval(() => {
                // Går snabbare i början, saktar ner ju närmare 99% den kommer
                if (currentVal < 40) currentVal += Math.random() * 4;
                else if (currentVal < 70) currentVal += Math.random() * 2;
                else if (currentVal < 95) currentVal += Math.random() * 0.5;

                if (currentVal > 99) currentVal = 99;

                let roundedVal = Math.floor(currentVal);
                if (progress) progress.style.width = roundedVal + "%";
                if (percentEl) percentEl.innerText = roundedVal + "%";

                // Byt text för att det ska se "smart" ut
                if (statusEl) {
                    if (roundedVal > 20 && roundedVal < 60) statusEl.innerText = "Scanning route area...";
                    else if (roundedVal >= 60 && roundedVal < 85) statusEl.innerText = "Filtering results...";
                    else if (roundedVal >= 85) statusEl.innerText = "Finalizing data...";
                }
            }, 300);

        } else {
            // Sätt direkt till 100% innan den stängs ner
            if (progress) progress.style.width = "100%";
            if (percentEl) percentEl.innerText = "100%";
            if (statusEl) statusEl.innerText = "Complete!";

            // Låt användaren se "100%" i en halv sekund innan den försvinner
            setTimeout(() => {
                overlay.style.setProperty('display', 'none', 'important');
                overlay.classList.add('hidden');
            }, 400);
        }
    }

    // SKAPA RUTT
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
                    drawRoute(result.geometry);

                    const menuRes = await fetch('?handler=DetailsMenu');
                    const menuHtml = await menuRes.text();
                    sidebarContainer.innerHTML = menuHtml;
                    document.getElementById("display-title").innerText = `${currentStart} ➔ ${currentEnd}`;
                    document.getElementById("display-distance").innerText = `${Math.round(result.distanceKm)} km`;

                    attachStopButtons();
                }
            } catch (err) { console.error(err); }
            finally { toggleLoader(false); }
        }
    });

    // HÄMTA STOPP
    function attachStopButtons() {
        document.querySelectorAll('.fetch-stops-btn').forEach(btn => {
            btn.addEventListener('click', async function () {
                const type = this.getAttribute('data-type');

                toggleLoader(true, `Locating ${type}s...`, type);

                try {
                    const res = await fetch(`?handler=FetchStops&start=${encodeURIComponent(currentStart)}&end=${encodeURIComponent(currentEnd)}&type=${type}`);
                    const result = await res.json();
                    stopsLayer.clearLayers();
                    if (result.success && result.stops) {
                        result.stops.forEach(s => {
                            L.marker([s.latitude, s.longitude]).addTo(stopsLayer).bindPopup(`<b>${s.name}</b>`);
                        });
                    }
                } catch (err) { console.error(err); }
                finally {
                    toggleLoader(false);
                }
            });
        });
    }

    function drawRoute(geometry) {
        routeLayer.clearLayers();
        const latLngs = geometry.map(p => [p.latitude, p.longitude]);
        L.polyline(latLngs, { color: '#18db67', weight: 6 }).addTo(routeLayer);
        map.fitBounds(L.polyline(latLngs).getBounds(), { padding: [50, 50] });
    }
});