/* ============================================================
   animations.js — Shared interactive motion (all pages)
   Taste rule: NO window.addEventListener('scroll').
   Uses IntersectionObserver + CSS class toggles only.
   ============================================================ */
(function () {
  "use strict";

  /* ---- Nav: frosted glass when hero exits viewport ---------- */
  function setupNav() {
    var nav = document.querySelector(".navbar");
    if (!nav) return;

    var sentinel =
      document.querySelector(".hero-full-container") ||
      document.querySelector(".about-hero");

    if (!sentinel) {
      nav.classList.add("navbar--scrolled");
      return;
    }

    if (!("IntersectionObserver" in window)) {
      nav.classList.add("navbar--scrolled");
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          nav.classList.toggle("navbar--scrolled", !e.isIntersecting);
        });
      },
      { threshold: 0.15 }
    );
    io.observe(sentinel);
  }

  /* ---- Scroll indicator: click → scroll to first section --- */
  function setupScrollIndicator() {
    var ind = document.querySelector(".scroll-indicator");
    if (!ind) return;
    ind.addEventListener("click", function () {
      var target =
        document.getElementById("featured") ||
        document.getElementById("projects") ||
        document.querySelector(".about-bio");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ---- Reveal: IntersectionObserver on .reveal elements ---- */
  function setupReveal() {
    var els = document.querySelectorAll(
      ".reveal:not(.is-visible), .reveal-left:not(.is-visible), .reveal-right:not(.is-visible)"
    );
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (e) { e.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" }
    );
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---- Timeline item stagger delay assignment -------------- */
  function setupTimelineStagger() {
    document.querySelectorAll(".timeline").forEach(function (tl) {
      tl.querySelectorAll(".timeline-item").forEach(function (item, i) {
        item.style.setProperty("--ti", i);
      });
    });
  }

  /* ---- Boot ------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    setupNav();
    setupScrollIndicator();
    setupReveal();
    setupTimelineStagger();
  });
})();
