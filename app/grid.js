'use strict';
// app/grid.js

    function filterSortPaginate(data, cfg) {
        var rows = data.filter(function (row) {
            if (cfg.search && !cfg.searchFn(row, cfg.search)) return false;
            for (var i = 0; i < cfg.filters.length; i++) { if (!cfg.filters[i](row)) return false; }
            return true;
        });
        rows.sort(function (a, b) {
            var av = a[cfg.sortKey], bv = b[cfg.sortKey];
            if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv || '').toLowerCase(); }
            if (av < bv) return cfg.sortDir === 'asc' ? -1 : 1;
            if (av > bv) return cfg.sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        var total = rows.length;
        var totalPages = Math.max(1, Math.ceil(total / cfg.pageSize));
        var page = Math.min(cfg.page, totalPages);
        var start = (page - 1) * cfg.pageSize;
        return { rows: rows.slice(start, start + cfg.pageSize), total: total, totalPages: totalPages, page: page };
    }

    function renderPagination(container, state, result, onChange) {
        var infoStart = result.total === 0 ? 0 : (result.page - 1) * state.pageSize + 1;
        var infoEnd = Math.min(result.page * state.pageSize, result.total);
        container.innerHTML =
            '<span>Showing ' + infoStart + '–' + infoEnd + ' of ' + result.total + '</span>' +
            '<div class="pg-btns">' +
            '<button data-pg="first" ' + (result.page <= 1 ? 'disabled' : '') + '>«</button>' +
            '<button data-pg="prev" ' + (result.page <= 1 ? 'disabled' : '') + '>‹</button>' +
            '<span class="text-xs">Page ' + result.page + ' / ' + result.totalPages + '</span>' +
            '<button data-pg="next" ' + (result.page >= result.totalPages ? 'disabled' : '') + '>›</button>' +
            '<button data-pg="last" ' + (result.page >= result.totalPages ? 'disabled' : '') + '>»</button>' +
            '<select data-pg="size">' + [6, 8, 10, 20, 50].map(function (n) { return '<option value="' + n + '" ' + (n === state.pageSize ? 'selected' : '') + '>' + n + '/page</option>'; }).join('') + '</select>' +
            '</div>';
        $all('[data-pg]', container).forEach(function (el) {
            el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'click', function () {
                var action = el.getAttribute('data-pg');
                if (action === 'first') state.page = 1;
                else if (action === 'prev') state.page = Math.max(1, state.page - 1);
                else if (action === 'next') state.page = Math.min(result.totalPages, state.page + 1);
                else if (action === 'last') state.page = result.totalPages;
                else if (action === 'size') { state.pageSize = parseInt(el.value, 10); state.page = 1; }
                onChange();
            });
        });
    }
