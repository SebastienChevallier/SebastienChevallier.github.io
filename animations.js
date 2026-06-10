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

  /* ---- About tabs ------------------------------------------ */
  function setupAboutTabs() {
    var btns   = document.querySelectorAll(".about-tab-btn");
    var panels = document.querySelectorAll(".about-tab-panel");
    if (!btns.length) return;

    btns.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        btns.forEach(function (b) {
          b.classList.remove("is-active");
          b.setAttribute("aria-selected", "false");
        });
        panels.forEach(function (p) { p.classList.remove("is-active"); });
        btn.classList.add("is-active");
        btn.setAttribute("aria-selected", "true");
        if (panels[i]) panels[i].classList.add("is-active");
        /* re-assign stagger indices for freshly shown panel */
        if (panels[i]) {
          panels[i].querySelectorAll(".timeline-item").forEach(function (item, j) {
            item.style.setProperty("--ti", j);
          });
        }
      });
    });
  }

  /* ---- Hero Carousel --------------------------------------- */
  function setupHeroCarousel() {
    var slides  = document.querySelectorAll(".hero-slide");
    if (slides.length < 2) return;

    var dots    = document.querySelectorAll(".hero-dot");
    var hero    = document.querySelector(".hero-full-container");
    var current = 0;
    var DELAY   = 5000;
    var timer;

    function goTo(idx) {
      slides[current].classList.remove("is-active");
      if (dots[current]) {
        dots[current].classList.remove("is-active");
        dots[current].removeAttribute("aria-current");
      }
      current = idx;
      slides[current].classList.add("is-active");
      if (dots[current]) {
        dots[current].classList.add("is-active");
        dots[current].setAttribute("aria-current", "true");
      }
    }

    function next() { goTo((current + 1) % slides.length); }

    timer = setInterval(next, DELAY);

    /* pause on hover */
    if (hero) {
      hero.addEventListener("mouseenter", function () { clearInterval(timer); });
      hero.addEventListener("mouseleave", function () { timer = setInterval(next, DELAY); });
    }

    /* dot clicks */
    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () {
        clearInterval(timer);
        goTo(i);
        timer = setInterval(next, DELAY);
      });
    });
  }

  /* ---- Boot ------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    setupNav();
    setupScrollIndicator();
    setupReveal();
    setupTimelineStagger();
    setupHeroCarousel();
    setupAboutTabs();
  });
})();
