document.addEventListener("DOMContentLoaded", function () {
    const brandIn = document.getElementById('api-brand-search');
    const modelSel = document.getElementById('api-model-select');
    const nicknameIn = document.getElementById('res-nickname');

    if (brandIn && modelSel) {
        // 1. Fetch models from NHTSA API when brand changes
        brandIn.addEventListener('change', async () => {
            const make = brandIn.value.trim();
            if (make.length < 2) return;

            modelSel.innerHTML = '<option>Loading models...</option>';
            modelSel.disabled = true;

            try {
                const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${make}?format=json`);
                const data = await response.json();

                modelSel.innerHTML = '<option value="">Select Model</option>';
                data.Results.sort((a, b) => a.Model_Name.localeCompare(b.Model_Name)).forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.Model_Name;
                    opt.text = m.Model_Name;
                    modelSel.appendChild(opt);
                });
                modelSel.disabled = false;
            } catch (e) {
                console.error("Vehicle API Error:", e);
                modelSel.innerHTML = '<option>Error loading database</option>';
            }
        });

        // 2. Auto-fill specs when model is selected
        modelSel.addEventListener('change', () => {
            const make = brandIn.value;
            const model = modelSel.value;

            // Set hidden values for the backend
            const hiddenBrand = document.getElementById('hidden-brand');
            const hiddenModel = document.getElementById('hidden-model');

            if (hiddenBrand) hiddenBrand.value = make;
            if (hiddenModel) hiddenModel.value = model;
            if (nicknameIn) nicknameIn.value = `${make} ${model}`;

            // Smart Auto-filler logic
            const modelLower = model.toLowerCase();
            const resHeight = document.getElementById('res-height');
            const resWeight = document.getElementById('res-weight');
            const resRange = document.getElementById('res-range');
            const resType = document.getElementById('res-type');

            if (modelLower.includes("model 3") || modelLower.includes("model y")) {
                if (resHeight) resHeight.value = 1.44;
                if (resWeight) resWeight.value = 1847;
                if (resRange) resRange.value = 491;
                if (resType) resType.value = "1"; // ElectricCar
            } else if (modelLower.includes("xc90")) {
                if (resHeight) resHeight.value = 1.77;
                if (resWeight) resWeight.value = 2100;
                if (resType) resType.value = "0"; // OrdinaryCar
            }
        });
    }
});