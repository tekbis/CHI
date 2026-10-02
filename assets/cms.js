/* =============================================================================
   CHI CMS — runtime loader

   Load order matters. In the page this sits BEFORE app.js, and both use
   `defer`, which preserves document order. That lets this script publish
   window.CHI_CONTENT synchronously (from the local cache) so app.js can read
   service copy and region names from it on its very first pass.

   Flow:
     1. read the cached content from localStorage and apply it at once, so a
        returning visitor never sees the old text flash past;
     2. fetch the live content from Supabase in the background, apply it and
        refresh the cache;
     3. if anything fails — no config, no network, bad data — the page simply
        keeps the content baked into the HTML. The site must never depend on
        the CMS being reachable.
============================================================================= */
(function () {
  "use strict";

  var CACHE_KEY = "chi_cms_cache_v1";
  var MAP = window.CHI_CMS_MAP;
  var CFG = window.CHI_CMS_CONFIG || {};

  /* ------------------------------------------------------------- helpers */

  function get(obj, path) {
    var parts = String(path).split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur === null || cur === undefined) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function nodes(sel) {
    try {
      return Array.prototype.slice.call(document.querySelectorAll(sel));
    } catch (err) {
      return [];
    }
  }

  /* Replace the element's own text while leaving its child elements alone —
     the little <span> bullet in an eyebrow, the arrow in a link, the
     auto-filled year in the copyright line. We target the LAST direct text
     node, which is the written copy in every one of those patterns. */
  function setOwnText(el, value) {
    var textNodes = [];
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue.trim() !== "") textNodes.push(n);
    }
    if (!textNodes.length) {
      el.appendChild(document.createTextNode(value));
      return;
    }
    var target = textNodes[textNodes.length - 1];
    var lead = /^\s/.test(target.nodeValue) ? " " : "";
    var tail = /\s$/.test(target.nodeValue) ? " " : "";
    target.nodeValue = lead + value + tail;
    /* Earlier text nodes are left untouched on purpose: in the copyright line
       the "©" sits in its own node before the auto-filled year span. */
  }

  function setFirstText(el, value) {
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue.trim() !== "") {
        n.nodeValue = value;
        return;
      }
    }
    el.insertBefore(document.createTextNode(value), el.firstChild);
  }

  function preserves(field) {
    return field.keepFirstChild || field.keepLastChild ||
           field.keepUntilStrong || field.keepYearSpan;
  }

  /* The designed headings are not one flat line. The hero's last line sits in
     <em> (lighter, on its own row). Other headings use <br> for a line break.
     Editors type plain lines; this puts that markup back so a dashboard edit
     keeps the original style instead of replacing it with unstyled text. */
  function formatValue(format, value) {
    var raw = String(value);
    if (format === "accent-last-line") {
      if (/<\s*em\b/i.test(raw)) return raw.replace(/\r?\n/g, "<br>");
      var lines = raw.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(function (s) { return s !== ""; });
      if (lines.length < 2) return escapeHtml(lines[0] || "");
      var accent = lines.pop();
      return lines.map(escapeHtml).join("<br>") + "<em>" + escapeHtml(accent) + "</em>";
    }
    if (format === "line-breaks") {
      if (/<br\s*\/?>/i.test(raw)) return raw;
      return escapeHtml(raw).replace(/\r?\n/g, "<br>");
    }
    return raw;
  }

  function applyField(field, value) {
    if (value === undefined || value === null) return;
    if (field.skipEmpty && String(value).trim() === "") return;
    if (field.format) value = formatValue(field.format, value);
    var sels = Array.isArray(field.sel) ? field.sel : [field.sel];

    sels.forEach(function (sel) {
      nodes(sel).forEach(function (el) {
        switch (field.type) {
          case "image":
            if (el.tagName === "IMG") {
              el.src = value;
              el.removeAttribute("srcset");
            } else {
              el.style.backgroundImage = 'url("' + value + '")';
            }
            break;
          case "attr":
            el.setAttribute(field.attr || "content", value);
            break;
          case "html":
            el.innerHTML = value;
            break;
          default:
            if (field.firstTextOnly) setFirstText(el, value);
            else if (preserves(field)) setOwnText(el, value);
            else el.textContent = value;
        }
      });
    });
  }

  /* --------------------------------------------------- repeating sections */

  function applyRepeat(fields, content, count) {
    for (var i = 1; i <= count; i++) {
      /* eslint-disable no-loop-func */
      fields.forEach(function (f) {
        var path = f.path.replace("#", String(i - 1));
        var sel = (Array.isArray(f.sel) ? f.sel : [f.sel]).map(function (s) {
          return s.replace("#", String(i));
        });
        applyField({ type: f.type, attr: f.attr, sel: sel, firstTextOnly: f.firstTextOnly },
                   get(content, path));
      });
    }
  }

  /* Reviews and FAQ entries can be added or removed, so they are rebuilt from
     a template rather than patched in place. Both are plain markup with no
     JavaScript wired to them, which is why they are safe to regenerate. */
  function applyDynamic(def, list) {
    if (!Array.isArray(list) || !list.length) return;
    var container = document.querySelector(def.container);
    if (!container) return;

    var openIndex = -1;
    var existing = container.children;
    for (var i = 0; i < existing.length; i++) {
      if (existing[i].tagName === "DETAILS" && existing[i].hasAttribute("open")) openIndex = i;
    }

    var html = list.map(function (item) {
      var out = def.template;
      def.fields.forEach(function (f) {
        var v = item[f.k];
        out = out.split("{{" + f.k + "}}").join(v === undefined || v === null ? "" : escapeHtml(v));
      });
      return out;
    }).join("");

    container.innerHTML = html;

    /* keep the first FAQ row open, matching the original markup */
    if (openIndex >= 0 && container.children[0] && container.children[0].tagName === "DETAILS") {
      container.children[0].setAttribute("open", "");
    }
    /* Hand the new rows to the scroll-reveal observer so they fade in like
       the originals; if it is not available, just show them. */
    if (window.CHI && typeof window.CHI.observeReveal === "function") {
      window.CHI.observeReveal(container.children);
    } else {
      Array.prototype.forEach.call(container.children, function (el) {
        el.classList.add("is-visible");
      });
    }

    /* the FAQ accordion binds per-row listeners, so rebind after a rebuild */
    if (window.CHI && typeof window.CHI.rebindFaq === "function") {
      window.CHI.rebindFaq();
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /* ------------------------------------------------------------ main pass */

  function apply(content) {
    if (!content || !MAP) return;

    Object.keys(MAP).forEach(function (groupKey) {
      var group = MAP[groupKey];

      (group.fields || []).forEach(function (f) {
        applyField(f, get(content, f.path));
      });

      if (group.repeat && group.repeatFields) {
        applyRepeat(group.repeatFields, content, group.repeat.count);
      }

      /* services: DOM bits here, panel copy handed to app.js below */
      if (group.items) {
        var items = get(content, group.items.key) || {};
        group.items.ids.forEach(function (id) {
          var item = items[id];
          if (!item) return;
          group.items.fields.forEach(function (f) {
            if (f.type === "data" || f.type === "datalist") return;
            applyField({ type: f.type, sel: [f.sel.replace("$", id)] }, item[f.k]);
          });
        });
      }

      if (group.regions) {
        var regions = get(content, group.regions.key) || {};
        group.regions.ids.forEach(function (id) {
          var r = regions[id];
          if (!r) return;
          group.regions.fields.forEach(function (f) {
            applyField({
              type: f.type,
              sel: [f.sel[0].replace("$", id)],
              firstTextOnly: f.firstTextOnly
            }, r[f.k]);
            if (f.also && r[f.k] !== undefined) {
              applyField({ type: "text", sel: [f.also.replace("$", id)] }, r[f.k]);
            }
          });
        });
      }

      if (group.dynamic) {
        applyDynamic(group.dynamic, get(content, group.dynamic.key));
      }
    });

    /* hand the non-DOM content to app.js (service panels, region labels) */
    window.CHI_CONTENT = content;
    if (window.CHI && typeof window.CHI.refreshContent === "function") {
      window.CHI.refreshContent(content);
    }

    document.documentElement.setAttribute("data-cms-applied", "1");
  }

  /* ------------------------------------------------- cache + live fetch */

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function writeCache(content) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(content));
    } catch (err) {
      /* private mode or full storage — the site works without the cache */
    }
  }

  var cached = readCache();
  if (cached) {
    window.CHI_CONTENT = cached;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { apply(cached); });
    } else {
      apply(cached);
    }
  }

  function fetchLive() {
    if (!CFG.url || !CFG.anonKey || /YOUR_/.test(CFG.url)) return;

    var endpoint = CFG.url.replace(/\/$/, "") +
      "/rest/v1/site_content?select=content&id=eq.1";

    fetch(endpoint, {
      headers: {
        apikey: CFG.anonKey,
        Authorization: "Bearer " + CFG.anonKey,
        Accept: "application/json"
      }
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (rows) {
        if (!rows || !rows.length || !rows[0].content) return;
        var content = rows[0].content;
        writeCache(content);
        apply(content);
      })
      .catch(function () {
        /* offline, misconfigured, or the table is empty — keep what is shown */
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fetchLive);
  } else {
    fetchLive();
  }

  /* ------------------------------------------- live preview (dashboard) */
  /* The dashboard shows the real site in an iframe and posts draft content on
     every keystroke, so edits are visible before anything is saved. */
  window.addEventListener("message", function (event) {
    if (!event.data || event.data.type !== "chi-cms-preview") return;
    apply(event.data.content);
  });

  window.CHI_CMS_APPLY = apply;
})();
