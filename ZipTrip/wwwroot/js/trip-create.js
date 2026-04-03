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

// --- KART LOGIK OCH GEOTRANSLATION ---
document.addEventListener("DOMContentLoaded", function () {
    const mapElement = document.getElementById("map");
    if (!mapElement) return;

    // Variabler för att hålla koll på markörer på kartan
    let startMarker, endMarker, routeLine;

    // Initiera kartan
    const map = L.map("map", { zoomControl: true }).setView([62.0, 15.0], 5);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Hjälpfunktion: Översätt stadsnamn till koordinater (Geocoding)
    async function getCoords(query) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const data = await response.json();
            if (data && data.length > 0) {
                return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            }
        } catch (err) {
            console.error("Geocoding error:", err);
        }
        return null;
    }

    // Geolocation (Hitta användarens position vid start)
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                map.setView([lat, lng], 12);

                const userIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: "<div style='background-color:#18db67;width:15px;height:15px;border-radius:50%;border:3px solid #0f1219;box-shadow:0 0 10px #18db67;'></div>",
                    iconSize: [15, 15],
                    iconAnchor: [7, 7]
                });

                L.marker([lat, lng], { icon: userIcon }).addTo(map).bindPopup("<b>You are here</b>");

                const startInput = document.getElementById("start-location");
                if (startInput && startInput.value === "") {
                    // Vi fyller i koordinaterna temporärt om användaren vill starta "här"
                    startInput.value = "My Current Location";
                    startInput.dataset.lat = lat;
                    startInput.dataset.lng = lng;
                }
            },
            function (error) {
                console.warn("Geolocation failed:", error.message);
            }
        );
    }

    // --- PREVIEW ROUTE KNAPPEN ---
    const calcBtn = document.getElementById("btn-calc-route");
    if (calcBtn) {
        calcBtn.addEventListener("click", async function () {
            const startQuery = document.getElementById("start-location").value;
            const endQuery = document.getElementById("end-location").value;

            if (!startQuery || !endQuery) {
                alert("Please enter both Start and Destination.");
                return;
            }

            // Visa info-kortet
            const infoCard = document.getElementById("route-info-card");
            const infoDetails = document.getElementById("route-details");
            infoCard.classList.remove("hidden");
            infoDetails.innerText = "Finding locations...";

            // Hämta koordinater för båda städerna
            const startCoords = await getCoords(startQuery);
            const endCoords = await getCoords(endQuery);

            if (!startCoords || !endCoords) {
                infoDetails.innerText = "Could not find one of the locations. Try to be more specific (e.g. 'Stockholm, Sweden').";
                return;
            }

            // Rensa gamla markörer om de finns
            if (startMarker) map.removeLayer(startMarker);
            if (endMarker) map.removeLayer(endMarker);
            if (routeLine) map.removeLayer(routeLine);

            // Lägg till nya markörer
            startMarker = L.marker(startCoords).addTo(map).bindPopup("Start: " + startQuery);
            endMarker = L.marker(endCoords).addTo(map).bindPopup("End: " + endQuery);

            // Rita en enkel rät linje mellan punkterna (för preview)
            routeLine = L.polyline([startCoords, endCoords], { color: '#18db67', weight: 4, opacity: 0.7, dashArray: '10, 10' }).addTo(map);

            // Zooma kartan så båda punkterna syns
            map.fitBounds(L.latLngBounds(startCoords, endCoords), { padding: [50, 50] });

            infoDetails.innerHTML = `
                <div class="space-y-1">
                    <p><b>From:</b> ${startQuery}</p>
                    <p><b>To:</b> ${endQuery}</p>
                    <hr class="border-border my-2">
                    <p class="text-neon-cyan font-bold">Route Preview Ready!</p>
                </div>`;
        });
    }

    // Hantera fönsterstorlek
    window.addEventListener("resize", () => {
        setTimeout(() => { map.invalidateSize(); }, 100);
    });
});