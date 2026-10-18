/* Emerald Luxury Events, varianta 2: small, dependency-free behaviour */
(function () {
  "use strict";
  var d = document, w = window;
  var PHONE = "40745998018";
  var reduce = w.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function openUrl(url) {
    var win = w.open(url, "_blank", "noopener");
    if (!win) w.location.href = url;
  }

  /* header turns solid once the opening photo has scrolled away */
  var header = d.querySelector(".site-header");
  if (header && d.body.classList.contains("has-hero")) {
    var onScroll = function () { header.classList.toggle("solid", w.scrollY > 260); };
    w.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* photo rail arrows */
  var rail = d.getElementById("rail");
  d.querySelectorAll("[data-rail]").forEach(function (b) {
    b.addEventListener("click", function () { rail.scrollBy({ left: +b.dataset.rail * rail.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" }); });
  });

  /* mobile menu */
  var burger = d.querySelector(".burger");
  if (burger) {
    burger.addEventListener("click", function () {
      var open = d.body.classList.toggle("menu-open");
      burger.setAttribute("aria-expanded", open);
    });
    d.querySelectorAll(".mobile-menu a").forEach(function (a) {
      a.addEventListener("click", function () { d.body.classList.remove("menu-open"); burger.setAttribute("aria-expanded", false); });
    });
  }
  d.querySelectorAll(".has-sub > button").forEach(function (b) {
    b.addEventListener("click", function () { b.setAttribute("aria-expanded", b.parentElement.classList.toggle("open")); });
  });
  d.addEventListener("click", function (e) {
    d.querySelectorAll(".has-sub.open").forEach(function (li) { if (!li.contains(e.target)) li.classList.remove("open"); });
  });

  /* hero video: smaller file on phones, none when motion is reduced */
  var vid = d.querySelector("video[data-lg]");
  if (vid && !reduce) {
    vid.src = w.innerWidth < 760 ? vid.dataset.sm : vid.dataset.lg;
    var pr = vid.play && vid.play();
    if (pr && pr.catch) pr.catch(function () {});
  }

  /* planner */
  var planner = d.getElementById("planner");
  if (planner) {
    var data = JSON.parse(d.getElementById("planner-data").textContent);
    var range = d.getElementById("guests"), out = planner.querySelector("output"), res = d.getElementById("planner-result");
    var type = "nunta";
    planner.querySelectorAll(".choice").forEach(function (c) {
      c.addEventListener("click", function () {
        planner.querySelectorAll(".choice").forEach(function (x) { x.setAttribute("aria-pressed", x === c); });
        type = c.dataset.type; update();
      });
    });
    range.addEventListener("input", update);
    function update() {
      var n = +range.value, max = +range.max;
      out.textContent = n >= max ? max : n;
      var fit = data.halls.filter(function (h) { return h.cap >= n; });
      var best = fit[0] || data.halls[data.halls.length - 1];
      var pref = data.prefer[type];
      if (pref) { var p = fit.filter(function (h) { return pref.indexOf(h.id) > -1; })[0]; if (p && p.cap - n < 260) best = p; }
      var alts = fit.filter(function (h) { return h !== best; }).slice(0, 2);
      res.querySelector("img").src = best.img;
      res.querySelector("img").alt = best.name;
      res.querySelector(".match").textContent = data.types[type] + ", " + n + " de invitați";
      res.querySelector("h3").textContent = best.name;
      res.querySelector(".seats").textContent = "Până la " + best.cap + " de locuri.";
      res.querySelector(".alts").innerHTML = alts.length ? "Se potrivesc și: " + alts.map(function (h) { return '<a class="more" href="' + h.url + '">' + h.name + "</a>"; }).join(", ") + "." : "";
      res.querySelector(".see").href = best.url;
      res.querySelector(".wa").href = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent("Bună ziua! Aș dori o ofertă pentru " + data.types[type].toLowerCase() + ", aproximativ " + n + " de invitați, în " + best.name + ".");
    }
    update();
  }

  /* lightbox */
  var lb = d.querySelector(".lightbox");
  if (lb) {
    var lbImg = lb.querySelector("img"), lbCount = lb.querySelector(".lb-count"), group = [], idx = 0, last;
    function show(i) {
      idx = (i + group.length) % group.length;
      var b = group[idx];
      lbImg.style.opacity = 0;
      var im = new Image();
      im.onload = function () { lbImg.src = im.src; lbImg.alt = b.dataset.alt || ""; lbImg.style.opacity = 1; };
      im.src = b.dataset.full;
      lbCount.textContent = (idx + 1) + " / " + group.length;
    }
    d.addEventListener("click", function (e) {
      var b = e.target.closest("[data-full]");
      if (!b) return;
      group = Array.prototype.filter.call(d.querySelectorAll('[data-full][data-group="' + b.dataset.group + '"]'), function (x) { return !x.hidden; });
      last = b;
      lb.classList.add("open"); lb.setAttribute("aria-hidden", "false");
      show(group.indexOf(b));
      lb.querySelector(".lb-close").focus();
    });
    function close() { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); if (last) last.focus(); }
    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector(".lb-prev").addEventListener("click", function () { show(idx - 1); });
    lb.querySelector(".lb-next").addEventListener("click", function () { show(idx + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    d.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
    var sx = 0;
    lb.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) { var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); });
  }

  /* gallery filters */
  d.querySelectorAll(".filters .choice").forEach(function (c) {
    c.addEventListener("click", function () {
      var f = c.dataset.filter;
      c.parentElement.querySelectorAll(".choice").forEach(function (x) { x.setAttribute("aria-pressed", x === c); });
      d.querySelectorAll(".photo-grid [data-cat]").forEach(function (b) { b.hidden = f !== "all" && b.dataset.cat.indexOf(f) === -1; });
    });
  });

  /* enquiry form: compose a WhatsApp or e-mail message */
  d.querySelectorAll("form.enquiry").forEach(function (f) {
    function text() {
      var v = function (n) { var el = f.elements[n]; return el ? el.value.trim() : ""; };
      var l = ["Bună ziua! Aș dori să programez o vizionare la Emerald Luxury Events."];
      [["nume", "Nume"], ["telefon", "Telefon"], ["eveniment", "Eveniment"], ["data", "Data dorită"], ["invitati", "Număr de invitați"], ["mesaj", "Mesaj"]].forEach(function (k) {
        if (v(k[0])) l.push(k[1] + ": " + v(k[0]));
      });
      return l.join("\n");
    }
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!f.reportValidity()) return;
      openUrl("https://wa.me/" + PHONE + "?text=" + encodeURIComponent(text()));
    });
    var mail = f.querySelector("[data-mail]");
    if (mail) mail.addEventListener("click", function () {
      if (!f.reportValidity()) return;
      w.location.href = "mailto:casamuresana@gmail.com?subject=" + encodeURIComponent("Cerere vizionare") + "&body=" + encodeURIComponent(text());
    });
  });

  d.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
