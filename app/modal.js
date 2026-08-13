'use strict';
// app/modal.js

    var modalOverlay = null, modalTitle = null, modalBody = null, modalFooter = null;

    var modalLastFocusedEl = null, modalKeydownHandler = null;

    function getFocusableEls(container) {
        return Array.prototype.slice.call(container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
            .filter(function (el) { return el.offsetParent !== null; });
    }

    function openModal(title, bodyHtml, footerHtml) {
        modalLastFocusedEl = document.activeElement;
        modalTitle.textContent = title;
        modalBody.innerHTML = bodyHtml;
        modalFooter.innerHTML = footerHtml || '';
        modalOverlay.hidden = false;
        document.body.style.overflow = 'hidden';
        var modalEl = modalOverlay.querySelector('.modal');
        setTimeout(function () {
            var focusables = getFocusableEls(modalEl);
            (focusables[0] || modalEl).focus();
        }, 0);
        modalKeydownHandler = function (e) {
            if (e.key !== 'Tab') return;
            var focusables = getFocusableEls(modalEl);
            if (!focusables.length) return;
            var first = focusables[0], last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', modalKeydownHandler);
    }

    function closeModal() {
        modalOverlay.hidden = true;
        document.body.style.overflow = '';
        modalBody.innerHTML = '';
        modalFooter.innerHTML = '';
        if (modalKeydownHandler) { document.removeEventListener('keydown', modalKeydownHandler); modalKeydownHandler = null; }
        if (modalLastFocusedEl && document.contains(modalLastFocusedEl)) modalLastFocusedEl.focus();
        modalLastFocusedEl = null;
    }

    // ================================================================
    // GRID HELPER: filter + sort + paginate
    // ================================================================
