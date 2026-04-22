document.addEventListener("DOMContentLoaded", function () {
    const mapElement = document.getElementById("trip-map");
    if (!mapElement) return;

    // UI Referenser
    const sidebarContainer = document.getElementById("sidebar-container");
    const loadingOverlay = document.getElementById("loading-overlay");
    const loadingTitle = document.getElementById("loading-title");
    const loadingDesc = document.getElementById("loading-desc");

    // Spara rutt-variabler globalt för denna sida
    let currentStart = "";
    let currentEnd = "";

    // Initiera Kartan
    const map = L.map('trip-map', { zoomControl: true }).setView([62.0, 15.0], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
    let routeLayer = L.layerGroup().addTo(map);
    let stopsLayer = L.layerGroup().addTo(map);

    setTimeout(() => { map.invalidateSize(); }, 500);

    // --- EVENT LISTENER FÖR SKAPA-FORMULÄRET ---
    // Eftersom formuläret är laddat från start, fäster vi eventet på "document" (Event Delegation)
    document.addEventListener("submit", async function (e) {
        if (e.target && e.target.id === "trip-create-form") {
            e.preventDefault(); // STOPPA SIDAN FRÅN ATT LADDA OM!

            const form = e.target;
            currentStart = form.querySelector("#start-location").value;
            currentEnd = form.querySelector("#end-location").value;

            if (!currentStart || !currentEnd) { alert("Fyll i start och mål"); return; }

            showLoading("Planerar rutt...", "Beräknar avstånd och rutt via satellit.");
            const formData = new FormData(form);

            try {
                // 1. Skicka formuläret till servern (OnPostAsync) för att spara & hämta rutt-karta
                const routeResponse = await fetch('?handler=OnPostAsync', {
                    method: 'POST',
                    body: formData
                });
                const routeResult = await routeResponse.json();

                if (routeResult.success) {
                    // Rita kartan direkt!
                    drawRouteOnMap(routeResult.geometry, currentStart, currentEnd);

                    // 2. HÄR ÄR MAGIN: Hämta Delvyn (Partial View) med Stopp-knapparna!
                    showLoading("Förbereder meny...", "Laddar in reseverktygen.");
                    const htmlResponse = await fetch('?handler=DetailsMenu');
                    const htmlText = await htmlResponse.text(); // Vi hämtar det som ren HTML-text

                    // Byt ut hela sidebarens innehåll mot den nya HTML-koden
                    sidebarContainer.innerHTML = htmlText;

                    // Uppdatera texten i den nya HTML-koden vi nyss klistrade in
                    document.getElementById("display-title").innerText = `${currentStart} ➔ ${currentEnd}`;
                    document.getElementById("display-distance").innerText = `${Math.round(routeResult.distanceKm)} km total distance`;

                    // Eftersom knapparna är helt nya i webbläsaren måste vi koppla klick-eventen på nytt
                    attachStopButtonsListeners();
                    attachEditButtonListener();
                } else {
                    alert(routeResult.message);
                }
            } catch (error) {
                console.error(error); alert("Ett fel uppstod.");
            } finally {
                hideLoading();
            }
        }
    });

    // --- KOPPLA KLICK TILL STOPP-KNAPPARNA (Körs när nya menyn har laddats in) ---
    function attachStopButtonsListeners() {
        document.querySelectorAll('.fetch-stops-btn').forEach(btn => {
            btn.addEventListener('click', async function () {
                const type = this.getAttribute('data-type');
                showLoading(`Söker efter ${type}...`, `Kommunicerar med TomTom API.`);

                try {
                    // Anropar din backend
                    const url = `?handler=FetchStops&start=${encodeURIComponent(currentStart)}&end=${encodeURIComponent(currentEnd)}&type=${type}`;
                    const response = await fetch(url);
                    const result = await response.json();

                    stopsLayer.clearLayers();

                    if (result.success && result.stops && result.stops.length > 0) {
                        result.stops.forEach(s => {
                            L.marker([s.latitude, s.longitude]).addTo(stopsLayer).bindPopup(`<b>${s.name}</b>`);
                        });
                    } else {
                        alert("No Stops were found for " + type);
                    }
                } catch (e) {
                    alert("Couldn't fetch stops for " + type);
                } finally {
                    hideLoading();
                }
            });
        });
    }

    // --- KOPPLA "TILLBAKA"-KNAPPEN ---
    function attachEditButtonListener() {
        const btnEdit = document.getElementById("btn-edit-trip");
        if (btnEdit) {
            btnEdit.addEventListener("click", function () {
                // Vi laddar om hela sidan för att börja om (Enkelt och stabilt)
                window.location.reload();
            });
        }
    }

    // --- RITA KARTAN ---
    function drawRouteOnMap(geometry, startName, endName) {
        routeLayer.clearLayers();
        const latLngs = geometry.map(p => [p.latitude, p.longitude]);
        L.polyline(latLngs, { color: '#18db67', weight: 6, opacity: 0.8 }).addTo(routeLayer);
        L.circleMarker(latLngs[0], { radius: 10, color: '#18db67', fillOpacity: 1 }).addTo(routeLayer).bindPopup("START: " + startName);
        L.circleMarker(latLngs[latLngs.length - 1], { radius: 10, color: '#ff4444', fillOpacity: 1 }).addTo(routeLayer).bindPopup("MÅL: " + endName);
        map.fitBounds(L.polyline(latLngs).getBounds(), { padding: [50, 50] });
    }

    function showLoading(title, desc) {
        loadingTitle.innerText = title;
        loadingDesc.innerText = desc;
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.classList.add('flex');
    }

    function hideLoading() {
        loadingOverlay.classList.add('hidden');
        loadingOverlay.classList.remove('flex');
    }
});