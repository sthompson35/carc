'use strict';
// app/charts.js

    function renderSentimentInto(elId) {
        var wrap = document.getElementById(elId);
        if (!wrap) return;
        var s = DATA.sentiment, pos = s.positive, neu = s.neutral, neg = s.negative;
        var donutStyle = 'conic-gradient(#10b981 0% ' + pos + '%, #f59e0b ' + pos + '% ' + (pos + neu) + '%, #ef4444 ' + (pos + neu) + '% 100%)';
        wrap.innerHTML =
            '<div class="donut" style="background:' + donutStyle + ';"><div class="inner"><div class="num">' + pos + '%</div><div class="lbl">Positive</div></div></div>' +
            '<div class="sentiment-legend">' +
            '<div class="item"><span class="dot" style="background:#10b981;"></span> Positive: ' + pos + '%</div>' +
            '<div class="item"><span class="dot" style="background:#f59e0b;"></span> Neutral: ' + neu + '%</div>' +
            '<div class="item"><span class="dot" style="background:#ef4444;"></span> Negative: ' + neg + '%</div>' +
            '</div>';
    }

    function renderBarList(elId, items, opts) {
        var container = document.getElementById(elId);
        if (!container) return;
        opts = opts || {};
        var max = Math.max.apply(null, items.map(function (d) { return d.value; }).concat([1]));
        if (!items.length) { container.innerHTML = '<div class="text-muted text-sm">No data</div>'; container.onclick = null; container.onkeydown = null; return; }
        container.innerHTML = items.map(function (d, i) {
            var pct = (d.value / max) * 100;
            var color = opts.colorFn ? opts.colorFn(d) : 'purple';
            var clickAttrs = opts.onClick ? ' data-idx="' + i + '" tabindex="0" role="button"' : '';
            return '<div class="chart-bar' + (opts.onClick ? ' clickable-bar' : '') + '"' + clickAttrs + '><span class="c-label">' + esc(d.label) + '</span>' +
                '<div class="c-track"><div class="c-fill ' + color + '" style="width:' + Math.max(pct, 2) + '%;">' + (d.value > 0 ? d.value : '') + '</div></div>' +
                '<span class="c-value">' + (d.display != null ? d.display : d.value) + '</span></div>';
        }).join('');
        if (opts.onClick) {
            container.onclick = function (e) {
                var row = e.target.closest('.clickable-bar');
                if (!row) return;
                opts.onClick(items[parseInt(row.getAttribute('data-idx'), 10)]);
            };
            container.onkeydown = function (e) {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                var row = e.target.closest('.clickable-bar');
                if (!row) return;
                e.preventDefault();
                opts.onClick(items[parseInt(row.getAttribute('data-idx'), 10)]);
            };
        } else {
            container.onclick = null;
            container.onkeydown = null;
        }
    }

    function renderActivityChartInto(elId) {
        var items = DATA.messageActivity.map(function (d) { return { label: d.hour, value: d.count }; });
        renderBarList(elId, items, { colorFn: function (d) { return d.value > 30 ? 'green' : d.value > 15 ? 'orange' : 'purple'; } });
    }

    function renderPeakHoursInto(elId) {
        var peaks = DATA.messageActivity.slice().sort(function (a, b) { return b.count - a.count; }).slice(0, 5).filter(function (d) { return d.count > 0; });
        var items = peaks.map(function (d) { return { label: d.hour, value: d.count }; });
        renderBarList(elId, items, { colorFn: function () { return 'orange'; } });
    }

    function renderDonutInto(elId, segments, centerLabel, onClick) {
        var wrap = document.getElementById(elId);
        if (!wrap) return;
        var total = segments.reduce(function (a, s) { return a + s.value; }, 0) || 1;
        var acc = 0;
        var stops = segments.map(function (s) {
            var from = (acc / total) * 100; acc += s.value; var to = (acc / total) * 100;
            return s.color + ' ' + from.toFixed(1) + '% ' + to.toFixed(1) + '%';
        }).join(', ');
        wrap.innerHTML =
            '<div class="donut" style="background:conic-gradient(' + stops + ');"><div class="inner"><div class="num">' + total + '</div><div class="lbl">' + esc(centerLabel || 'Total') + '</div></div></div>' +
            '<div class="sentiment-legend">' + segments.map(function (s, i) {
                var pct = total ? ((s.value / total) * 100).toFixed(1) : '0.0';
                var clickAttrs = onClick ? ' data-idx="' + i + '" tabindex="0" role="button"' : '';
                return '<div class="item' + (onClick ? ' clickable-legend' : '') + '"' + clickAttrs + '><span class="dot" style="background:' + s.color + ';"></span> ' + esc(s.label) + ': ' + s.value + ' (' + pct + '%)</div>';
            }).join('') + '</div>';
        if (onClick) {
            wrap.onclick = function (e) {
                var row = e.target.closest('.clickable-legend');
                if (!row) return;
                onClick(segments[parseInt(row.getAttribute('data-idx'), 10)]);
            };
            wrap.onkeydown = function (e) {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                var row = e.target.closest('.clickable-legend');
                if (!row) return;
                e.preventDefault();
                onClick(segments[parseInt(row.getAttribute('data-idx'), 10)]);
            };
        } else {
            wrap.onclick = null;
            wrap.onkeydown = null;
        }
    }

    // ================================================================
    // RENDER: ACTIVITY LOG
    // ================================================================
