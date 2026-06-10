/* ============================================================
   portfolio.js — data-driven grids + dynamic motion
   - Renders Projects & Tools from data/projects.json
   - Scroll reveal (staggered), 3D tilt, hero parallax,
     micro-interactions. Serverless, GitHub-Pages friendly.
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
      '<a class="proj-card reveal" data-tilt style="--i:' + idx + '" href="' + esc(item.link) + '"' + ext + ">" +
        media +
        '<div class="card-body">' +
          '<h3 class="card-title">' + esc(item.title) + "</h3>" +
          '<p class="card-desc">' + esc(item.description) + "</p>" +
          '<div class="card-meta">' + chips + "</div>" +
          '<span class="card-cta">' + esc(item.cta || "Learn more") +
            ' <span class="arrow">&rarr;</span></span>' +
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

  /* ---------- motion: scroll reveal ---------- */
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
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- motion: 3D tilt ---------- */
  function setupTilt(scope) {
    if (window.matchMedia && window.matchMedia("(hover: none)").matches) return;
    var cards = (scope || document).querySelectorAll("[data-tilt]");
    var MAX = 9; // degrees
    cards.forEach(function (card) {
      var raf = null;
      function onMove(e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        var rx = (0.5 - py) * MAX * 2;
        var ry = (px - 0.5) * MAX * 2;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          card.style.transform =
            "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" +
            ry.toFixed(2) + "deg) translateY(-6px)";
          card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
          card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
        });
      }
      function reset() {
        if (raf) cancelAnimationFrame(raf);
        card.style.transform = "";
      }
      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", reset);
    });
  }

  /* ---------- motion: hero parallax ---------- */
  function setupParallax() {
    var hero = document.querySelector(".hero-full-container");
    var text = hero && hero.querySelector(".text-content");
    if (!hero) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var ticking = false;
    function update() {
      var y = window.scrollY || window.pageYOffset;
      hero.style.backgroundPositionY = (y * 0.25).toFixed(1) + "px";
      if (text) {
        text.style.transform = "translateY(" + (y * 0.18).toFixed(1) + "px)";
        text.style.opacity = Math.max(0, 1 - y / 600).toFixed(3);
      }
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- boot ---------- */
  function boot(data) {
    renderInto(document.getElementById("projects-grid"), data.projects || [], "project");
    renderInto(document.getElementById("tools-grid"), data.tools || [], "tool");
    // category headers are already in the DOM with .reveal
    setupReveal(document);
    setupTilt(document);
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupParallax();
    setupReveal(document); // reveal static elements (headers, featured)

    fetch(DATA_URL, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(boot)
      .catch(function (err) {
        console.error("portfolio: could not load projects.json", err);
        var pg = document.getElementById("projects-grid");
        if (pg) {
          pg.innerHTML =
            '<p style="font-family:Roboto Mono,monospace;color:#6b6b6b">' +
            "Projects are loading from data/projects.json — open this page through a server " +
            "(GitHub Pages or a local http server), not via file://.</p>";
        }
      });
  });
})();
