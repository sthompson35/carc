'use strict';
// app/clock.js

    function updateClock() {
        var el = document.getElementById('clockDisplay');
        if (el) el.textContent = new Date().toTimeString().slice(0, 8);
    }

    function updateStatusDot() {
        var dot = document.getElementById('statusDot'), text = document.getElementById('statusText');
        if (!dot || !text) return;
        var gate = governanceGateState();
        dot.className = 'status-dot ' + (!gate.registry.valid ? 'red' : gate.complete ? 'green' : 'yellow');
        text.textContent = !gate.registry.valid ? 'Registry Fault' : gate.complete ? 'Production Verified' : 'Mission Ready · HOLD';
    }

    // ================================================================
    // UTIL: debounce
    // ================================================================
