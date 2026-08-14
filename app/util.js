'use strict';
// app/util.js

    function minsAgo(m) { return new Date(Date.now() - m * 60000).toISOString(); }

    function daysAgo(d) { return new Date(Date.now() - d * 86400000).toISOString(); }

    function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

    function uid(prefix) { return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1000); }

    function $(sel, root) { return (root || document).querySelector(sel); }

    function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    // ================================================================
    // CANONICAL ROSTER IMPORT (AI Training Academy service members)
    // Source: README_UPDATE.md — 66 bots/troopers/command agents/assistants,
    // folded in as CARC participants rather than kept as a stray HTML file.
    // ================================================================

    function nowTime() { return new Date().toTimeString().slice(0, 8); }

    // ================================================================
    // PERSISTENCE
    // ================================================================

    function relTime(iso) {
        var diffMs = Date.now() - new Date(iso).getTime();
        var mins = Math.round(diffMs / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return mins + 'm ago';
        var hrs = Math.round(mins / 60);
        if (hrs < 24) return hrs + 'h ago';
        var days = Math.round(hrs / 24);
        return days + 'd ago';
    }

    function fmtDate(iso) {
        var d = new Date(iso);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toTimeString().slice(0, 5);
    }

    // ================================================================
    // RENDER: STATS
    // ================================================================

    function relTimeFuture(date) {
        var diffMs = date.getTime() - Date.now();
        if (diffMs <= 0) return 'due now';
        var mins = Math.round(diffMs / 60000);
        if (mins < 60) return 'in ' + mins + 'm';
        return 'in ' + Math.round(mins / 60) + 'h';
    }


    function csvEscape(v) {
        var s = v == null ? '' : String(v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }

    function toCSV(rows, columns) {
        var header = columns.map(function (c) { return csvEscape(c.label); }).join(',');
        var body = rows.map(function (row) { return columns.map(function (c) { return csvEscape(c.get(row)); }).join(','); }).join('\n');
        return header + '\n' + body;
    }

    function downloadCSV(filename, csv) {
        var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    }

    function parseCSV(text) {
        var rows = [], row = [], field = '', inQuotes = false;
        for (var i = 0; i < text.length; i++) {
            var c = text[i];
            if (inQuotes) {
                if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; } }
                else { field += c; }
            } else {
                if (c === '"') inQuotes = true;
                else if (c === ',') { row.push(field); field = ''; }
                else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
                else if (c === '\r') { /* skip */ }
                else field += c;
            }
        }
        if (field.length || row.length) { row.push(field); rows.push(row); }
        return rows.filter(function (r) { return r.some(function (c) { return c && c.trim(); }); });
    }

    function mergeById(target, incoming) {
        incoming.forEach(function (item) {
            var idx = target.findIndex(function (t) { return t.id === item.id; });
            if (idx >= 0) target[idx] = Object.assign({}, target[idx], item); else target.unshift(item);
        });
    }

    // Synchronous FNV-1a-style hash — extracted from chat-router.js's original makeBroadcastId
    // so any caller needing a fast, sync, dependency-free content hash (broadcast dedup ids,
    // command audit hashes) shares one implementation. crypto.subtle.digest is async and doesn't
    // fit this codebase's synchronous render/command flow, so this stays the one hash primitive.
    function fnv1aHash(str) {
        var input = String(str || '');
        var hash = 2166136261;
        for (var i = 0; i < input.length; i++) {
            hash ^= input.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16);
    }

    function debounce(fn, ms) {
        var t;
        return function () { var args = arguments, ctx = this; clearTimeout(t); t = setTimeout(function () { fn.apply(ctx, args); }, ms); };
    }

    // ================================================================
    // RENDER ALL
    // ================================================================
