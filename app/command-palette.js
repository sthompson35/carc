'use strict';
// app/command-palette.js

    function openCommandPalette(prefill) {
        var body = '<input type="text" id="cpInput" placeholder="Search participants, conversations…" style="width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:8px; background:var(--surface); color:var(--gray-900); font-size:0.88rem; outline:none;" value="' + esc(prefill || '') + '">' +
            '<div id="cpResults" class="mt-2"></div>';
        openModal('Search', body, '');
        var input = document.getElementById('cpInput');
        function runSearch() {
            var q = input.value.trim().toLowerCase();
            var results = document.getElementById('cpResults');
            if (!q) { results.innerHTML = '<div class="text-muted text-sm">Type to search…</div>'; return; }
            var pHits = DATA.participants.filter(function (p) { return (p.name+' '+p.dept+' '+(p.role||'')+' '+(p.callsign||'')+' '+(p.agentId||'')+' '+(p.serviceMemberId||'')+' '+(p.callsignId||'')+' '+(p.legacyAlias||'')).toLowerCase().indexOf(q) !== -1; }).slice(0, 6);
            var cHits = DATA.conversations.filter(function (c) { return c.title.toLowerCase().indexOf(q) !== -1; }).slice(0, 6);
            var html = '';
            if (pHits.length) html += '<div class="text-xs text-muted mb-1">PARTICIPANTS</div>' + pHits.map(function (p) { return '<div class="kv-row" style="cursor:pointer;" data-goto="participants" data-q="' + esc(p.name) + '"><span>' + esc(p.name) + '</span><span class="badge ' + (TYPE_BADGE[p.type] || '') + '">' + esc(p.type) + '</span></div>'; }).join('');
            if (cHits.length) html += '<div class="text-xs text-muted mb-1 mt-2">CONVERSATIONS</div>' + cHits.map(function (c) { return '<div class="kv-row" style="cursor:pointer;" data-goto="conversations" data-id="' + c.id + '"><span>' + esc(c.title) + '</span><span class="badge ' + (STATUS_BADGE[c.status] || '') + '">' + esc(c.status) + '</span></div>'; }).join('');
            results.innerHTML = html || '<div class="text-muted text-sm">No matches</div>';
            $all('[data-goto]', results).forEach(function (row) {
                row.addEventListener('click', function () {
                    var route = row.getAttribute('data-goto');
                    closeModal(); navigate(route);
                    if (route === 'participants') { partState.search = row.getAttribute('data-q'); document.getElementById('partSearchInput').value = partState.search; renderParticipantsGrid(); }
                    if (route === 'conversations') { openConversationDetail(row.getAttribute('data-id')); }
                });
            });
        }
        input.addEventListener('input', runSearch);
        input.focus();
        runSearch();
    }

    // ================================================================
    // THEME
    // ================================================================
