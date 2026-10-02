/* =============================================================================
   CHI dashboard — logic

   Talks to Supabase over plain REST (no SDK), so there is no CDN dependency
   and nothing to keep up to date. Three endpoints are used:

     POST {url}/auth/v1/token?grant_type=password   sign in
     GET/PATCH {url}/rest/v1/site_content           read and write the content
     POST {url}/storage/v1/object/site-images/...   image uploads

   The anon key below is public and read-only by design. Writing requires the
   access token returned by sign-in, and the database enforces that with row
   level security — so the password is checked by Supabase, not by this file.
============================================================================= */
(function () {
  "use strict";

  var CFG = window.CHI_CMS_CONFIG || {};
  var MAP = window.CHI_CMS_MAP || {};
  var BUCKET = "site-images";
  var TOKEN_KEY = "chi_admin_token";

  var state = {
    content: null,   // working copy, reflects the form
    saved: null,     // last known server state, for "Undo changes"
    token: null,
    group: null,
    dirty: false
  };

  var $ = function (id) { return document.getElementById(id); };

  /* ------------------------------------------------------- path helpers */

  function get(obj, path) {
    var parts = String(path).split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur === null || cur === undefined) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function set(obj, path, value) {
    var parts = String(path).split(".");
    var cur = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      if (typeof cur[parts[i]] !== "object" || cur[parts[i]] === null) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  /* --------------------------------------------------------------- toast */

  var toastTimer = null;
  function toast(message, isError) {
    var el = $("toast");
    el.textContent = message;
    el.className = "toast" + (isError ? " error" : "");
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, isError ? 6000 : 2600);
  }

  /* ----------------------------------------------------------- supabase */

  function configured() {
    return CFG.url && CFG.anonKey && !/YOUR_/.test(CFG.url) && !/YOUR_/.test(CFG.anonKey);
  }

  function api(path) { return CFG.url.replace(/\/$/, "") + path; }

  function signIn(password) {
    return fetch(api("/auth/v1/token?grant_type=password"), {
      method: "POST",
      headers: { apikey: CFG.anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email: CFG.adminEmail, password: password })
    }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) {
          throw new Error(body.error_description || body.msg || body.error || "Sign-in failed");
        }
        return body.access_token;
      });
    });
  }

  function loadContent() {
    return fetch(api("/rest/v1/site_content?select=content&id=eq.1"), {
      headers: { apikey: CFG.anonKey, Authorization: "Bearer " + state.token }
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Could not read the content table (HTTP " + res.status + ")");
        return res.json();
      })
      .then(function (rows) {
        if (rows && rows.length && rows[0].content) return rows[0].content;
        return null;
      });
  }

  function loadDefaults() {
    return fetch("/assets/content.default.json").then(function (r) { return r.json(); });
  }

  function saveContent(content) {
    return fetch(api("/rest/v1/site_content?id=eq.1"), {
      method: "PATCH",
      headers: {
        apikey: CFG.anonKey,
        Authorization: "Bearer " + state.token,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({ content: content, updated_at: new Date().toISOString() })
    }).then(function (res) {
      return res.text().then(function (text) {
        if (!res.ok) throw new Error(text || ("HTTP " + res.status));
        /* An empty array means the row is missing or RLS blocked the write. */
        var rows = text ? JSON.parse(text) : [];
        if (!rows.length) {
          throw new Error("Nothing was saved — check that row id = 1 exists in site_content.");
        }
        return rows[0];
      });
    });
  }

  function uploadImage(file) {
    var safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "");
    var key = Date.now() + "-" + safe;
    return fetch(api("/storage/v1/object/" + BUCKET + "/" + key), {
      method: "POST",
      headers: {
        apikey: CFG.anonKey,
        Authorization: "Bearer " + state.token,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "true"
      },
      body: file
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error("Upload failed: " + (t || res.status));
        });
      }
      return api("/storage/v1/object/public/" + BUCKET + "/" + key);
    });
  }

  /* --------------------------------------------------------- dirty state */

  function markDirty(dirty) {
    state.dirty = dirty;
    $("btn-save").disabled = !dirty;
    var label = $("save-state");
    label.textContent = dirty ? "Unsaved changes" : "All changes saved";
    label.className = dirty ? "dirty" : "";
  }

  window.addEventListener("beforeunload", function (event) {
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  /* ------------------------------------------------------------ preview */

  var previewTimer = null;
  function pushPreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(function () {
      var frame = $("preview-frame");
      if (!frame || !frame.contentWindow) return;
      frame.contentWindow.postMessage(
        { type: "chi-cms-preview", content: state.content }, "*"
      );
    }, 120);
  }

  /* ------------------------------------------------------- field builders */

  function fieldShell(labelText, hint) {
    var wrap = document.createElement("div");
    wrap.className = "field";
    var label = document.createElement("label");
    label.textContent = labelText;
    wrap.appendChild(label);
    if (hint) {
      var h = document.createElement("p");
      h.className = "hint";
      h.textContent = hint;
      wrap.dataset.hint = "1";
      wrap._hint = h;
    }
    return wrap;
  }

  /* Show designed markup as plain lines in the editor. What gets saved is the
     text the user typed; the site puts the original <em> / <br> style back. */
  function editorText(format, value) {
    var raw = String(value);
    if (format === "accent-last-line") {
      var em = raw.match(/<em>([\s\S]*?)<\/em>/i);
      if (!em) return raw;
      var before = raw.replace(/<em>[\s\S]*?<\/em>/i, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
      before = before.split(/\n/).map(function (s) { return s.trim(); }).filter(Boolean).join("\n");
      return (before + "\n" + em[1].replace(/<[^>]+>/g, "").trim()).trim();
    }
    if (format === "line-breaks") {
      return raw.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
    }
    return raw;
  }

  function onEdit(path, value) {
    set(state.content, path, value);
    markDirty(true);
    pushPreview();
  }

  function buildText(path, def) {
    var wrap = fieldShell(def.label, def.hint);
    var el = document.createElement(def.multiline ? "textarea" : "input");
    if (!def.multiline) el.type = "text";
    var current = get(state.content, path);
    el.value = current === undefined || current === null ? "" : editorText(def.format, current);
    el.addEventListener("input", function () { onEdit(path, el.value); });
    wrap.appendChild(el);
    if (wrap._hint) wrap.appendChild(wrap._hint);
    return wrap;
  }

  function buildStars(path, def) {
    var wrap = fieldShell(def.label, def.hint);
    var el = document.createElement("select");
    [5, 4, 3, 2, 1].forEach(function (n) {
      var opt = document.createElement("option");
      opt.value = "★★★★★".slice(0, n);
      opt.textContent = opt.value + "  (" + n + ")";
      el.appendChild(opt);
    });
    el.value = get(state.content, path) || "★★★★★";
    el.addEventListener("change", function () { onEdit(path, el.value); });
    wrap.appendChild(el);
    return wrap;
  }

  function buildList(path, def) {
    /* a simple one-per-line editor for string arrays (service bullet points) */
    var wrap = fieldShell(def.label, "One per line");
    var el = document.createElement("textarea");
    var arr = get(state.content, path);
    el.value = Array.isArray(arr) ? arr.join("\n") : "";
    el.addEventListener("input", function () {
      onEdit(path, el.value.split("\n").map(function (s) { return s.trim(); })
        .filter(function (s) { return s !== ""; }));
    });
    wrap.appendChild(el);
    if (wrap._hint) wrap.appendChild(wrap._hint);
    return wrap;
  }

  /* Image values can be a short relative path, a long Supabase URL, or (in the
     demo build) a base64 data URI thousands of characters long. Show something
     readable instead of dumping the raw value under the thumbnail. */
  function displayPath(value) {
    if (!value) return "";
    if (/^data:/.test(value)) return "Uploaded image";
    var clean = String(value).split("?")[0];
    var name = clean.substring(clean.lastIndexOf("/") + 1);
    return name.length > 48 ? name.slice(0, 45) + "…" : name;
  }

  function resolvePreviewSrc(value) {
    if (!value) return "";
    if (/^https?:|^data:/.test(value)) return value;
    return "/" + value.replace(/^\.\//, "").replace(/^\//, "");
  }

  function buildImage(path, def) {
    var wrap = fieldShell(def.label, def.hint);
    var row = document.createElement("div");
    row.className = "image-field";

    var thumb = document.createElement("img");
    thumb.className = "thumb";
    thumb.alt = "";
    thumb.src = resolvePreviewSrc(get(state.content, path));

    var actions = document.createElement("div");
    actions.className = "image-actions";

    var file = document.createElement("input");
    file.type = "file";
    file.accept = "image/*";

    var pick = document.createElement("button");
    pick.type = "button";
    pick.className = "btn btn-ghost";
    pick.textContent = "Upload new image";
    pick.addEventListener("click", function () { file.click(); });

    var status = document.createElement("p");
    status.className = "path";
    status.textContent = displayPath(get(state.content, path));
    status.title = get(state.content, path) || "";

    file.addEventListener("change", function () {
      var chosen = file.files && file.files[0];
      if (!chosen) return;
      if (chosen.size > 5 * 1024 * 1024) {
        toast("That image is over 5 MB — please use a smaller one.", true);
        file.value = "";
        return;
      }
      status.className = "uploading";
      status.textContent = "Uploading " + chosen.name + "…";
      uploadImage(chosen)
        .then(function (url) {
          onEdit(path, url);
          thumb.src = url;
          status.className = "path";
          status.textContent = displayPath(url);
          status.title = url;
          toast("Image uploaded");
        })
        .catch(function (err) {
          status.className = "path";
          status.textContent = displayPath(get(state.content, path));
          toast(err.message, true);
        })
        .then(function () { file.value = ""; });
    });

    actions.appendChild(pick);
    actions.appendChild(file);
    actions.appendChild(status);
    row.appendChild(thumb);
    row.appendChild(actions);
    wrap.appendChild(row);
    if (wrap._hint) wrap.appendChild(wrap._hint);
    return wrap;
  }

  function buildField(path, def) {
    if (def.type === "image") return buildImage(path, def);
    if (def.type === "stars") return buildStars(path, def);
    if (def.type === "datalist") return buildList(path, def);
    return buildText(path, def);
  }

  /* --------------------------------------------------------- list editor */

  function buildDynamic(group, host) {
    var def = group.dynamic;
    var list = get(state.content, def.key);
    if (!Array.isArray(list)) { list = []; set(state.content, def.key, list); }

    list.forEach(function (row, index) {
      var card = document.createElement("div");
      card.className = "card";

      var head = document.createElement("div");
      head.className = "card-head";
      var title = document.createElement("h3");
      title.textContent = group.label + " " + (index + 1);
      var tools = document.createElement("div");
      tools.className = "row-tools";

      function toolBtn(label, title2, disabled, fn) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = label;
        b.title = title2;
        b.disabled = disabled;
        b.addEventListener("click", fn);
        return b;
      }

      tools.appendChild(toolBtn("↑", "Move up", index === 0, function () {
        list.splice(index - 1, 0, list.splice(index, 1)[0]);
        markDirty(true); pushPreview(); renderGroup(state.group);
      }));
      tools.appendChild(toolBtn("↓", "Move down", index === list.length - 1, function () {
        list.splice(index + 1, 0, list.splice(index, 1)[0]);
        markDirty(true); pushPreview(); renderGroup(state.group);
      }));
      tools.appendChild(toolBtn("✕", "Delete", false, function () {
        if (!confirm("Delete this entry? It will disappear from the site when you save.")) return;
        list.splice(index, 1);
        markDirty(true); pushPreview(); renderGroup(state.group);
      }));

      head.appendChild(title);
      head.appendChild(tools);
      card.appendChild(head);

      def.fields.forEach(function (f) {
        card.appendChild(buildField(def.key + "." + index + "." + f.k, f));
      });

      host.appendChild(card);
    });

    var add = document.createElement("button");
    add.type = "button";
    add.className = "btn btn-ghost";
    add.textContent = "+ Add another";
    add.addEventListener("click", function () {
      var row = {};
      def.fields.forEach(function (f) { row[f.k] = f.default !== undefined ? f.default : ""; });
      list.push(row);
      markDirty(true); pushPreview(); renderGroup(state.group);
    });
    host.appendChild(add);
  }

  /* -------------------------------------------------------------- render */

  function renderSidebar() {
    var nav = $("sidebar");
    nav.innerHTML = "";
    Object.keys(MAP).forEach(function (key) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = MAP[key].label;
      btn.className = key === state.group ? "active" : "";
      btn.addEventListener("click", function () {
        state.group = key;
        renderSidebar();
        renderGroup(key);
        $("editor").scrollTop = 0;
      });
      nav.appendChild(btn);
    });
  }

  function renderGroup(key) {
    var group = MAP[key];
    var host = $("editor");
    host.innerHTML = "";

    var h = document.createElement("h2");
    h.textContent = group.label;
    host.appendChild(h);

    var hint = document.createElement("p");
    hint.className = "section-hint";
    hint.textContent = group.page === "home"
      ? "Appears on the homepage."
      : "Appears on every page.";
    host.appendChild(hint);

    (group.fields || []).forEach(function (f) {
      host.appendChild(buildField(f.path, f));
    });

    if (group.repeat && group.repeatFields) {
      for (var i = 0; i < group.repeat.count; i++) {
        var card = document.createElement("div");
        card.className = "card";
        var t = document.createElement("h3");
        t.textContent = "Item " + (i + 1);
        card.appendChild(t);
        /* eslint-disable no-loop-func */
        (function (index) {
          group.repeatFields.forEach(function (f) {
            card.appendChild(buildField(f.path.replace("#", String(index)), f));
          });
        })(i);
        host.appendChild(card);
      }
    }

    if (group.items) {
      group.items.ids.forEach(function (id) {
        var card = document.createElement("div");
        card.className = "card";
        var t = document.createElement("h3");
        var named = get(state.content, group.items.key + "." + id + ".title");
        t.textContent = named || id;
        card.appendChild(t);
        group.items.fields.forEach(function (f) {
          card.appendChild(buildField(group.items.key + "." + id + "." + f.k, f));
        });
        host.appendChild(card);
      });
    }

    if (group.regions) {
      group.regions.ids.forEach(function (id) {
        var card = document.createElement("div");
        card.className = "card";
        var t = document.createElement("h3");
        t.textContent = get(state.content, group.regions.key + "." + id + ".name") || id;
        card.appendChild(t);
        group.regions.fields.forEach(function (f) {
          card.appendChild(buildField(group.regions.key + "." + id + "." + f.k, f));
        });
        host.appendChild(card);
      });
    }

    if (group.dynamic) buildDynamic(group, host);
  }

  /* ---------------------------------------------------------- app start */

  function startApp(content) {
    state.content = clone(content);
    state.saved = clone(content);
    state.group = Object.keys(MAP)[0];
    $("login").hidden = true;
    $("app").hidden = false;
    renderSidebar();
    renderGroup(state.group);
    markDirty(false);

    var frame = $("preview-frame");
    frame.addEventListener("load", pushPreview);
    pushPreview();
  }

  /* ------------------------------------------------------------- wiring */

  function wireChrome() {
    $("btn-save").addEventListener("click", function () {
      var btn = $("btn-save");
      btn.disabled = true;
      btn.textContent = "Saving…";
      saveContent(state.content)
        .then(function () {
          state.saved = clone(state.content);
          markDirty(false);
          toast("Saved — the website is updated");
        })
        .catch(function (err) {
          markDirty(true);
          toast(err.message, true);
        })
        .then(function () { btn.textContent = "Save & publish"; });
    });

    $("btn-revert").addEventListener("click", function () {
      if (!state.dirty) { toast("Nothing to undo"); return; }
      if (!confirm("Discard all changes since your last save?")) return;
      state.content = clone(state.saved);
      renderGroup(state.group);
      markDirty(false);
      pushPreview();
      toast("Changes discarded");
    });

    $("btn-logout").addEventListener("click", function () {
      if (state.dirty && !confirm("You have unsaved changes. Sign out anyway?")) return;
      sessionStorage.removeItem(TOKEN_KEY);
      state.dirty = false;
      location.reload();
    });

    $("btn-preview-toggle").addEventListener("click", function () {
      var layout = document.querySelector(".layout");
      var off = layout.classList.toggle("no-preview");
      this.textContent = off ? "Show preview" : "Hide preview";
    });

    document.querySelectorAll(".preview-sizes button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".preview-sizes button").forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
        $("frame-wrap").classList.toggle("mobile", btn.dataset.size === "mobile");
      });
    });
  }

  /* A first save can store only the fields that were typed. Lay the full
     designed copy underneath so those edits stay, and everything else keeps
     the original wording instead of coming back blank. */
  function mergeContent(base, over) {
    if (Array.isArray(base)) return Array.isArray(over) && over.length ? over : base;
    if (!base || typeof base !== "object") {
      return over === undefined || over === null || over === "" ? base : over;
    }
    var out = {};
    var keys = Object.keys(base);
    if (over && typeof over === "object" && !Array.isArray(over)) {
      Object.keys(over).forEach(function (k) {
        if (keys.indexOf(k) === -1) keys.push(k);
      });
    }
    keys.forEach(function (k) {
      var o = over ? over[k] : undefined;
      if (o === undefined || o === null || o === "") out[k] = base[k];
      else out[k] = mergeContent(base[k], o);
    });
    return out;
  }

  function boot(token) {
    state.token = token;
    sessionStorage.setItem(TOKEN_KEY, token);
    loadContent()
      .then(function (content) {
        return loadDefaults().then(function (defaults) {
          if (!content) {
            toast("Starting from the current website content");
            return defaults;
          }
          return mergeContent(defaults, content);
        });
      })
      .then(startApp)
      .catch(function (err) {
        $("login").hidden = false;
        $("app").hidden = true;
        showLoginError(err.message);
      });
  }

  function showLoginError(message) {
    var el = $("login-error");
    el.textContent = message;
    el.hidden = false;
  }

  function init() {
    wireChrome();

    if (!configured()) {
      $("login-form").querySelector("button").disabled = true;
      showLoginError("Not connected yet — add your Supabase URL and key to assets/cms-config.js, then redeploy.");
      return;
    }

    $("login-note").textContent = "Signing in as " + CFG.adminEmail;

    $("login-form").addEventListener("submit", function (event) {
      event.preventDefault();
      $("login-error").hidden = true;
      var btn = $("login-btn");
      btn.disabled = true;
      btn.textContent = "Signing in…";
      signIn($("password").value)
        .then(boot)
        .catch(function (err) { showLoginError(err.message); })
        .then(function () {
          btn.disabled = false;
          btn.textContent = "Sign in";
        });
    });

    var existing = sessionStorage.getItem(TOKEN_KEY);
    if (existing) boot(existing);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
