(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTouch = window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches;

  // ---------------------------------------------------------
  // Footer year
  // ---------------------------------------------------------
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------------------------------------------------------
  // Sticky header shadow on scroll
  // ---------------------------------------------------------
  var header = document.getElementById("siteHeader");
  var onScroll = function () {
    if (!header) return;
    if (window.scrollY > 12) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // ---------------------------------------------------------
  // Mobile menu
  // ---------------------------------------------------------
  var menuToggle = document.getElementById("menuToggle");
  var menuToggleClose = document.getElementById("menuToggleClose");
  var mobilePanel = document.getElementById("mobilePanel");

  function openMobilePanel() {
    if (!mobilePanel) return;
    mobilePanel.classList.add("open");
    menuToggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("modal-locked");
  }
  function closeMobilePanel() {
    if (!mobilePanel) return;
    mobilePanel.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("modal-locked");
  }
  if (menuToggle && mobilePanel) {
    menuToggle.addEventListener("click", function () {
      if (mobilePanel.classList.contains("open")) closeMobilePanel();
      else openMobilePanel();
    });
  }
  if (menuToggleClose) menuToggleClose.addEventListener("click", closeMobilePanel);
  if (mobilePanel) {
    mobilePanel.querySelectorAll("a, button").forEach(function (el) {
      el.addEventListener("click", function () {
        if (el.tagName === "A") closeMobilePanel();
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mobilePanel.classList.contains("open")) closeMobilePanel();
    });
  }

  // ---------------------------------------------------------
  // Reveal-on-scroll
  // ---------------------------------------------------------
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  }

  // ---------------------------------------------------------
  // FAQ accordion
  // ---------------------------------------------------------
  var faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach(function (item) {
    var btn = item.querySelector(".faq-q");
    btn.addEventListener("click", function () {
      var isOpen = item.classList.contains("open");
      faqItems.forEach(function (other) {
        other.classList.remove("open");
        other.querySelector(".faq-q").setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });

  // ---------------------------------------------------------
  // 3 / 6 / 9 falling easter egg
  // ---------------------------------------------------------
  function seededDigit(i) {
    var seq = [3, 6, 9];
    return seq[i % 3];
  }

  function populateDigitField(field) {
    var count = parseInt(field.getAttribute("data-digits"), 10) || 5;
    if (reduceMotion) {
      // Minimal, static, near-invisible — no motion.
      for (var s = 0; s < Math.min(count, 3); s++) {
        var still = document.createElement("span");
        still.className = "atmo-digit";
        still.textContent = seededDigit(s);
        still.style.left = (10 + s * 30) + "%";
        still.style.top = (15 + s * 22) + "%";
        still.style.fontSize = (14 + (s % 3) * 4) + "px";
        still.style.opacity = (0.03 + s * 0.008).toFixed(3);
        field.appendChild(still);
      }
      return;
    }
    for (var n = 0; n < count; n++) {
      var span = document.createElement("span");
      span.className = "falling-digit";
      span.setAttribute("aria-hidden", "true");
      span.textContent = seededDigit(n + Math.floor(Math.random() * 3));

      var left = Math.random() * 96;
      var duration = 16 + Math.random() * 26; // 16s - 42s
      var delay = -(Math.random() * duration); // start mid-flight
      var size = 10 + Math.random() * 14; // 10-24px
      var opacity = 0.025 + Math.random() * 0.045; // 0.025-0.07
      var blur = Math.random() > 0.6 ? (0.4 + Math.random() * 0.8).toFixed(1) : 0;
      var drift = (Math.random() * 60 - 30).toFixed(0) + "px";
      var rotStart = Math.floor(Math.random() * 40 - 20);
      var rotEnd = rotStart + Math.floor(Math.random() * 60 + 20);

      span.style.left = left + "%";
      span.style.fontSize = size.toFixed(0) + "px";
      span.style.opacity = opacity.toFixed(3);
      span.style.animationDuration = duration.toFixed(1) + "s";
      span.style.animationDelay = delay.toFixed(1) + "s";
      span.style.setProperty("--drift", drift);
      span.style.setProperty("--rot-start", rotStart + "deg");
      span.style.setProperty("--rot-end", rotEnd + "deg");
      if (blur) span.style.filter = "blur(" + blur + "px)";

      field.appendChild(span);
    }
  }

  document.querySelectorAll(".digit-field").forEach(populateDigitField);

  // ---------------------------------------------------------
  // Hero phones — restrained mouse parallax (desktop only)
  // ---------------------------------------------------------
  var heroPhones = document.getElementById("heroPhones");
  var heroParallax = document.getElementById("heroPhonesParallax");
  if (heroPhones && heroParallax && !isTouch && !reduceMotion) {
    heroPhones.addEventListener("mousemove", function (e) {
      var rect = heroPhones.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      heroParallax.style.setProperty("--px", (x * 10).toFixed(1) + "px");
      heroParallax.style.setProperty("--py", (y * 8).toFixed(1) + "px");
    });
    heroPhones.addEventListener("mouseleave", function () {
      heroParallax.style.setProperty("--px", "0px");
      heroParallax.style.setProperty("--py", "0px");
    });
  }

  // ---------------------------------------------------------
  // Interactive search demo (front-end only simulation)
  // ---------------------------------------------------------
  var demoForm = document.getElementById("demoForm");
  var demoDistance = document.getElementById("demoDistance");
  var demoDistanceOut = document.getElementById("demoDistanceOut");
  if (demoDistance && demoDistanceOut) {
    demoDistance.addEventListener("input", function () {
      demoDistanceOut.textContent = demoDistance.value + " mi";
    });
  }

  var exampleNames = [
    { name: "Maya, 27", tag: "Same hospital", avatar: "avatar-rose" },
    { name: "Noah, 26", tag: "Same birthday", avatar: "avatar-sky" },
    { name: "Isla, 25", tag: "Same city", avatar: "avatar-amber" },
    { name: "Leo, 29", tag: "Same hometown", avatar: "avatar-violet" }
  ];

  if (demoForm) {
    demoForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var city = document.getElementById("demoCity").value;
      var list = document.getElementById("demoResultsList");
      var shuffled = exampleNames.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 3);
      list.innerHTML = "";
      shuffled.forEach(function (p) {
        var card = document.createElement("div");
        card.className = "demo-result-card";
        card.innerHTML =
          '<span class="avatar ' + p.avatar + '"><svg class="ic"><use href="#icon-person"/></svg></span>' +
          '<span class="demo-result-info"><strong>' + p.name + '</strong>' +
          "<p>Connected to " + city + " · example profile</p>" +
          '<span class="demo-result-tag"><svg class="ic sm"><use href="#icon-check"/></svg>' + p.tag + "</span>" +
          "</span>";
        list.appendChild(card);
      });
    });
  }

  // ---------------------------------------------------------
  // App showcase — scroll-synced sticky phone
  // ---------------------------------------------------------
  var showcaseCopies = document.querySelectorAll(".showcase-copy");
  var showcaseScreens = document.querySelectorAll(".showcase-screen");
  if ("IntersectionObserver" in window && showcaseCopies.length && window.innerWidth > 900) {
    var showcaseIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var idx = entry.target.getAttribute("data-copy");
            showcaseCopies.forEach(function (c) { c.classList.remove("active"); });
            entry.target.classList.add("active");
            showcaseScreens.forEach(function (s) {
              s.classList.toggle("active", s.getAttribute("data-screen") === idx);
            });
          }
        });
      },
      { threshold: 0.6, rootMargin: "-20% 0px -20% 0px" }
    );
    showcaseCopies.forEach(function (c) { showcaseIO.observe(c); });
  }

  // ---------------------------------------------------------
  // Get Originly modal
  // ---------------------------------------------------------
  var modalOverlay = document.getElementById("modalOverlay");
  var modalCard = document.getElementById("modalCard");
  var modalClose = document.getElementById("modalClose");
  var modalCopyBtn = document.getElementById("modalCopyBtn");
  var modalCopyMsg = document.getElementById("modalCopyMsg");
  var lastFocused = null;

  function getFocusable() {
    return modalCard.querySelectorAll(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
  }

  function openModal() {
    lastFocused = document.activeElement;
    modalOverlay.classList.add("open");
    document.body.classList.add("modal-locked");
    var focusables = getFocusable();
    if (focusables.length) focusables[0].focus();
    document.addEventListener("keydown", onModalKeydown);
  }

  function closeModal() {
    modalOverlay.classList.remove("open");
    document.body.classList.remove("modal-locked");
    document.removeEventListener("keydown", onModalKeydown);
    if (lastFocused) lastFocused.focus();
  }

  function onModalKeydown(e) {
    if (e.key === "Escape") {
      closeModal();
      return;
    }
    if (e.key === "Tab") {
      var focusables = Array.prototype.slice.call(getFocusable());
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  document.querySelectorAll("[data-open-modal]").forEach(function (trigger) {
    trigger.addEventListener("click", openModal);
  });
  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (modalOverlay) {
    modalOverlay.addEventListener("click", function (e) {
      if (e.target === modalOverlay) closeModal();
    });
  }
  if (modalCopyBtn && modalCopyMsg) {
    modalCopyBtn.addEventListener("click", function () {
      var email = "info@originlyapp.com";
      var done = function () {
        modalCopyMsg.textContent = "Copied to clipboard.";
        modalCopyBtn.classList.add("copied");
        setTimeout(function () {
          modalCopyMsg.textContent = "";
          modalCopyBtn.classList.remove("copied");
        }, 2200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done).catch(function () {
          modalCopyMsg.textContent = "Copy this address: " + email;
        });
      } else {
        modalCopyMsg.textContent = "Copy this address: " + email;
      }
    });
  }
})();
