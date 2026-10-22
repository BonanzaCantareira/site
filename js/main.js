/* ==========================================================================
   BONANZA CANTAREIRA — Interações
   Vanilla JS, sem dependências externas.
   ========================================================================== */
document.addEventListener("DOMContentLoaded", function () {

  /* Ativa o progressive enhancement das animações de entrada (.reveal).
     Sem esta classe, o CSS mantém todo o conteúdo sempre visível. */
  document.documentElement.classList.add("js-enabled");

  /* ---------------- Header: sombra ao rolar a página ---------------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScrollHeader = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScrollHeader();
    window.addEventListener("scroll", onScrollHeader, { passive: true });
  }

  /* ---------------- Menu mobile (abrir / fechar) ---------------- */
  var navToggle = document.querySelector(".nav-toggle");
  var navClose = document.querySelector(".nav-close");
  var siteNav = document.querySelector(".site-nav");

  function openNav() {
    if (!siteNav) return;
    siteNav.classList.add("is-open");
    document.body.style.overflow = "hidden";
    if (navToggle) navToggle.setAttribute("aria-expanded", "true");
  }
  function closeNav() {
    if (!siteNav) return;
    siteNav.classList.remove("is-open");
    document.body.style.overflow = "";
    if (navToggle) navToggle.setAttribute("aria-expanded", "false");
  }

  if (navToggle) navToggle.addEventListener("click", openNav);
  if (navClose) navClose.addEventListener("click", closeNav);
  if (siteNav) {
    siteNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNav();
  });

  /* ---------------- Animação de entrada (reveal on scroll) ---------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------------- Rastreamento de cliques (GA4) ---------------- */
  /* Eventos recomendados no PRD: WhatsApp, Google Maps e Instagram.
     Função segura: não gera erro mesmo se o gtag estiver bloqueado (ad-blockers). */
  function track(eventName, label) {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, { link_label: label });
    }
  }
  document.querySelectorAll('a[href*="wa.me"]').forEach(function (link) {
    link.addEventListener("click", function () { track("click_whatsapp", link.href); });
  });
  document.querySelectorAll('a[href*="google.com/maps"], a[data-track="maps"]').forEach(function (link) {
    link.addEventListener("click", function () { track("click_maps", link.href); });
  });
  document.querySelectorAll('a[href*="instagram.com"]').forEach(function (link) {
    link.addEventListener("click", function () { track("click_instagram", link.href); });
  });

  /* ---------------- Navegação do Cardápio (tabs + scroll spy) ---------------- */
  var menuNav = document.querySelector(".menu-nav");
  if (menuNav) {
    var menuLinks = Array.prototype.slice.call(menuNav.querySelectorAll("a"));
    var sections = menuLinks
      .map(function (link) { return document.querySelector(link.getAttribute("href")); })
      .filter(Boolean);

    function setActiveLink(id) {
      menuLinks.forEach(function (link) {
        link.classList.toggle("is-active", link.getAttribute("href") === "#" + id);
      });
    }

    if ("IntersectionObserver" in window && sections.length) {
      var spy = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) setActiveLink(entry.target.id);
          });
        },
        { rootMargin: "-45% 0px -50% 0px" }
      );
      sections.forEach(function (sec) { spy.observe(sec); });
    }

    menuLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        setActiveLink(link.getAttribute("href").replace("#", ""));
      });
    });
  }

});

/* ---------------- Carrossel de pratos (home) ---------------- */
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("[data-carousel]").forEach(function (root) {
    var track = root.querySelector(".dish-carousel__track");
    var prev = root.querySelector('[data-dir="-1"]');
    var next = root.querySelector('[data-dir="1"]');
    if (!track || !prev || !next) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function update() {
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    }
    function go(dir) {
      var card = track.querySelector(".dish-card");
      if (!card) return;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 20;
      var visible = Math.max(1, Math.floor(track.clientWidth / (card.offsetWidth + gap)));
      track.scrollBy({ left: dir * visible * (card.offsetWidth + gap), behavior: reduce ? "auto" : "smooth" });
    }
    prev.addEventListener("click", function () { go(-1); });
    next.addEventListener("click", function () { go(1); });
    var ticking = false;
    track.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { update(); ticking = false; });
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  });
});
