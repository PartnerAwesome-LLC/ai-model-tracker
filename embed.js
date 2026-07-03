/**
 * PartnerAwesome AI Model Tracker — Embed Loader
 *
 * Usage: place this snippet where you want the tracker to appear:
 *   <div id="pa-ai-tracker"></div>
 *   <script src="https://partnerawesome-llc.github.io/ai-model-tracker/embed.js" async></script>
 *
 * Fetches embed.html from the same origin as this script, injects it into
 * #pa-ai-tracker, then re-evaluates any <script data-pa-ai-tracker="1"> tags
 * so tab-switching JS runs in the host page.
 *
 * The daily cron pushes both index.html and embed.html together, so the
 * host page auto-updates on the next page load after each deploy.
 */
(function () {
  var TARGET_ID = 'pa-ai-tracker';
  var LOADER_TAG = document.currentScript;

  // Derive the base URL from the loader's src attribute so this file is
  // portable — no hardcoded https://partnerawesome-llc.github.io.
  var base = '';
  if (LOADER_TAG && LOADER_TAG.src) {
    base = LOADER_TAG.src.replace(/[^/]+$/, ''); // strip filename
  } else {
    base = 'https://partnerawesome-llc.github.io/ai-model-tracker/';
  }

  function inject(html) {
    var target = document.getElementById(TARGET_ID);
    if (!target) {
      console.warn('[pa-ai-tracker] Target element #' + TARGET_ID + ' not found; creating one at loader position.');
      target = document.createElement('div');
      target.id = TARGET_ID;
      LOADER_TAG.parentNode.insertBefore(target, LOADER_TAG);
    }
    target.innerHTML = html;

    // Re-run any inline scripts (browsers don't execute scripts inserted via innerHTML)
    var scripts = target.querySelectorAll('script');
    scripts.forEach(function (oldScript) {
      var newScript = document.createElement('script');
      // Copy attributes
      for (var i = 0; i < oldScript.attributes.length; i++) {
        var attr = oldScript.attributes[i];
        newScript.setAttribute(attr.name, attr.value);
      }
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }

  function showError(msg) {
    var target = document.getElementById(TARGET_ID);
    if (!target) return;
    target.innerHTML = '<div style="padding:24px;font-family:system-ui,sans-serif;color:#666;text-align:center;border:1px solid #ddd;border-radius:8px;">' +
      '<div style="font-size:14px;margin-bottom:8px;">AI Model Tracker temporarily unavailable</div>' +
      '<div style="font-size:12px;">' + msg + '</div>' +
      '<div style="font-size:12px;margin-top:8px;"><a href="' + base + '" target="_blank" rel="noopener">Open the tracker directly \u2192</a></div>' +
      '</div>';
  }

  // Cache-bust with a coarse (per-hour) timestamp so browsers refresh at least hourly,
  // aligned with the daily cron. Keeps CDN caching efficient.
  var cacheBuster = Math.floor(Date.now() / (60 * 60 * 1000));
  var url = base + 'embed.html?v=' + cacheBuster;

  fetch(url, { credentials: 'omit', mode: 'cors' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .then(function (html) {
      inject(html);
    })
    .catch(function (err) {
      console.error('[pa-ai-tracker] Load failed:', err);
      showError('Loader could not fetch dashboard content.');
    });
})();
