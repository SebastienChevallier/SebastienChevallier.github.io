/* ============================================================
   spa.js — hash router + Three.js transition choreography
   Home and About live in the same document as two <main> views.
   Route changes never reload the page; the persistent canvas
   from scene-transitions.js plays a short particle "portal"
   while the views cross-fade underneath it.
   ============================================================ */
import { initScene, morphTo, pulseAt, setReducedMotion } from "./scene-transitions.js";

(function () {
  "use strict";

  var viewHome = document.getElementById("view-home");
  var viewAbout = document.getElementById("view-about");
  var canvas = document.getElementById("bg-canvas");
  var veil = document.getElementById("transition-veil");
  var body = document.body;

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var sceneReady = false;
  var currentRoute = "home";
  var busy = false;

  if (!reducedMotion && canvas && "IntersectionObserver" in window) {
    try {
      initScene(canvas);
      sceneReady = true;
    } catch (err) {
      console.warn("spa: 3D transitions disabled (WebGL unavailable)", err);
      sceneReady = false;
    }
  }
  setReducedMotion(reducedMotion);

  /* ---------- hash parsing ------------------------------------ */
  function parseHash(hash) {
    if (hash === "#/about") return { route: "about", anchor: null };
    if (hash === "#projects" || hash === "#tools" || hash === "#featured") {
      return { route: "home", anchor: hash.slice(1) };
    }
    return { route: "home", anchor: null };
  }

  function titleFor(route) {
    return route === "about"
      ? "About — Sébastien Chevallier"
      : "Sébastien Chevallier — Gameplay & Engine Developer";
  }

  /* ---------- nav active state ---------------------------------- */
  function updateNav(route, anchor) {
    var links = document.querySelectorAll(".navbar-nav a");
    links.forEach(function (a) {
      var href = a.getAttribute("href");
      var isActive =
        (route === "about" && href === "#/about") ||
        (route === "home" && !anchor && (href === "./index.html" || href === "#/")) ||
        (route === "home" && anchor && href === "#" + anchor);
      var li = a.closest("li");
      if (li) li.classList.toggle("active", !!isActive);
      if (isActive) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  /* ---------- view swap ------------------------------------------ */
  function swapViews(route) {
    var showAbout = route === "about";
    viewHome.hidden = showAbout;
    viewAbout.hidden = !showAbout;
    viewHome.classList.toggle("is-active", !showAbout);
    viewAbout.classList.toggle("is-active", showAbout);
    window.scrollTo(0, 0);
    document.title = titleFor(route);
    var heading = (showAbout ? viewAbout : viewHome).querySelector("h1");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }

  function smoothScrollTo(anchorId) {
    var el = document.getElementById(anchorId);
    if (el) el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }

  /* ---------- main navigation choreography ------------------------ */
  function goToRoute(route, anchor, opts) {
    opts = opts || {};
    var push = opts.push !== false;

    if (route === currentRoute) {
      if (anchor) smoothScrollTo(anchor);
      if (push) history.pushState(null, "", anchor ? "#" + anchor : "#/");
      updateNav(route, anchor);
      return;
    }

    if (busy) return;
    busy = true;
    body.classList.add("is-transitioning");

    var coverDone = sceneReady ? morphTo("cover", { duration: 380 }) : Promise.resolve();

    coverDone.then(function () {
      swapViews(route);
      updateNav(route, anchor);
      if (push) history.pushState(null, "", anchor ? "#" + anchor : route === "about" ? "#/about" : "#/");

      var settleKey = route === "about" ? "about" : "home";
      var settleDone = sceneReady ? morphTo(settleKey, { duration: 650 }) : Promise.resolve();

      settleDone.then(function () {
        body.classList.remove("is-transitioning");
        currentRoute = route;
        busy = false;
        if (anchor) smoothScrollTo(anchor);
      });
    });
  }

  /* ---------- click interception on internal nav links ------------ */
  function onNavClick(e) {
    var a = e.currentTarget;
    var href = a.getAttribute("href") || "";
    if (href.indexOf("#") !== 0) return; // real external/page link, let it be

    e.preventDefault();
    if (sceneReady) pulseAt(e.clientX, e.clientY, { warm: href === "#/about" || currentRoute === "about" });

    if (href === "#/about") {
      goToRoute("about", null);
    } else if (href === "#/" || href === "./index.html") {
      goToRoute("home", null);
    } else if (href === "#projects" || href === "#tools" || href === "#featured") {
      goToRoute("home", href.slice(1));
    }
  }

  document.querySelectorAll('a[href="#/"], a[href="#/about"], a[href="./index.html"], a[href="#projects"], a[href="#tools"], a[href="#featured"]').forEach(function (a) {
    a.addEventListener("click", onNavClick);
  });

  window.addEventListener("popstate", function () {
    var parsed = parseHash(location.hash);
    goToRoute(parsed.route, parsed.anchor, { push: false });
  });

  /* ---------- section-enter accent pulses (within Home) ----------- */
  function setupSectionPulses() {
    if (!sceneReady || !("IntersectionObserver" in window)) return;
    var targets = [
      { el: document.querySelector(".nne-header"), warm: false },
      { el: document.querySelector(".projects-section .category-header"), warm: false },
      { el: document.querySelector(".tools-section .category-header"), warm: true },
    ];
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var r = entry.boundingClientRect;
          var t = targets.find(function (x) { return x.el === entry.target; });
          pulseAt(r.left + r.width / 2, r.top + r.height / 2, { warm: t && t.warm });
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.35 }
    );
    targets.forEach(function (t) {
      if (t.el) io.observe(t.el);
    });
  }

  /* ---------- initial route (no transition on first paint) -------- */
  function boot() {
    var parsed = parseHash(location.hash);
    currentRoute = parsed.route;
    viewHome.hidden = parsed.route === "about";
    viewAbout.hidden = parsed.route !== "about";
    viewHome.classList.toggle("is-active", parsed.route !== "about");
    viewAbout.classList.toggle("is-active", parsed.route === "about");
    document.title = titleFor(parsed.route);
    updateNav(parsed.route, parsed.anchor);
    if (sceneReady) morphTo(parsed.route === "about" ? "about" : "home", { duration: 1 });
    if (parsed.anchor) {
      requestAnimationFrame(function () { smoothScrollTo(parsed.anchor); });
    }
    setupSectionPulses();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
