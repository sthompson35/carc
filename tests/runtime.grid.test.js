'use strict';
// tests/runtime.grid.test.js

module.exports = {
    modules: ['app/grid.js'],
    run: function (ctx, assert) {
        var filterSortPaginate = ctx.filterSortPaginate;

        var data = [
            { id: 1, name: 'Bravo', score: 30 },
            { id: 2, name: 'alpha', score: 10 },
            { id: 3, name: 'Charlie', score: 20 },
            { id: 4, name: 'delta', score: 40 },
            { id: 5, name: 'Echo', score: 50 }
        ];

        // search + searchFn
        var searched = filterSortPaginate(data, {
            search: 'har', searchFn: function (row, q) { return row.name.toLowerCase().indexOf(q) !== -1; },
            filters: [], sortKey: 'name', sortDir: 'asc', page: 1, pageSize: 10
        });
        assert(searched.total === 1 && searched.rows[0].id === 3, 'search filters to matching rows only');

        // filters
        var filtered = filterSortPaginate(data, {
            search: '', searchFn: null, filters: [function (row) { return row.score >= 30; }],
            sortKey: 'score', sortDir: 'asc', page: 1, pageSize: 10
        });
        assert(filtered.total === 3, 'filter predicates narrow the row set (got total=' + filtered.total + ')');
        assert(filtered.rows[0].score === 30 && filtered.rows[2].score === 50, 'filtered rows sorted ascending by score');

        // case-insensitive string sort
        var sorted = filterSortPaginate(data, {
            search: '', searchFn: null, filters: [], sortKey: 'name', sortDir: 'asc', page: 1, pageSize: 10
        });
        var names = sorted.rows.map(function (r) { return r.name; });
        assert(names[0] === 'alpha' && names[1] === 'Bravo' && names[4] === 'Echo', 'string sort is case-insensitive (' + names.join(',') + ')');

        // descending sort
        var desc = filterSortPaginate(data, {
            search: '', searchFn: null, filters: [], sortKey: 'score', sortDir: 'desc', page: 1, pageSize: 10
        });
        assert(desc.rows[0].score === 50 && desc.rows[4].score === 10, 'descending sort orders high to low');

        // pagination
        var page1 = filterSortPaginate(data, {
            search: '', searchFn: null, filters: [], sortKey: 'id', sortDir: 'asc', page: 1, pageSize: 2
        });
        assert(page1.rows.length === 2 && page1.totalPages === 3 && page1.total === 5, 'pageSize=2 over 5 rows yields 3 pages, 2 rows on page 1');
        var page2 = filterSortPaginate(data, {
            search: '', searchFn: null, filters: [], sortKey: 'id', sortDir: 'asc', page: 2, pageSize: 2
        });
        assert(page2.rows[0].id === 3 && page2.rows[1].id === 4, 'page 2 returns the next slice');

        // requested page beyond totalPages clamps down
        var overshoot = filterSortPaginate(data, {
            search: '', searchFn: null, filters: [], sortKey: 'id', sortDir: 'asc', page: 99, pageSize: 2
        });
        assert(overshoot.page === overshoot.totalPages, 'out-of-range page clamps to totalPages');
    }
};
