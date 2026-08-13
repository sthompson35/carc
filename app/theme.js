'use strict';
// app/theme.js

    function setTheme(mode) {
        document.documentElement.setAttribute('data-theme', mode);
        localStorage.setItem(THEME_KEY, mode);
        document.getElementById('btnTheme').textContent = mode === 'dark' ? '☀️' : '🌙';
    }

    // ================================================================
    // CLOCK / STATUS
    // ================================================================
