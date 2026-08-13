'use strict';
// app/persistence.js

    var DATA;

    function loadData() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.participants) && Array.isArray(parsed.conversations)) return parsed;
            }
        } catch (e) { /* fall through to defaults */ }
        return buildDefaultData();
    }

    var saveTimer = null;

    function saveData() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA)); } catch (e) { /* storage full/unavailable */ }
            updateStorageSize();
        }, 150);
    }

    function updateStorageSize() {
        try {
            var bytes = new Blob([JSON.stringify(DATA)]).size;
            var kb = (bytes / 1024).toFixed(1);
            var el = document.getElementById('storageSize');
            if (el) el.textContent = kb + ' KB stored';
        } catch (e) {}
    }

    DATA = (function () {
        var loaded = loadData();
        try {
            return migrateData(loaded);
        } catch (migrationError) {
            // A crash here used to take the whole app down before init() ever ran — no nav,
            // no buttons, no data, nothing wired up. Never let stored data be able to do that
            // again: back up whatever we couldn't migrate (so it isn't silently lost) and
            // fall back to a known-good default dataset instead of a blank, dead app.
            try { localStorage.setItem(STORAGE_KEY + '_migration_failed_backup_' + Date.now(), JSON.stringify(loaded)); } catch (backupError) { /* best effort */ }
            try { console.error('CARC: migrateData() failed, falling back to default data. Original data backed up.', migrationError); } catch (logError) { /* best effort */ }
            return migrateData(buildDefaultData());
        }
    })();

    // ================================================================
    // TOAST
    // ================================================================
