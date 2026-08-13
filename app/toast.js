'use strict';
// app/toast.js

    function showToast(type, message, action) {
        var container = document.getElementById('toastContainer');
        if (!container) return;
        var toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        var msgSpan = document.createElement('span');
        msgSpan.style.flex = '1';
        msgSpan.textContent = message;
        toast.appendChild(msgSpan);
        var dismissTimer;
        function dismiss() {
            clearTimeout(dismissTimer);
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(function () { toast.remove(); }, 300);
        }
        if (action && action.label && action.onClick) {
            var actionBtn = document.createElement('button');
            actionBtn.textContent = action.label;
            actionBtn.style.cssText = 'background:rgba(255,255,255,0.25); border:1px solid rgba(255,255,255,0.5); color:#fff; border-radius:6px; padding:3px 10px; font-size:0.75rem; font-weight:700; cursor:pointer; flex-shrink:0;';
            actionBtn.addEventListener('click', function () { action.onClick(); dismiss(); });
            toast.appendChild(actionBtn);
        }
        container.appendChild(toast);
        dismissTimer = setTimeout(dismiss, action ? 6000 : 3200);
    }

    // ================================================================
    // ACTIVITY LOG
    // ================================================================
