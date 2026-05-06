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
            }).addTo(selectedStopsLayer).bindPopup(`
                <div style="text-align:center;">
                    <strong style="color:${targetColor}">${s.Name}</strong><br>
                    <button class="add-stop-btn" style="margin-top:5px; padding:3px 8px; background-color:#ff4757; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;" data-name="${s.Name}" data-lat="${s.Latitude}" data-lng="${s.Longitude}" data-type="${s.Type}">Remove from Trip</button>
                </div>
            `);
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

    function closeAllDropdowns() {
        const containers = [
            { c: document.getElementById('routes-container'), i: document.getElementById('routes-chevron') },
            { c: document.getElementById('stops-container'), i: document.getElementById('stops-chevron') },
            { c: document.getElementById('vehicle-container'), i: document.getElementById('vehicle-chevron') }
        ];

        containers.forEach(x => {
            if (x.c && !x.c.classList.contains('hidden')) {
                x.c.classList.add('hidden');
                if (x.i) x.i.style.transform = "rotate(0deg)";
            }
        });
    }

    // DROPDOWN LOGIC FÖR VEHICLES
    const toggleVehicleBtn = document.getElementById('toggle-vehicle-menu');
    const vehicleContainer = document.getElementById('vehicle-container');
    const vehicleChevron = document.getElementById('vehicle-chevron');
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

        // Hantera val av fordon
        document.querySelectorAll('.vehicle-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Stäng dropdown
                vehicleContainer.classList.add('hidden');
                vehicleChevron.style.transform = "rotate(0deg)";

                // Uppdatera visuell feedback på knappen
                document.querySelectorAll('.vehicle-type-btn').forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');

                // Hämta vald data
                let selectedId = btn.getAttribute('data-id');
                let selectedVal = btn.getAttribute('data-val');
                let vehicleName = btn.querySelector('.font-medium').innerText;

                // Uppdatera dold input (om det fanns en för sparande)
                // document.getElementById('selected-vehicle-id').value = selectedId || '';
                // document.getElementById('selected-vehicle-type').value = selectedVal || '';

                // Klona SVG och sätt text
                const svgClone = btn.querySelector('svg').cloneNode(true);
                svgClone.className = btn.querySelector('.w-8').className.replace('w-8 h-8 rounded-md bg-card flex items-center justify-center', 'w-5 h-5').replace('group-hover:scale-110 transition-transform shadow-[0_0_10px_currentColor] shrink-0', '').trim();
                
                const selectedVehicleDisplay = document.getElementById('selected-vehicle-display');
                if(selectedVehicleDisplay) {
                    selectedVehicleDisplay.innerHTML = '';
                    selectedVehicleDisplay.appendChild(svgClone);
                    const span = document.createElement('span');
                    span.innerText = vehicleName;
                    selectedVehicleDisplay.appendChild(span);
                }
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

        // Event listeners for route option buttons
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

                window.selectedRouteType = selectedType;

                let theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`;
                if(selectedType === 'short') {
                    theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>`;
                } else if (selectedType === 'scenic') {
                    theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`;
                }

                // Update display text to selected route
                const selectedRouteDisplay = document.getElementById('selected-route-display');
                if (selectedRouteDisplay) {
                    selectedRouteDisplay.innerHTML = `
                        ${theIcon}
                        <span>${displayNavText} Route</span>
                    `;
                }

                // Request new route calculation!
                toggleLoader(true, `Calculating ${displayNavText} Route...`, selectedType);
                try {
                  let newRouteUrl = `?handler=CalculateRoute&start=${encodeURIComponent(startLoc)}&end=${encodeURIComponent(endLoc)}&routeType=${selectedType}`;
                  const routeRes = await fetch(newRouteUrl);
                  const routeResult = await routeRes.json();
                  if(routeResult.success) {

                      // Rensa gamla stops och the route
                      stopsLayer.clearLayers();
                      selectedStopsArray = []; // Empty out stops since the route essentially changed
                      routeLayer.clearLayers();

                      // Rensa selectedStopsLayer om den finns globalt
                      if (window.selectedStopsLayer) {
                          window.selectedStopsLayer.clearLayers();
                      }

                      renderSavedStopsMapOnly();
                      showUnsavedChangesMarker();
                      if(typeof renderSavedStops === 'function') renderSavedStops();

                      const latLngs = routeResult.geometry.map(p => [p.latitude, p.longitude]);
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

                      L.marker(latLngs[0], { icon: startIcon }).addTo(routeLayer).bindPopup("<b>START:</b> " + startLoc);
                      L.marker(latLngs[latLngs.length - 1], { icon: endIcon }).addTo(routeLayer).bindPopup("<b>DESTINATION:</b> " + endLoc);

                      map.fitBounds(L.polyline(latLngs).getBounds(), { padding: [50, 50] });

                      document.getElementById("display-distance").innerHTML = `${Math.round(routeResult.distanceKm)} km &bull; Est: <span>${Math.floor(routeResult.durationHours)}h ${Math.round((routeResult.durationHours * 60) % 60)}m</span>`;
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

    // Måste kopplas på "Stops Dropdown" som är kopierad från create
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
    }

    // Mobile Trip Menu Logic
    const mobileTripMenuBtn = document.getElementById('mobile-trip-menu-btn');
    const mobileTripMenu = document.getElementById('mobile-trip-menu');
    const closeMobileTripMenu = document.getElementById('close-mobile-trip-menu');
    const tripOptionsContainer = document.getElementById('trip-options-container');
    const mobileMenuContent = mobileTripMenu ? mobileTripMenu.querySelector('.overflow-y-auto') : null;
    let isMobileMenuOpen = false;

    if (mobileTripMenuBtn && mobileTripMenu && closeMobileTripMenu && tripOptionsContainer && mobileMenuContent) {
        const toggleMobileTripMenu = () => {
            isMobileMenuOpen = !isMobileMenuOpen;
            if (isMobileMenuOpen) {
                // Move options to mobile menu
                mobileMenuContent.appendChild(tripOptionsContainer);
                tripOptionsContainer.classList.remove('hidden', 'lg:flex');
                tripOptionsContainer.classList.add('flex');
                
                mobileTripMenu.classList.remove('hidden');
                // Trigger reflow
                void mobileTripMenu.offsetWidth;
                mobileTripMenu.classList.remove('translate-x-full');
                document.body.style.overflow = 'hidden';
            } else {
                mobileTripMenu.classList.add('translate-x-full');
                setTimeout(() => {
                    mobileTripMenu.classList.add('hidden');
                    // Move options back to original place
                    document.getElementById('details-menu').insertBefore(tripOptionsContainer, document.getElementById('mobile-trip-menu'));
                    tripOptionsContainer.classList.add('hidden', 'lg:flex');
                    tripOptionsContainer.classList.remove('flex');
                }, 300);
                document.body.style.overflow = '';
            }
        };

        mobileTripMenuBtn.addEventListener('click', toggleMobileTripMenu);
        closeMobileTripMenu.addEventListener('click', toggleMobileTripMenu);
        
        // Link mobile buttons to desktop buttons
        const mobileSaveBtn = document.getElementById('mobile-save-trip-btn');
        const desktopSaveBtn = document.getElementById('save-trip-btn');
        if (mobileSaveBtn && desktopSaveBtn) {
            mobileSaveBtn.addEventListener('click', () => {
                desktopSaveBtn.click();
            });
        }
        
        const mobileStartBtn = document.getElementById('mobile-start-gps-btn');
        const desktopStartBtn = document.getElementById('start-gps-btn');
        if (mobileStartBtn && desktopStartBtn) {
            mobileStartBtn.addEventListener('click', () => {
                desktopStartBtn.click();
            });
        }
    }

    // 3. Hantera knapptryckningarna för att hämta stopp
    document.querySelectorAll('.fetch-stops-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            // Update active state visually on stops (same as create)
            document.querySelectorAll('.fetch-stops-btn').forEach(b => {
                b.classList.remove('bg-[#18db67]/10', 'border-[#18db67]', 'bg-[#30e5f2]/10', 'border-[#30e5f2]', 'bg-[#f89e21]/10', 'border-[#f89e21]', 'bg-[#ce60f8]/10', 'border-[#ce60f8]', 'bg-[#4d8df5]/10', 'border-[#4d8df5]', 'bg-[#f24694]/10', 'border-[#f24694]', 'bg-[#ff4757]/10', 'border-[#ff4757]');
                b.classList.add('bg-muted/30', 'border-border');
            });
            btn.classList.remove('bg-muted/30', 'border-border');

            const type = this.getAttribute('data-type');

            // Match right color and class based on chosen Type to highlight the main accordion button
            let displayNavText = "";
            const textElem = btn.querySelector('.font-medium');
            if(textElem) displayNavText = textElem.innerText;

            let activeColorClass = 'text-accent'; // fallback fallback
            let theIcon = '';

            if(type === 'Fuel') {
                btn.classList.add('bg-[#18db67]/10', 'border-[#18db67]');
                activeColorClass = 'text-[#18db67]';
                theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>`;
            } else if(type === 'Charging') {
                btn.classList.add('bg-[#30e5f2]/10', 'border-[#30e5f2]');
                activeColorClass = 'text-[#30e5f2]';
                theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon stroke-linecap="round" stroke-linejoin="round" points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
            } else if(type === 'Restaurant') {
                btn.classList.add('bg-[#f89e21]/10', 'border-[#f89e21]');
                activeColorClass = 'text-[#f89e21]';
                theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path stroke-linecap="round" stroke-linejoin="round" d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`;
            } else if(type === 'Attraction') {
                btn.classList.add('bg-[#ce60f8]/10', 'border-[#ce60f8]');
                activeColorClass = 'text-[#ce60f8]';
                theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon stroke-linecap="round" stroke-linejoin="round" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
            } else if(type === 'Camping') {
                btn.classList.add('bg-[#4d8df5]/10', 'border-[#4d8df5]');
                activeColorClass = 'text-[#4d8df5]';
                theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2L2 22h20L12 2z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M12 12l-4 10"></path><path stroke-linecap="round" stroke-linejoin="round" d="M12 12l4 10"></path></svg>`;
            } else if(type === 'Lodging') {
                btn.classList.add('bg-[#f24694]/10', 'border-[#f24694]');
                activeColorClass = 'text-[#f24694]';
                theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline stroke-linecap="round" stroke-linejoin="round" points="9 22 9 12 15 12 15 22"></polyline></svg>`;
            } else if(type === 'RestArea') {
                btn.classList.add('bg-[#ff4757]/10', 'border-[#ff4757]');
                activeColorClass = 'text-[#ff4757]';
                theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12V6"></path><path stroke-linecap="round" stroke-linejoin="round" d="M9 12V6"></path><path stroke-linecap="round" stroke-linejoin="round" d="M4 12h16"></path><path stroke-linecap="round" stroke-linejoin="round" d="M5 12c0 3.866 3.134 7 7 7s7-3.134 7-7"></path><path stroke-linecap="round" stroke-linejoin="round" d="M12 19v3"></path><path stroke-linecap="round" stroke-linejoin="round" d="M8 22h8"></path><path stroke-linecap="round" stroke-linejoin="round" d="M12 6c-1.5 0-1.5-2-1.5-2s-1.5 2-1.5 2 1.5 2 1.5 2 1.5-2 1.5-2z"></path></svg>`;
            }

            // Update main selection display
            const titleDisplay = document.querySelector('#toggle-stops-menu .flex.items-center.gap-3');
            if(titleDisplay) {
                titleDisplay.innerHTML = `
                    ${theIcon}
                    <span class="${activeColorClass}">${displayNavText}</span>
                `;
            }

            // Close dropdown if open
            if(stopsContainer) stopsContainer.classList.add('hidden');
            if(stopsChevron) stopsChevron.style.transform = "rotate(0deg)";

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
                        // Skapa en visuell snygg cirkel anpassad efter vald färg
                        let isSelected = selectedStopsArray.some(x => x.Latitude === s.latitude && x.Longitude === s.longitude);
                        let btnText = isSelected ? "Remove from Trip" : "Add to Trip";
                        let btnColor = isSelected ? "#ff4757" : targetColor;
                        let btnTextColor = isSelected ? "#fff" : "#000";

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
                                <button class="add-stop-btn" style="margin-top:5px; padding:3px 8px; background-color:${btnColor}; color:${btnTextColor}; border:none; border-radius:4px; font-weight:bold; cursor:pointer;" data-name="${s.name}" data-lat="${s.latitude}" data-lng="${s.longitude}" data-type="${type}">${btnText}</button>
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

    // Lyssna på klick för "Add to Trip" och "Remove from Trip" i popups
    document.addEventListener('click', function(e) {
        if(e.target && e.target.classList.contains('add-stop-btn')) {
            const btn = e.target;
            const name = btn.getAttribute('data-name');
            const lat = parseFloat(btn.getAttribute('data-lat'));
            const lng = parseFloat(btn.getAttribute('data-lng'));
            const type = btn.getAttribute('data-type');

            // Find if it already exists
            const existingIndex = selectedStopsArray.findIndex(s => s.Latitude === lat && s.Longitude === lng);

            if(existingIndex > -1) {
                // Ta bort stoppet
                selectedStopsArray.splice(existingIndex, 1);

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
                // Spara i arrayen
                selectedStopsArray.push({
                    Name: name,
                    Latitude: lat,
                    Longitude: lng,
                    Type: type
                });

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

            // Stäng popup om vi vill, men det är trevligare om den ändras på plats
            // map.closePopup(); 

            // Trigger show undo button/enable save and update map logic!
            showUnsavedChangesMarker();
            renderSavedStopsMapOnly();

            // Uppdatera listan under "Saved Stops" i menyn via en (påhittad eller befintlig) funktion
            // renderSavedStops(); 
            // Denna funktion brukar köras vi inladdning i details men du verkar dra den live också

            if(typeof renderSavedStops === 'function') {
               renderSavedStops();
            }
        }
    });

    let originalSavedStops = JSON.parse(JSON.stringify(selectedStopsArray)); // Deep copy to undo
    let originalRouteType = window.selectedRouteType || 'fastest'; // To undo route
    const undoBtn = document.getElementById('undo-changes-btn');
    const backToGarageBtn = document.getElementById('back-to-garage-btn');

    function showUnsavedChangesMarker() {
        if(updateBtn) {
            updateBtn.disabled = false;
            updateBtn.innerHTML = `
                <svg class="w-5 h-5 shrink-0 text-[#0f1219]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                <span class="hidden lg:inline truncate">SAVE CHANGES</span>
            `;
        }
        if(undoBtn) {
            // Gör grå-text knappen klickbar och byt hover till highlight
            undoBtn.disabled = false;
            undoBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'text-muted-foreground');
            undoBtn.classList.add('text-[#f89e21]', 'hover:text-white', 'cursor-pointer');
        }
        if(backToGarageBtn) {
            // Byt färg på Back to Garage till orange varning att unsaved ändringar finns om man drar utan att spara
            backToGarageBtn.classList.remove('text-accent');
            backToGarageBtn.classList.add('text-[#f89e21]'); 
        }
    }

    if(undoBtn) {
        undoBtn.addEventListener('click', async () => {
            // Restore array and route typ
            selectedStopsArray = JSON.parse(JSON.stringify(originalSavedStops));

            // Check if route type needs fixing
            if(window.selectedRouteType !== originalRouteType) {
                window.selectedRouteType = originalRouteType;

                // Update dropdown UI to match
                document.querySelectorAll('.route-type-btn').forEach(b => {
                    b.classList.remove('bg-[#18db67]/10', 'border-[#18db67]', 'bg-[#f89e21]/10', 'border-[#f89e21]', 'bg-[#ce60f8]/10', 'border-[#ce60f8]', 'active');
                    b.classList.add('bg-muted/30', 'border-border');
                    if(b.getAttribute('data-type') === originalRouteType) {
                        b.classList.remove('bg-muted/30', 'border-border');

                        let activeColorClass = 'text-[#18db67]';
                        if (originalRouteType === 'fastest') {
                            b.classList.add('bg-[#18db67]/10', 'border-[#18db67]', 'active');
                        } else if (originalRouteType === 'scenic') {
                            b.classList.add('bg-[#f89e21]/10', 'border-[#f89e21]', 'active');
                            activeColorClass = 'text-[#f89e21]';
                        } else if (originalRouteType === 'short') {
                            b.classList.add('bg-[#ce60f8]/10', 'border-[#ce60f8]', 'active');
                            activeColorClass = 'text-[#ce60f8]';
                        }

                        const displayNavText = b.querySelector('.font-bold') ? b.querySelector('.font-bold').innerText : b.querySelector('.font-medium').innerText;

                        let theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`;
                        if(originalRouteType === 'short') {
                            theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>`;
                        } else if (originalRouteType === 'scenic') {
                            theIcon = `<svg class="w-5 h-5 ${activeColorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`;
                        }

                        const selectedRouteDisplay = document.getElementById('selected-route-display');
                        if (selectedRouteDisplay) {
                            selectedRouteDisplay.innerHTML = `
                                ${theIcon}
                                <span>${displayNavText} Route</span>
                            `;
                        }
                    }
                });

                // Fetch Original Route (re-calculate on map)
                toggleLoader(true, `Restoring Original Route...`, originalRouteType);
                try {
                  let newRouteUrl = `?handler=CalculateRoute&start=${encodeURIComponent(startLoc)}&end=${encodeURIComponent(endLoc)}&routeType=${originalRouteType}`;
                  const routeRes = await fetch(newRouteUrl);
                  const routeResult = await routeRes.json();
                  if(routeResult.success) {
                      routeLayer.clearLayers();

                      const latLngs = routeResult.geometry.map(p => [p.latitude, p.longitude]);
                      L.polyline(latLngs, { color: '#18db67', weight: 6 }).addTo(routeLayer);

                      const startIcon = L.divIcon({
                            className: 'bg-transparent border-0',
                            html: `<div style="color:#3b82f6; filter:drop-shadow(0 0 8px rgba(59,130,246,0.8));"><svg width="28" height="28" viewBox="0 0 24 24" fill="#0f1219" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4" fill="currentColor"></circle></div>`,
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

                      L.marker(latLngs[0], { icon: startIcon }).addTo(routeLayer).bindPopup("<b>START:</b> " + startLoc);
                      L.marker(latLngs[latLngs.length - 1], { icon: endIcon }).addTo(routeLayer).bindPopup("<b>DESTINATION:</b> " + endLoc);

                      map.fitBounds(L.polyline(latLngs).getBounds(), { padding: [50, 50] });
                      document.getElementById("display-distance").innerHTML = `${Math.round(routeResult.distanceKm)} km &bull; Est: <span>${Math.floor(routeResult.durationHours)}h ${Math.round((routeResult.durationHours * 60) % 60)}m</span>`;
                  }
                } catch(e) { console.error(e); } finally { toggleLoader(false); }
            }

            // Rensa de vanliga stopsen så att om användaren tryckte på find stops under redigeringen försvinner de gröna cirklarna
            if(stopsLayer) stopsLayer.clearLayers();

            // Re-render sparade
            renderSavedStopsMapOnly();
            if(typeof renderSavedStops === 'function') renderSavedStops();

            // Reset UI
            undoBtn.disabled = true;
            undoBtn.classList.remove('text-[#f89e21]', 'hover:text-white', 'cursor-pointer');
            undoBtn.classList.add('opacity-50', 'cursor-not-allowed', 'text-muted-foreground');

            if(backToGarageBtn) {
                backToGarageBtn.classList.remove('text-[#f89e21]');
                backToGarageBtn.classList.add('text-accent');
            }
            if(updateBtn) {
                updateBtn.disabled = true;
                updateBtn.innerHTML = `
                    <svg class="w-5 h-5 shrink-0 text-[#0f1219]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    <span class="hidden lg:inline truncate">SAVED ✓</span>
                `;
            }
        });
    }

    function renderSavedStopsMapOnly() {
        if(!window.selectedStopsLayer) return;
        window.selectedStopsLayer.clearLayers();
        selectedStopsArray.forEach(stop => {
            const targetColor = themeColors[stop.Type] || themeColors['Default'];
            L.circleMarker([stop.Latitude, stop.Longitude], {
                radius: 10,
                color: '#ffffff',
                fillColor: targetColor,
                fillOpacity: 1,
                weight: 3,
                opacity: 1
            }).addTo(window.selectedStopsLayer).bindPopup(`
                <div style="text-align:center;">
                    <strong style="color:${targetColor}">${stop.Name}</strong><br>
                    <button class="add-stop-btn" style="margin-top:5px; padding:3px 8px; background-color:#ff4757; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;" data-name="${stop.Name}" data-lat="${stop.Latitude}" data-lng="${stop.Longitude}" data-type="${stop.Type}">Remove from Trip</button>
                </div>
            `);
        });
    }

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
                Title: document.getElementById('display-title')?.innerText || "Trip",
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
                    originalSavedStops = JSON.parse(JSON.stringify(selectedStopsArray)); // update original array on save
                    updateBtn.innerHTML = `
                        <svg class="w-5 h-5 shrink-0 text-[#0f1219]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        <span class="hidden lg:inline truncate">SAVED ✓</span>
                    `;
                    updateBtn.disabled = true;
                    if (undoBtn) {
                        undoBtn.disabled = true;
                        undoBtn.classList.remove('text-[#f89e21]', 'hover:text-white', 'cursor-pointer');
                        undoBtn.classList.add('opacity-50', 'cursor-not-allowed', 'text-muted-foreground');
                    }
                    if (backToGarageBtn) {
                        backToGarageBtn.classList.remove('text-[#f89e21]');
                        backToGarageBtn.classList.add('text-accent');
                    }
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