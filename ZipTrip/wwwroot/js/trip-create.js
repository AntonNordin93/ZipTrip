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
    let selectedStopsLayer = L.layerGroup().addTo(map);

    let selectedStopsArray = [];
    window.selectedStopsArray = selectedStopsArray;
    let selectedRouteType = "fastest";

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
        'fastest': '#18db67',
        'eco': '#30e5f2',
        'scenic': '#f89e21',
        'short': '#ce60f8',
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
            btn.classList.replace("hover:bg-destructive/90", "hover:bg-primary/90");
            btn.classList.replace("shadow-[0_0_15px_rgba(240,51,51,0.4)]", "shadow-[0_0_15px_rgba(24,219,103,0.4)]");
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
        btn.classList.replace("hover:bg-primary/90", "hover:bg-destructive/90");
        btn.classList.replace("shadow-[0_0_15px_rgba(24,219,103,0.4)]", "shadow-[0_0_15px_rgba(240,51,51,0.4)]");
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

            // Hämta formulärdata och token INNAN formuläret kapas från DOM:en!
            const fd = new FormData(e.target);
            const antiForgeryToken = document.querySelector('input[name="__RequestVerificationToken"]')?.value || "";
            const tripRequestPayload = {
                Title: fd.get("Input.Title") || "My Trip",
                StartLocation: currentStart,
                EndLocation: currentEnd,
                StartDate: new Date().toISOString(),
                VehicleType: parseInt(fd.get("Input.VehicleType")) || 0,
                SelectedStops: window.selectedStopsArray || []
            };
            window.tripRequestPayloadRef = tripRequestPayload;

            toggleLoader(true, "Planning Route...", "Default");

            try {
                const response = await fetch('?handler=OnPostAsync', {
                    method: 'POST',
                    body: fd,
                    headers: { 'RequestVerificationToken': antiForgeryToken }
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

                    const durationEl = document.getElementById("display-time");
                    if (durationEl && result.durationHours) {
                        const totalMinutes = Math.round(result.durationHours * 60);
                        const h = Math.floor(totalMinutes / 60);
                        const m = totalMinutes % 60;
                        durationEl.querySelector("span").innerText = `${h} h ${m} min`;
                    }

                    attachStopButtons();
                    const gpsBtn = document.getElementById("start-gps-btn");
                    if (gpsBtn) gpsBtn.addEventListener("click", toggleNavigation);
                    
                    const mobileStartGpsBtn = document.getElementById("mobile-start-gps-btn");
                    if (mobileStartGpsBtn) mobileStartGpsBtn.addEventListener("click", toggleNavigation);

                    // Koppla Mobile Trip Menu (HAMBURGER i trip ready-läget)
                    const mobileTripMenuBtn = document.getElementById('mobile-trip-menu-btn');
                    const mobileTripMenu = document.getElementById('mobile-trip-menu');
                    const closeMobileTripMenu = document.getElementById('close-mobile-trip-menu');
                    let isMobileMenuOpen = false;

                    if (mobileTripMenuBtn && mobileTripMenu && closeMobileTripMenu) {
                        const toggleMobileTripMenu = () => {
                            isMobileMenuOpen = !isMobileMenuOpen;
                            const tripOptions = document.getElementById('trip-options-container');
                            const targetContainer = document.getElementById('mobile-trip-menu-content-container');
                            const detailsMenu = document.getElementById('details-menu');

                            const hamburgerIcon = document.getElementById('trip-hamburger-icon');
                            const closeIcon = document.getElementById('trip-close-icon');

                            if (isMobileMenuOpen) {
                                // Flytta nedre actions till overlaysktionen (dropdowns)
                                if (tripOptions && targetContainer) {
                                    tripOptions.classList.remove('hidden', 'lg:flex');
                                    tripOptions.classList.add('flex');
                                    targetContainer.appendChild(tripOptions);
                                }

                                if (hamburgerIcon) hamburgerIcon.classList.add('hidden');
                                if (closeIcon) closeIcon.classList.remove('hidden');

                                mobileTripMenu.classList.remove('hidden');
                                void mobileTripMenu.offsetWidth; // Trigger reflow
                                mobileTripMenu.classList.remove('translate-x-full');
                                document.body.style.overflow = 'hidden';
                            } else {
                                mobileTripMenu.classList.add('translate-x-full');

                                if (hamburgerIcon) hamburgerIcon.classList.remove('hidden');
                                if (closeIcon) closeIcon.classList.add('hidden');

                                setTimeout(() => {
                                    mobileTripMenu.classList.add('hidden');
                                    document.body.style.overflow = '';

                                    // Flytta tillbaka menyn
                                    if(tripOptions && detailsMenu) {
                                        tripOptions.classList.add('hidden', 'lg:flex');
                                        tripOptions.classList.remove('flex');
                                        detailsMenu.appendChild(tripOptions);
                                    }
                                }, 300);
                            }
                        };

                        // REMOVE standard eventlisteners att det bara gör en sak
                        const newTripMenuBtn = mobileTripMenuBtn.cloneNode(true);
                        mobileTripMenuBtn.parentNode.replaceChild(newTripMenuBtn, mobileTripMenuBtn);
                        newTripMenuBtn.addEventListener('click', toggleMobileTripMenu);

                        const newCloseMobileTripMenu = closeMobileTripMenu.cloneNode(true);
                        closeMobileTripMenu.parentNode.replaceChild(newCloseMobileTripMenu, closeMobileTripMenu);
                        newCloseMobileTripMenu.addEventListener('click', toggleMobileTripMenu);

                        // Sync mobile menu buttons mapping
                        const mobileSaveBtn = document.getElementById('mobile-save-trip-btn');
                        const mobileStartBtn = document.getElementById('mobile-start-gps-btn');
                        const desktopSaveBtn = document.getElementById('save-trip-btn');
                        const desktopStartBtn = document.getElementById('start-gps-btn');

                        if (mobileSaveBtn && desktopSaveBtn) {
                            mobileSaveBtn.addEventListener('click', () => desktopSaveBtn.click());
                        }
                        if (mobileStartBtn && desktopStartBtn) {
                            mobileStartBtn.addEventListener('click', () => desktopStartBtn.click());
                        }
                    }

                    // --- Helper att stänga alla popups ---
                    function closeAllDropdowns() {
                        const containers = [
                            { c: document.getElementById('vehicle-container'), i: document.getElementById('vehicle-chevron') },
                            { c: document.getElementById('routes-container'), i: document.getElementById('routes-chevron') },
                            { c: document.getElementById('stops-container'), i: document.getElementById('stops-chevron') }
                        ];

                        containers.forEach(x => {
                            if (x.c && !x.c.classList.contains('hidden')) {
                                x.c.classList.add('hidden');
                                if (x.i) x.i.style.transform = "rotate(0deg)";
                            }
                        });
                    }

                    // DROPDOWN LOGIC FÖR VEHICLES (Ny)
                    const toggleVehicleBtn = document.getElementById('toggle-vehicle-menu');
                    const vehicleContainer = document.getElementById('vehicle-container');
                    const vehicleChevron = document.getElementById('vehicle-chevron');
                    let selectedVehicleId = null;

                    if(toggleVehicleBtn && vehicleContainer && vehicleChevron) {
                        toggleVehicleBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const isHidden = vehicleContainer.classList.contains('hidden');
                            closeAllDropdowns(); // Stäng andra!

                            if(isHidden) {
                                vehicleContainer.classList.remove('hidden');
                                vehicleChevron.style.transform = "rotate(180deg)";
                            } else {
                                vehicleContainer.classList.add('hidden');
                                vehicleChevron.style.transform = "rotate(0deg)";
                            }
                        });

                        // Close dropdown when clicking outside
                        document.addEventListener('click', (e) => {
                           if(!toggleVehicleBtn.contains(e.target) && !vehicleContainer.contains(e.target) && !vehicleContainer.classList.contains('hidden')) {
                               vehicleContainer.classList.add('hidden');
                               vehicleChevron.style.transform = "rotate(0deg)";
                           }
                        });

                        document.querySelectorAll('.vehicle-type-btn').forEach(btn => {
                            btn.addEventListener('click', () => {
                                // Close dropdown
                                vehicleContainer.classList.add('hidden');
                                vehicleChevron.style.transform = "rotate(0deg)";

                                // Update active state visually
                                document.querySelectorAll('.vehicle-type-btn').forEach(b => b.classList.remove('bg-[#18db67]/10', 'border-[#18db67]', 'bg-[#30e5f2]/10', 'border-[#30e5f2]', 'bg-[#f89e21]/10', 'border-[#f89e21]'));
                                document.querySelectorAll('.vehicle-type-btn').forEach(b => b.classList.add('bg-muted/30', 'border-border'));
                                btn.classList.remove('bg-muted/30', 'border-border');

                                const displayNavText = btn.querySelector('span').innerText;
                                selectedVehicleId = btn.getAttribute('data-id') || btn.getAttribute('data-val');

                                // Set paths based on text content
                                let thePath = "M8 7h8M8 11h8M8 15h8M4 4h16v16H4V4z";
                                let colorClass = "text-[#18db67]"; // default Green

                                if(displayNavText.includes('Electric')) {
                                    thePath = "M13 2L3 14h9l-1 8 10-12h-9l1-8z";
                                    colorClass = "text-[#30e5f2]";
                                    btn.classList.add('bg-[#30e5f2]/10', 'border-[#30e5f2]');
                                } else if(displayNavText.includes('Motor') || displayNavText.includes('Caravan')) {
                                    thePath = "M3 13h18V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5zm0 0v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5M8 21v-2M16 21v-2";
                                    colorClass = "text-[#f89e21]";
                                    btn.classList.add('bg-[#f89e21]/10', 'border-[#f89e21]');
                                } else {
                                     btn.classList.add('bg-[#18db67]/10', 'border-[#18db67]');
                                     // Default logic for matching color to element's svg color class if text doesn't match Enums directly (like real names)
                                     let svgElem = btn.querySelector('svg');
                                     if(svgElem && svgElem.parentElement) {
                                         let parentClasses = svgElem.parentElement.className;
                                         if(parentClasses.includes('text-[#18db67]')) {
                                             colorClass = 'text-[#18db67]';
                                             thePath = "M8 7h8M8 11h8M8 15h8M4 4h16v16H4V4z";
                                             btn.classList.add('bg-[#18db67]/10', 'border-[#18db67]');
                                         }
                                         else if (parentClasses.includes('text-[#30e5f2]')) {
                                             colorClass = 'text-[#30e5f2]';
                                             thePath = "M13 2L3 14h9l-1 8 10-12h-9l1-8z";
                                             btn.classList.add('bg-[#30e5f2]/10', 'border-[#30e5f2]');
                                         }
                                         else if (parentClasses.includes('text-[#f89e21]')) {
                                             colorClass = 'text-[#f89e21]';
                                             thePath = "M3 13h18V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5zm0 0v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5M8 21v-2M16 21v-2";
                                             btn.classList.add('bg-[#f89e21]/10', 'border-[#f89e21]');
                                         }
                                     }
                                }

                                // Update display text to selected vehicle
                                document.getElementById('selected-vehicle-display').innerHTML = `
                                    <svg class="w-5 h-5 ${colorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${thePath}"></path></svg>
                                    <span>${displayNavText}</span>
                                `;
                            });
                        });
                    }

                    // DROPDOWN LOGIC FÖR ROUTES
                    const toggleRoutesBtn = document.getElementById('toggle-routes-menu');
                    const routesContainer = document.getElementById('routes-container');
                    const routesChevron = document.getElementById('routes-chevron');
                    if(toggleRoutesBtn && routesContainer && routesChevron) {
                        toggleRoutesBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const isHidden = routesContainer.classList.contains('hidden');
                            closeAllDropdowns(); // Stäng andra!

                            if(isHidden) {
                                routesContainer.classList.remove('hidden');
                                routesChevron.style.transform = "rotate(180deg)";
                            } else {
                                routesContainer.classList.add('hidden');
                                routesChevron.style.transform = "rotate(0deg)";
                            }
                        });

                        // Close dropdown when clicking outside
                        document.addEventListener('click', (e) => {
                           if(!toggleRoutesBtn.contains(e.target) && !routesContainer.contains(e.target) && !routesContainer.classList.contains('hidden')) {
                               routesContainer.classList.add('hidden');
                               routesChevron.style.transform = "rotate(0deg)";
                           }
                        });

                        // Event listeners for route option buttons (mockup function)
                        document.querySelectorAll('.route-type-btn').forEach(btn => {
                            btn.addEventListener('click', async () => {
                                // Close dropdown
                                routesContainer.classList.add('hidden');
                                routesChevron.style.transform = "rotate(0deg)";

                                // Update active state visually
                                document.querySelectorAll('.route-type-btn').forEach(b => b.classList.remove('bg-[#18db67]/10', 'border-[#18db67]', 'bg-[#f89e21]/10', 'border-[#f89e21]', 'bg-[#ce60f8]/10', 'border-[#ce60f8]', 'active'));
                                document.querySelectorAll('.route-type-btn').forEach(b => b.classList.add('bg-muted/30', 'border-border'));
                                btn.classList.remove('bg-muted/30', 'border-border');

                                const selectedType = btn.getAttribute('data-type');
                                const displayNavText = btn.querySelector('.font-bold') ? btn.querySelector('.font-bold').innerText : btn.querySelector('.font-medium').innerText;

                                let activeColorClass = 'text-[#18db67]';
                                if (selectedType === 'fastest') {
                                    btn.classList.add('bg-[#18db67]/10', 'border-[#18db67]', 'active');
                                } else if (selectedType === 'scenic') {
                                    btn.classList.add('bg-[#f89e21]/10', 'border-[#f89e21]', 'active');
                                    activeColorClass = 'text-[#f89e21]';
                                } else if (selectedType === 'short') {
                                    btn.classList.add('bg-[#ce60f8]/10', 'border-[#ce60f8]', 'active');
                                    activeColorClass = 'text-[#ce60f8]';
                                }

                                selectedRouteType = selectedType;

                                let theIcon = '<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>';
                                if(selectedType === 'short') {
                                    theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>`;
                                } else if (selectedType === 'scenic') {
                                    theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`;
                                }

                                // Update display text to selected route
                                document.getElementById('selected-route-display').innerHTML = `
                                    ${theIcon}
                                    <span>${displayNavText} Route</span>
                                `;

                                // Stäng hela hamburgermenyn automatiskt vid ruttval i mobil vy (Omedelbart)
                                if (window.innerWidth < 1024) {
                                    const mBtn = document.getElementById('mobile-trip-menu-btn');
                                    const mMenu = document.getElementById('mobile-trip-menu');
                                    if (mBtn && mMenu && isMobileMenuOpen) {
                                        mBtn.click();
                                    }
                                }

                                // Request new route calculation!
                                toggleLoader(true, `Calculating ${displayNavText} Route...`, selectedType);
                                try {
                                  let newRouteUrl = `?handler=CalculateRoute&start=${encodeURIComponent(currentStart)}&end=${encodeURIComponent(currentEnd)}&routeType=${selectedType}`;
                                  const routeRes = await fetch(newRouteUrl);
                                  const routeResult = await routeRes.json();
                                  if(routeResult.success) {
                                      drawRoute(routeResult.geometry);
                                      stopsLayer.clearLayers();
                                      selectedStopsLayer.clearLayers();
                                      selectedStopsArray = [];
                                      window.selectedStopsArray = selectedStopsArray;
                                      if(window.tripRequestPayloadRef) {
                                          window.tripRequestPayloadRef.SelectedStops = selectedStopsArray;
                                      }

                                      document.getElementById("display-distance").innerText = `${Math.round(routeResult.distanceKm)} km`;

                                      const durationEl = document.getElementById("display-time");
                                      if (durationEl && routeResult.durationHours) {
                                          const totalMinutes = Math.round(routeResult.durationHours * 60);
                                          const h = Math.floor(totalMinutes / 60);
                                          const m = totalMinutes % 60;
                                          durationEl.querySelector("span").innerText = `${h} h ${m} min`;
                                      }
                                  } else {
                                      console.warn("Could not calculate new route correctly.");
                                  }
                                } catch (e) {
                                  console.error("Failed to alter route type:", e);
                                } finally {
                                  toggleLoader(false);
                                }

                            });
                        });
                    }

                    // DROPDOWN LOGIC FÖR STOPS
                    const toggleStopsBtn = document.getElementById('toggle-stops-menu');
                    const stopsContainer = document.getElementById('stops-container');
                    const stopsChevron = document.getElementById('stops-chevron');
                    if(toggleStopsBtn && stopsContainer && stopsChevron) {
                        toggleStopsBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const isHidden = stopsContainer.classList.contains('hidden');
                            closeAllDropdowns(); // Stäng andra!

                            if(isHidden) {
                                stopsContainer.classList.remove('hidden');
                                stopsChevron.style.transform = "rotate(180deg)";
                            } else {
                                stopsContainer.classList.add('hidden');
                                stopsChevron.style.transform = "rotate(0deg)";
                            }
                        });

                        // Close dropdown when clicking outside
                        document.addEventListener('click', (e) => {
                           if(!toggleStopsBtn.contains(e.target) && !stopsContainer.contains(e.target) && !stopsContainer.classList.contains('hidden')) {
                               stopsContainer.classList.add('hidden');
                               stopsChevron.style.transform = "rotate(0deg)";
                           }
                        });

                        document.querySelectorAll('.fetch-stops-btn').forEach(btn => {
                            btn.addEventListener('click', () => {
                                stopsContainer.classList.add('hidden');
                                stopsChevron.style.transform = "rotate(0deg)";

                                // Update active state visually for Selected Stops (same as vehicle/route)
                                document.querySelectorAll('.fetch-stops-btn').forEach(b => {
                                    b.classList.remove('bg-[#18db67]/10', 'border-[#18db67]', 'bg-[#30e5f2]/10', 'border-[#30e5f2]', 'bg-[#f89e21]/10', 'border-[#f89e21]', 'bg-[#ce60f8]/10', 'border-[#ce60f8]', 'bg-[#4d8df5]/10', 'border-[#4d8df5]', 'bg-[#f24694]/10', 'border-[#f24694]', 'bg-[#ff4757]/10', 'border-[#ff4757]');
                                    b.classList.add('bg-muted/30', 'border-border');
                                });
                                btn.classList.remove('bg-muted/30', 'border-border');

                                const selectedType = btn.getAttribute('data-type');
                                const displayNavText = btn.querySelector('.font-medium').innerText;
                                let activeColorClass = 'text-accent'; // fallback fallback
                                let theIcon = '';

                                // Match right color and class based on chosen Type
                                if(selectedType === 'Fuel') {
                                    btn.classList.add('bg-[#18db67]/10', 'border-[#18db67]');
                                    activeColorClass = 'text-[#18db67]';
                                    theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>`;
                                } else if(selectedType === 'Charging') {
                                    btn.classList.add('bg-[#30e5f2]/10', 'border-[#30e5f2]');
                                    activeColorClass = 'text-[#30e5f2]';
                                    theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon stroke-linecap="round" stroke-linejoin="round" points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
                                } else if(selectedType === 'Restaurant') {
                                    btn.classList.add('bg-[#f89e21]/10', 'border-[#f89e21]');
                                    activeColorClass = 'text-[#f89e21]';
                                    theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path stroke-linecap="round" stroke-linejoin="round" d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`;
                                } else if(selectedType === 'Attraction') {
                                    btn.classList.add('bg-[#ce60f8]/10', 'border-[#ce60f8]');
                                    activeColorClass = 'text-[#ce60f8]';
                                    theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon stroke-linecap="round" stroke-linejoin="round" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
                                } else if(selectedType === 'Camping') {
                                    btn.classList.add('bg-[#4d8df5]/10', 'border-[#4d8df5]');
                                    activeColorClass = 'text-[#4d8df5]';
                                    theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2L2 22h20L12 2z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M12 12l-4 10"></path><path stroke-linecap="round" stroke-linejoin="round" d="M12 12l4 10"></path></svg>`;
                                } else if(selectedType === 'Lodging') {
                                    btn.classList.add('bg-[#f24694]/10', 'border-[#f24694]');
                                    activeColorClass = 'text-[#f24694]';
                                    theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"></path><polyline stroke-linecap="round" stroke-linejoin="round" points="9 22 9 12 15 12 15 22"></polyline></svg>`;
                                } else if(selectedType === 'RestArea') {
                                    btn.classList.add('bg-[#ff4757]/10', 'border-[#ff4757]');
                                    activeColorClass = 'text-[#ff4757]';
                                    theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12V6"></path><path stroke-linecap="round" stroke-linejoin="round" d="M9 12V6"></path><path stroke-linecap="round" stroke-linejoin="round" d="M4 12h16"></path><path stroke-linecap="round" stroke-linejoin="round" d="M5 12c0 3.866 3.134 7 7 7s7-3.134 7-7"></path><path stroke-linecap="round" stroke-linejoin="round" d="M12 19v3"></path><path stroke-linecap="round" stroke-linejoin="round" d="M8 22h8"></path><path stroke-linecap="round" stroke-linejoin="round" d="M12 6c-1.5 0-1.5-2-1.5-2s-1.5 2-1.5 2 1.5 2 1.5 2 1.5-2 1.5-2z"></path></svg>`;
                                }

                                // Update display text and icon
                                const titleDisplay = document.querySelector('#toggle-stops-menu .flex.items-center.gap-3');
                                if(titleDisplay) {
                                    titleDisplay.innerHTML = `
                                        ${theIcon}
                                        <span class="${activeColorClass}">${displayNavText}</span>
                                    `;
                                }

                                // Stäng hela hamburgermenyn automatiskt vid stop val i mobil vy (Omedelbart)
                                if (window.innerWidth < 1024) {
                                    const mBtnStop = document.getElementById('mobile-trip-menu-btn');
                                    const mMenuStop = document.getElementById('mobile-trip-menu');
                                    if (mBtnStop && mMenuStop && isMobileMenuOpen) {
                                        mBtnStop.click();
                                    }
                                }
                            });
                        });
                    }

                    // SPARA RESA FUNKTION
                    const saveTripBtn = document.getElementById("save-trip-btn");
                    const mobileSaveTripBtn = document.getElementById("mobile-save-trip-btn");
                    
                    const handleSaveTrip = async (btn) => {
                        if (!btn) return;
                        const originalHtml = btn.innerHTML;
                        btn.innerHTML = '<span class="font-bold">SAVING...</span>';
                        btn.disabled = true;

                        try {
                            const res = await fetch('?handler=SaveTrip', {
                                method: 'POST',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'RequestVerificationToken': antiForgeryToken
                                },
                                body: JSON.stringify(tripRequestPayload)
                            });

                            const svResult = await res.json();
                            if(svResult.success) {
                                btn.innerHTML = '<span class="font-bold">SAVED ✓</span>';
                                btn.classList.replace("border-primary", "bg-primary");
                                btn.classList.replace("text-primary", "text-[#0f1219]");
                            } else {
                                if(svResult.message == "Not authenticated") {
                                    alert("You must be logged in to save trips!");
                                }
                                btn.innerHTML = '<span class="font-bold">FAILED!</span>';
                                setTimeout(() => {
                                    btn.innerHTML = originalHtml;
                                    btn.disabled = false;
                                }, 2000);
                            }
                        } catch(err) {
                            console.error(err);
                            btn.innerHTML = '<span class="font-bold">ERROR</span>';
                            setTimeout(() => {
                                    btn.innerHTML = originalHtml;
                                    btn.disabled = false;
                                }, 2000);
                        }
                    };

                    if (saveTripBtn) saveTripBtn.addEventListener('click', () => handleSaveTrip(saveTripBtn));
                    if (mobileSaveTripBtn) mobileSaveTripBtn.addEventListener('click', () => handleSaveTrip(mobileSaveTripBtn));

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
                    const res = await fetch(`?handler=FetchStops&start=${encodeURIComponent(currentStart)}&end=${encodeURIComponent(currentEnd)}&type=${type}&routeType=${selectedRouteType}`);
                    const result = await res.json();
                    stopsLayer.clearLayers();
                    if (result.success && result.stops) {
                        const targetColor = themeColors[type] || themeColors['Default'];

                        result.stops.forEach(s => {
                            // Skapa en visuell snygg cirkel anpassad efter vald färg
                            let isSelected = selectedStopsArray.some(x => x.Latitude === s.latitude && x.Longitude === s.longitude);
                            let btnText = isSelected ? "Remove from Trip" : "Add to Trip";
                            let btnColor = isSelected ? "#ff4757" : targetColor;
                            let btnTextColor = isSelected ? "#fff" : "#000";

                            let marker = L.circleMarker([s.latitude, s.longitude], {
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
                                    <strong style="color:${targetColor}">${s.name}</strong><br>
                                    <button class="add-stop-btn" style="margin-top:5px; padding:3px 8px; background-color:${btnColor}; color:${btnTextColor}; border:none; border-radius:4px; font-weight:bold; cursor:pointer;" data-name="${s.name}" data-lat="${s.latitude}" data-lng="${s.longitude}" data-type="${type}">${btnText}</button>
                                </div>
                            `);
                        });
                    }
                } catch(err) { console.error(err); } finally { toggleLoader(false); }
            });
        });
    }

    // Lyssna på klick för "Add to Trip" och "Remove from Trip" i popups
    document.addEventListener('click', function(e) {
        if(e.target && e.target.classList.contains('add-stop-btn')) {
            const btn = e.target;
            const name = btn.getAttribute('data-name');
            const lat = parseFloat(btn.getAttribute('data-lat'));
            const lng = parseFloat(btn.getAttribute('data-lng'));
            const type = btn.getAttribute('data-type');

            // Check if it already exists
            const existingIndex = selectedStopsArray.findIndex(s => s.Latitude === lat && s.Longitude === lng);
            if (existingIndex > -1) {
                // Remove logic
                selectedStopsArray.splice(existingIndex, 1);

                // Re-draw selected stops
                redrawSelectedStops();

                // Update popup to show Add
                const targetColor = themeColors[type] || themeColors['Default'];
                const parentDiv = btn.parentElement;
                if(parentDiv) {
                    parentDiv.innerHTML = `
                        <strong style="color:${targetColor}">${name}</strong><br>
                        <button class="add-stop-btn" style="margin-top:5px; padding:3px 8px; background-color:${targetColor}; color:#000; border:none; border-radius:4px; font-weight:bold; cursor:pointer;" data-name="${name}" data-lat="${lat}" data-lng="${lng}" data-type="${type}">Add to Trip</button>
                    `;
                }

            } else {
                // Add logic
                selectedStopsArray.push({
                    Name: name,
                    Latitude: lat,
                    Longitude: lng,
                    Type: type
                });

                redrawSelectedStops();

                // Update popup to show Remove
                const targetColor = themeColors[type] || themeColors['Default'];
                const parentDiv = btn.parentElement;
                if(parentDiv) {
                    parentDiv.innerHTML = `
                        <strong style="color:${targetColor}">${name}</strong><br>
                        <button class="add-stop-btn" style="margin-top:5px; padding:3px 8px; background-color:#ff4757; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;" data-name="${name}" data-lat="${lat}" data-lng="${lng}" data-type="${type}">Remove from Trip</button>
                    `;
                }
            }

            // Uppdatera request payload med nya listan
            if(window.tripRequestPayloadRef) {
                window.tripRequestPayloadRef.SelectedStops = selectedStopsArray;
            }
        }
    });

    function redrawSelectedStops() {
        selectedStopsLayer.clearLayers();
        selectedStopsArray.forEach(stop => {
            const targetColor = themeColors[stop.Type] || themeColors['Default'];
            L.circleMarker([stop.Latitude, stop.Longitude], {
                radius: 10,
                color: '#ffffff',
                fillColor: targetColor,
                fillOpacity: 1,
                weight: 3,
                opacity: 1
            }).addTo(selectedStopsLayer).bindPopup(`
                <div style="text-align:center;">
                    <strong style="color:${targetColor}">${stop.Name}</strong><br>
                    <button class="add-stop-btn" style="margin-top:5px; padding:3px 8px; background-color:#ff4757; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;" data-name="${stop.Name}" data-lat="${stop.Latitude}" data-lng="${stop.Longitude}" data-type="${stop.Type}">Remove from Trip</button>
                </div>
            `);
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