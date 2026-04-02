document.addEventListener("DOMContentLoaded", function () {
    const brandIn = document.getElementById('api-brand-search');
    const modelSel = document.getElementById('api-model-select');
    const yearIn = document.getElementById('api-year-search');
    const nicknameIn = document.getElementById('res-nickname');

    let vehicleDb = null;

    // --- NYTT: Denna måste finnas för att koppla JSON-text till C#-siffror ---
    const vehicleTypeMap = {
        "OrdinaryCar": "0",
        "ElectricCar": "1",
        "Motorhome": "2",
        "Caravan": "3"
    };

    // 1. Ladda din lokala databas
    async function loadLocalDatabase() {
        try {
            const response = await fetch('/data/vehicleDb.json');
            if (!response.ok) throw new Error("Network response was not ok");
            vehicleDb = await response.json();
            console.log("ZipTrip Vehicle Database Loaded Successfully!");
        } catch (error) {
            console.error("Error loading local vehicle database:", error);
            if (modelSel) modelSel.innerHTML = '<option>Error loading database</option>';
        }
    }

    loadLocalDatabase();

    function resetSpecs() {
        const fields = ['res-height', 'res-weight', 'res-range'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = (id === 'res-height') ? "1.50" : "0";
        });

        const resType = document.getElementById('res-type');
        if (resType) resType.selectedIndex = 0;

        if (yearIn) {
            yearIn.min = 1950;
            yearIn.max = new Date().getFullYear();
        }
    }

    if (brandIn && modelSel) {
        brandIn.addEventListener('input', () => {
            if (!vehicleDb) return;

            const make = brandIn.value.trim().toLowerCase();
            const brandData = vehicleDb.brands.find(b => b.name.toLowerCase() === make);

            modelSel.innerHTML = '<option value="">Select Model</option>';
            resetSpecs();

            if (brandData) {
                brandData.models.sort((a, b) => a.name.localeCompare(b.name)).forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.name;
                    opt.text = m.name;
                    modelSel.appendChild(opt);
                });
                modelSel.disabled = false;
            } else {
                modelSel.innerHTML = '<option value="">Brand not found</option>';
                modelSel.disabled = true;
            }
        });

        modelSel.addEventListener('change', () => {
            if (!vehicleDb) return;

            const make = brandIn.value.trim().toLowerCase();
            const modelName = modelSel.value;

            const brandData = vehicleDb.brands.find(b => b.name.toLowerCase() === make);
            if (!brandData) return;

            const modelData = brandData.models.find(m => m.name === modelName);
            if (!modelData) return;

            // --- A. SPÄRRA ÅRTALEN ---
            const currentYear = new Date().getFullYear();
            const endYear = modelData.endYear || currentYear;

            if (yearIn) {
                yearIn.min = modelData.startYear;
                yearIn.max = endYear;

                let selectedYear = parseInt(yearIn.value);
                if (isNaN(selectedYear) || selectedYear < modelData.startYear) {
                    yearIn.value = modelData.startYear;
                } else if (selectedYear > endYear) {
                    yearIn.value = endYear;
                }
            }

            // --- B. FYLL I STATS ---
            const resHeight = document.getElementById('res-height');
            const resWeight = document.getElementById('res-weight');
            const resRange = document.getElementById('res-range');
            const resType = document.getElementById('res-type');

            if (resHeight) resHeight.value = modelData.height;
            if (resWeight) resWeight.value = modelData.weight;
            if (resRange) resRange.value = modelData.range;

            // --- C. SMART TYPE SELECTOR (Nu via value/siffra) ---
            if (resType && brandData.type) {
                const targetValue = vehicleTypeMap[brandData.type];
                if (targetValue !== undefined) {
                    resType.value = targetValue;
                }
            }

            syncHiddenFields();
        });

        if (yearIn) {
            yearIn.addEventListener('input', function () {
                const min = parseInt(this.min);
                const max = parseInt(this.max);
                let val = parseInt(this.value);

                if (val < min) this.value = min;
                if (val > max) this.value = max;

                syncHiddenFields();
            });
        }
    }

    function syncHiddenFields() {
        const make = brandIn ? brandIn.value.trim() : "";
        const model = modelSel ? modelSel.value.trim() : "";
        const year = yearIn ? yearIn.value : "";

        const hiddenBrand = document.getElementById('hidden-brand');
        const hiddenModel = document.getElementById('hidden-model');
        const hiddenYear = document.getElementById('hidden-year');

        if (hiddenBrand) hiddenBrand.value = make;
        if (hiddenModel) hiddenModel.value = model;
        if (hiddenYear) hiddenYear.value = year;

        if (nicknameIn && make && model) {
            nicknameIn.value = `${make} ${model} (${year})`;
        }
    }
});