document.addEventListener("DOMContentLoaded", function () {
    const brandIn = document.getElementById('api-brand-search');
    const modelSel = document.getElementById('api-model-select');
    const yearIn = document.getElementById('api-year-search');
    const nicknameIn = document.getElementById('res-nickname');
    const datalist = document.getElementById('brand-options');

    let vehicleDb = null;

    const vehicleTypeMap = {
        "OrdinaryCar": "0",
        "ElectricCar": "1",
        "Motorhome": "2",
        "Caravan": "3"
    };

    // 1. Ladda databasen
    async function loadLocalDatabase() {
        try {
            const response = await fetch('/data/vehicleDb.json');
            if (!response.ok) throw new Error("Network response was not ok");
            vehicleDb = await response.json();
            console.log("ZipTrip Vehicle Database Loaded!");
            populateBrandSuggestions();
        } catch (error) {
            console.error("Error loading database:", error);
        }
    }

    loadLocalDatabase();

    function populateBrandSuggestions() {
        if (!datalist || !vehicleDb) return;
        datalist.innerHTML = '';
        const sortedBrands = [...vehicleDb.brands].sort((a, b) => a.name.localeCompare(b.name));
        sortedBrands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand.name;
            datalist.appendChild(option);
        });
    }

    // 2. Hantera märke (Lås upp modeller)
    if (brandIn && modelSel) {
        ['input', 'change'].forEach(evt => {
            brandIn.addEventListener(evt, function () {
                if (!vehicleDb) return;
                const make = brandIn.value.trim().toLowerCase();
                const brandData = vehicleDb.brands.find(b => b.name.toLowerCase() === make);

                modelSel.innerHTML = '<option value="">Select Model</option>';

                if (brandData) {
                    brandData.models.sort((a, b) => a.name.localeCompare(b.name)).forEach(m => {
                        const opt = document.createElement('option');
                        opt.value = m.name;
                        opt.text = m.name;
                        modelSel.appendChild(opt);
                    });
                    modelSel.disabled = false;
                } else {
                    modelSel.disabled = true;
                }
                syncHiddenFields();
            });
        });

        // 3. Hantera modell (Sätt specs och ÅRS-SPÄRRAR)
        modelSel.addEventListener('change', () => {
            if (!vehicleDb) return;

            const make = brandIn.value.trim().toLowerCase();
            const modelName = modelSel.value;
            const brandData = vehicleDb.brands.find(b => b.name.toLowerCase() === make);
            if (!brandData) return;

            const modelData = brandData.models.find(m => m.name === modelName);
            if (!modelData) return;

            // --- HÄR ÄR FIXEN FÖR ÅRTALEN ---
            const currentYear = new Date().getFullYear();
            const startYear = modelData.startYear || 1950;
            const endYear = modelData.endYear || currentYear;

            if (yearIn) {
                yearIn.min = startYear;
                yearIn.max = endYear;

                // Om nuvarande år i fältet är utanför modellens levnadstid, tvinga in det
                let currentVal = parseInt(yearIn.value);
                if (isNaN(currentVal) || currentVal < startYear) {
                    yearIn.value = startYear;
                } else if (currentVal > endYear) {
                    yearIn.value = endYear;
                }
            }

            // Fyll i specifikationer
            document.getElementById('res-height').value = modelData.height || "1.50";
            document.getElementById('res-weight').value = modelData.weight || "1500";
            document.getElementById('res-range').value = modelData.range || "0";

            const resType = document.getElementById('res-type');
            if (resType && brandData.type) {
                resType.value = vehicleTypeMap[brandData.type] || "0";
            }

            syncHiddenFields();
        });
    }

    // 4. Hantera manuell ändring av år (Håll det inom spärrarna)
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

    function syncHiddenFields() {
        const make = brandIn ? brandIn.value.trim() : "";
        const model = modelSel ? modelSel.value.trim() : "";
        const year = yearIn ? yearIn.value : "";

        const hBrand = document.getElementById('hidden-brand');
        const hModel = document.getElementById('hidden-model');
        const hYear = document.getElementById('hidden-year');

        if (hBrand) hBrand.value = make;
        if (hModel) hModel.value = model;
        if (hYear) hYear.value = year;

        if (nicknameIn && make && model) {
            nicknameIn.value = `${make} ${model} (${year})`;
        }
    }
});