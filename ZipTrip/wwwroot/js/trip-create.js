// --- MODAL LOGIK ---
function showGuestModal() {
    const modal = document.getElementById('guest-modal');
    const content = document.getElementById('guest-modal-content');
    if (!modal || !content) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeGuestModal() {
    const modal = document.getElementById('guest-modal');
    const content = document.getElementById('guest-modal-content');
    if (!modal || !content) return;
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

// --- KART LOGIK ---
document.addEventListener("DOMContentLoaded", function () {
    const mapElement = document.getElementById("map");
    if (!mapElement) return;

    let startMarker, endMarker, routeLine;
    const map = L.map("map", { zoomControl: true }).setView([62.0, 15.0], 5);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // --- PREVIEW ROUTE KNAPPEN (UPPDATERAD) ---
    const calcBtn = document.getElementById("btn-calc-route");
    if (calcBtn) {
        calcBtn.addEventListener("click", async function () {
            const startInput = document.getElementById("start-location").value;
            const endInput = document.getElementById("end-location").value;

            if (!startInput || !endInput) {
                alert("Please enter both Start and Destination.");
                return;
            }

            const infoCard = document.getElementById("route-info-card");
            const infoDetails = document.getElementById("route-details");
            infoCard.classList.remove("hidden");
            infoDetails.innerText = "Calculating optimal route...";

            try {
                // ANROPAR DIN BACKEND HANDLER
                const url = `?handler=RoutePreview&start=${encodeURIComponent(startInput)}&end=${encodeURIComponent(endInput)}`;
                const response = await fetch(url);
                const data = await response.json();

                if (data && data.geometry && data.geometry.length > 0) {
                    // Rensa gamla objekt
                    if (startMarker) map.removeLayer(startMarker);
                    if (endMarker) map.removeLayer(endMarker);
                    if (routeLine) map.removeLayer(routeLine);

                    // Konvertera backends format till Leaflets format [[lat, lng], ...]
                    const latLngs = data.geometry.map(p => [p.latitude, p.longitude]);

                    // RITA DEN RIKTIGA RUTTEN
                    routeLine = L.polyline(latLngs, {
                        color: '#18db67',
                        weight: 5,
                        opacity: 0.8,
                        lineJoin: 'round'
                    }).addTo(map);

                    // Sätt markörer vid ruttens start och slut
                    startMarker = L.marker(latLngs[0]).addTo(map).bindPopup(`Start: ${startInput}`);
                    endMarker = L.marker(latLngs[latLngs.length - 1]).addTo(map).bindPopup(`Mål: ${endInput}`);

                    // Zooma så hela rutan syns
                    map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

                    // Visa riktig distans och tid från backenden
                    infoDetails.innerHTML = `
                        <b>Distance:</b> ${data.distanceKm.toFixed(1)} km<br>
                        <b>Time:</b> ${Math.floor(data.durationHours)}h ${Math.round((data.durationHours % 1) * 60)}m<br>
                        <span class='text-neon-cyan'>Optimal road route found!</span>`;
                } else {
                    infoDetails.innerText = "Could not find a route. Please be more specific with location names.";
                }
            } catch (error) {
                console.error("Error fetching route:", error);
                infoDetails.innerText = "Error calculating route. Please try again.";
            }
        });
    }

    window.addEventListener("resize", () => {
        setTimeout(() => { map.invalidateSize(); }, 100);
    });
});