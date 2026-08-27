'use strict';
'require view';
'require dom';

return view.extend({
  load: function() {
    return Promise.resolve();
  },

  render: function() {
    var node = E('div', { 'id': 'enan-dashboard-content' });

    // Wait for next frame then build dashboard if function exists
    requestAnimationFrame(function() {
      if (typeof window.enanBuildDashboard === 'function') {
        window.enanBuildDashboard();
      } else {
        // Fallback: poll until available
        var attempts = 0;
        var interval = setInterval(function() {
          attempts++;
          if (typeof window.enanBuildDashboard === 'function') {
            clearInterval(interval);
            window.enanBuildDashboard();
          } else if (attempts > 50) { // ~5 seconds timeout
            clearInterval(interval);
            var container = document.getElementById('enan-dashboard-content');
            if (container) {
              container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--enan-text-2)">Failed to load dashboard widgets. Please refresh.</div>';
            }
          }
        }, 100);
      }
    });

    return node;
  },

  handleSaveApply: null,
  handleSave: null,
  handleReset: null,
  remove: function() {
    if (window._enanDashboardInterval) {
      clearInterval(window._enanDashboardInterval);
      window._enanDashboardInterval = null;
    }
    window._enanDashboardUpdating = false;
  }
});
