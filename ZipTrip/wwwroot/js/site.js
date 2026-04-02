document.addEventListener("DOMContentLoaded", function () {
    // ==========================================
    // DARK MODE TOGGLE
    // ==========================================
    const btn = document.getElementById('theme-toggle');
    const icon = document.getElementById('theme-icon');

    function updateIcon() {
        if (icon) {
            icon.innerText = document.documentElement.classList.contains('dark') ? '🌙' : '☀️';
        }
    }

    updateIcon();

    if (btn) {
        btn.addEventListener('click', () => {
            if (document.documentElement.classList.contains('dark')) {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            } else {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            }
            updateIcon();
        });
    }

    // ==========================================
    // MOBILE MENU LOGIC
    // ==========================================
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            mobileMenu.classList.toggle('flex');
        });

        // Stäng menyn när en länk klickas
        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                mobileMenu.classList.remove('flex');
            });
        });
    }
});