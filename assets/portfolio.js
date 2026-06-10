/* ============================================================
   portfolio.js — data-driven grids + motion
   Renders Projects & Tools from data/projects.json.
   Motion: scroll reveal (IntersectionObserver), 3D tilt.
   No window.addEventListener('scroll') — parallax is CSS-only.
   ============================================================ */
(function () {
  "use strict";

  var DATA_URL = "./data/projects.json";

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cardHTML(item, idx, kind) {
    var hasImg = item.image && item.image.trim() !== "";
    var coverClass = "card-media cover" + (kind === "tool" ? " tool" : "");
    var media = hasImg
      ? '<div class="card-media">' +
          '<span class="card-tag">' + esc(item.tag) + "</span>" +
          '<img src="' + esc(item.image) + '" alt="' + esc(item.title) + '" loading="lazy">' +
        "</div>"
      : '<div class="' + coverClass + '">' +
          '<span class="card-tag">' + esc(item.tag) + "</span>" +
          '<span class="cover-mark">' + esc(item.cover || item.title) + "</span>" +
        "</div>";

    var chips = (item.stack || [])
      .map(function (s) { return '<span class="stack-chip">' + esc(s) + "</span>"; })
      .join("");

    var ext = item.external ? ' target="_blank" rel="noopener"' : "";

    return (
      '<a class="proj-card reveal" data-tilt data-proj-id="' + esc(item.id) + '" style="--i:' + idx + '" href="' + esc(item.link) + '"' + ext + ">" +
        media +
        '<div class="card-body">' +
          '<h3 class="card-title">' + esc(item.title) + "</h3>" +
          '<p class="card-desc">' + esc(item.description) + "</p>" +
          '<div class="card-meta">' + chips + "</div>" +
          '<span class="card-cta">' + esc(item.cta || "Learn more") +
            ' <span class="arrow" aria-hidden="true">&rarr;</span></span>' +
        "</div>" +
      "</a>"
    );
  }

  function renderInto(el, items, kind) {
    if (!el) return;
    el.innerHTML = items
      .map(function (it, i) { return cardHTML(it, i, kind); })
      .join("");
  }

  /* ---------- scroll reveal (IntersectionObserver only) ------- */
  function setupReveal(scope) {
    var els = (scope || document).querySelectorAll(".reveal:not(.is-visible)");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (e) { e.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- 3D tilt (pointer only, RAF-throttled) ----------- */
  function setupTilt(scope) {
    if (window.matchMedia("(hover: none)").matches) return;
    var MAX = 8;
    (scope || document).querySelectorAll("[data-tilt]").forEach(function (card) {
      var raf = null;
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          var rx = (0.5 - py) * MAX * 2;
          var ry = (px - 0.5) * MAX * 2;
          card.style.transform =
            "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" +
            ry.toFixed(2) + "deg) translateY(-6px)";
          card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
          card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
        });
      });
      card.addEventListener("mouseleave", function () {
        if (raf) cancelAnimationFrame(raf);
        card.style.transform = "";
      });
    });
  }

  /* ---------- boot ---------- */
  function boot(data) {
    renderInto(document.getElementById("projects-grid"), data.projects || [], "project");
    renderInto(document.getElementById("tools-grid"), data.tools || [], "tool");
    setupReveal(document);
    setupTilt(document);
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupReveal(document);

    fetch(DATA_URL, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(boot)
      .catch(function (err) {
        console.error("portfolio: could not load projects.json", err);
        var pg = document.getElementById("projects-grid");
        if (pg) pg.innerHTML =
          '<p style="font-family:\'Roboto Mono\',monospace;color:#6b6b6b;padding:20px">' +
          "Open via a local http server or GitHub Pages, not file://.</p>";
      });
  });
})();
