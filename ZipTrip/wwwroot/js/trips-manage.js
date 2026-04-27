document.addEventListener('DOMContentLoaded', function () {
    let debounceTimer;
    const searchInput = document.getElementById('searchInput');
    const form = document.getElementById('trips-filter-form');

    if (searchInput && form) {
        // Flytta markören till slutet av inputen så man kan fortsätta skriva efter reload
        const strLengthId = searchInput.value.length;
        if (strLengthId > 0 && document.activeElement === searchInput) {
             searchInput.focus();
             searchInput.setSelectionRange(strLengthId, strLengthId);
        } else {
             // Om användaren klickar fältet först efter sidladdning
             searchInput.focus();
             searchInput.setSelectionRange(strLengthId, strLengthId);
        }

        // Reagera på varje knapptryck istället för enter
        searchInput.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            // Kör en form submit 400ms efter att användaren slutar skriva
            debounceTimer = setTimeout(function () {
                form.submit();
            }, 400);
        });
    }
});