/* Emerald Luxury Events — interactions (no dependencies) */
(function () {
  "use strict";
  var d = document, w = window;
  var reduce = w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PHONE = "40745998018";

  /* ---------- header: solid on scroll, hide on scroll down ---------- */
  var header = d.querySelector(".site-header"), lastY = 0, toTop = d.querySelector(".to-top");
  function onScroll() {
    var y = w.scrollY;
    if (header) {
      header.classList.toggle("scrolled", y > 40);
      header.classList.toggle("hide", y > 500 && y > lastY && !d.body.classList.contains("menu-open"));
    }
    if (toTop) toTop.classList.toggle("show", y > 900);
    lastY = y;
  }
  w.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener("click", function () { w.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });

  /* ---------- mobile menu ---------- */
  var burger = d.querySelector(".burger");
  if (burger) {
    burger.addEventListener("click", function () {
      var open = d.body.classList.toggle("menu-open");
      burger.setAttribute("aria-expanded", open);
      d.querySelectorAll(".mobile-menu li").forEach(function (li, i) { li.style.transitionDelay = open ? (60 + i * 35) + "ms" : "0ms"; });
    });
    d.querySelectorAll(".mobile-menu a").forEach(function (a) {
      a.addEventListener("click", function () { d.body.classList.remove("menu-open"); burger.setAttribute("aria-expanded", false); });
    });
  }
  d.querySelectorAll(".has-sub > button").forEach(function (b) {
    b.addEventListener("click", function () {
      var li = b.parentElement, open = li.classList.toggle("open");
      b.setAttribute("aria-expanded", open);
    });
  });
  d.addEventListener("keydown", function (e) {
    if (e.key === "Escape") d.querySelectorAll(".has-sub.open").forEach(function (li) { li.classList.remove("open"); });
  });

  /* ---------- reveal on scroll ---------- */
  var rvEls = d.querySelectorAll(".rv,.rv-img");
  if ("IntersectionObserver" in w && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    rvEls.forEach(function (el) {
      var sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      if (el.dataset.delay === undefined && el.parentElement && el.parentElement.hasAttribute("data-stagger")) el.style.transitionDelay = (sib * 90) + "ms";
      else if (el.dataset.delay) el.style.transitionDelay = el.dataset.delay + "ms";
      io.observe(el);
    });
  } else {
    rvEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- counters ---------- */
  var counters = d.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in w) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, end = +el.dataset.count, t0 = null, dur = 1800;
        co.unobserve(el);
        if (reduce) { el.textContent = end; return; }
        (function tick(t) {
          if (!t0) t0 = t;
          var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
          el.textContent = Math.round(end * e);
          if (p < 1) requestAnimationFrame(tick);
        })(performance.now());
      });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { co.observe(c); });
  }

  /* ---------- hero video: pick size, pause offscreen ---------- */
  var vid = d.querySelector(".hero-media video");
  if (vid) {
    if (reduce) { vid.removeAttribute("autoplay"); vid.pause(); }
    else {
      var src = w.innerWidth < 760 ? vid.dataset.sm : vid.dataset.lg;
      vid.src = src;
      vid.play && vid.play().catch(function () {});
      if ("IntersectionObserver" in w) {
        new IntersectionObserver(function (en) { en[0].isIntersecting ? vid.play().catch(function () {}) : vid.pause(); }).observe(vid);
      }
    }
  }

  /* ---------- gold sparkles (hero) ---------- */
  var cv = d.getElementById("sparkles");
  if (cv && !reduce) {
    var ctx = cv.getContext("2d"), parts = [], W, H, dpr = Math.min(2, w.devicePixelRatio || 1), running = true;
    function size() { W = cv.offsetWidth; H = cv.offsetHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); w.addEventListener("resize", size);
    var N = w.innerWidth < 760 ? 40 : 90;
    for (var i = 0; i < N; i++) parts.push(spawn(true));
    function spawn(initial) {
      return { x: Math.random() * W, y: initial ? Math.random() * H : H + 10, r: Math.random() * 1.8 + .4, vy: -(Math.random() * .35 + .12), vx: (Math.random() - .5) * .18, a: Math.random() * .7 + .2, tw: Math.random() * Math.PI * 2 };
    }
    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx; p.y += p.vy; p.tw += .04;
        if (p.y < -10) parts[i] = p = spawn(false);
        var al = p.a * (.55 + .45 * Math.sin(p.tw));
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, "rgba(246,226,170," + al + ")");
        g.addColorStop(1, "rgba(201,164,92,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.283); ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    draw();
    if ("IntersectionObserver" in w) new IntersectionObserver(function (en) { var was = running; running = en[0].isIntersecting; if (running && !was) draw(); }).observe(cv);
  }

  /* ---------- parallax ---------- */
  var px = d.querySelectorAll("[data-parallax]");
  if (px.length && !reduce) {
    var ticking = false;
    function para() {
      px.forEach(function (el) {
        var r = el.getBoundingClientRect(), k = +el.dataset.parallax || .1;
        if (r.bottom < 0 || r.top > w.innerHeight) return;
        var off = (r.top + r.height / 2 - w.innerHeight / 2) * k;
        el.style.transform = "translate3d(0," + off.toFixed(1) + "px,0)";
      });
      ticking = false;
    }
    w.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(para); } }, { passive: true });
    para();
  }

  /* ---------- halls showcase (hover / focus switches image) ---------- */
  var hallLinks = d.querySelectorAll(".hall-list a[data-hall]");
  hallLinks.forEach(function (a) {
    function act() {
      hallLinks.forEach(function (x) { x.classList.toggle("on", x === a); });
      d.querySelectorAll(".hall-stage figure").forEach(function (f) { f.classList.toggle("on", f.dataset.hall === a.dataset.hall); });
    }
    a.addEventListener("mouseenter", act);
    a.addEventListener("focus", act);
  });

  /* ---------- planner ---------- */
  var planner = d.getElementById("planner");
  if (planner) {
    var data = JSON.parse(d.getElementById("planner-data").textContent);
    var range = planner.querySelector("input[type=range]"), out = planner.querySelector("output");
    var type = "nunta";
    var res = d.getElementById("planner-result");
    planner.querySelectorAll(".chip").forEach(function (c) {
      c.addEventListener("click", function () {
        planner.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", x === c); });
        type = c.dataset.type; update();
      });
    });
    range.addEventListener("input", update);
    function update() {
      var n = +range.value, min = +range.min, max = +range.max;
      out.textContent = n >= max ? max + "+" : n;
      range.style.setProperty("--p", ((n - min) / (max - min) * 100) + "%");
      var halls = data.halls.filter(function (h) { return h.cap >= n; }).sort(function (a, b) { return a.cap - b.cap; });
      var best = halls[0] || data.halls[data.halls.length - 1];
      var pref = data.prefer[type];
      if (pref) { var p = halls.filter(function (h) { return pref.indexOf(h.id) > -1; })[0]; if (p && p.cap - n < 260) best = p; }
      var alts = halls.filter(function (h) { return h !== best; }).slice(0, 2);
      var label = data.types[type];
      res.querySelector("img").src = best.img;
      res.querySelector("img").alt = best.name;
      res.querySelector("h3").textContent = best.name;
      res.querySelector(".match").textContent = label + " · " + (n >= max ? max + "+" : n) + " invitați";
      res.querySelector("p").textContent = best.blurb;
      res.querySelector(".cap-v").textContent = "până la " + best.cap + " de locuri";
      res.querySelector(".alts").innerHTML = alts.length ? "Alternative potrivite: " + alts.map(function (h) { return '<a href="' + h.url + '">' + h.name + "</a>"; }).join(" · ") : "Pentru evenimente de această anvergură, vă propunem o vizionare dedicată.";
      res.querySelector(".see").href = best.url;
      var msg = "Bună ziua! Aș dori o ofertă pentru " + label.toLowerCase() + " cu aproximativ " + n + " invitați. Salonul care m-a interesat: " + best.name + ".";
      res.querySelector(".wa").href = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(msg);
    }
    update();
  }

  /* ---------- lightbox ---------- */
  var lb = d.querySelector(".lightbox");
  if (lb) {
    var lbImg = lb.querySelector("img"), lbCount = lb.querySelector(".lb-count"), group = [], idx = 0, lastFocus;
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
      e.preventDefault();
      var g = b.dataset.group || "all";
      group = Array.prototype.filter.call(d.querySelectorAll('[data-full][data-group="' + g + '"]'), function (x) { return !x.hidden; });
      lastFocus = b;
      lb.classList.add("open"); lb.setAttribute("aria-hidden", "false");
      show(group.indexOf(b));
      lb.querySelector(".lb-close").focus();
    });
    function close() { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); if (lastFocus) lastFocus.focus(); }
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

  /* ---------- gallery filters ---------- */
  d.querySelectorAll(".filters .chip").forEach(function (c) {
    c.addEventListener("click", function () {
      var f = c.dataset.filter;
      c.parentElement.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", x === c); });
      d.querySelectorAll(".masonry [data-cat]").forEach(function (b) { b.hidden = f !== "all" && b.dataset.cat.indexOf(f) === -1; });
    });
  });

  /* ---------- enquiry form → WhatsApp / e-mail ---------- */
  d.querySelectorAll("form.enquiry").forEach(function (f) {
    function compose() {
      var v = function (n) { var el = f.elements[n]; return el ? el.value.trim() : ""; };
      var lines = ["Bună ziua! Aș dori să programez o vizionare la Emerald Luxury Events."];
      if (v("nume")) lines.push("Nume: " + v("nume"));
      if (v("telefon")) lines.push("Telefon: " + v("telefon"));
      if (v("eveniment")) lines.push("Eveniment: " + v("eveniment"));
      if (v("data")) lines.push("Data dorită: " + v("data"));
      if (v("invitati")) lines.push("Număr invitați: " + v("invitati"));
      if (v("mesaj")) lines.push("Mesaj: " + v("mesaj"));
      return lines.join("\n");
    }
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!f.reportValidity()) return;
      w.open("https://wa.me/" + PHONE + "?text=" + encodeURIComponent(compose()), "_blank", "noopener");
    });
    var mail = f.querySelector("[data-mail]");
    if (mail) mail.addEventListener("click", function () {
      if (!f.reportValidity()) return;
      w.location.href = "mailto:casamuresana@gmail.com?subject=" + encodeURIComponent("Cerere vizionare – Emerald Luxury Events") + "&body=" + encodeURIComponent(compose());
    });
  });

  /* ---------- map (loads Google Maps only on click) ---------- */
  d.querySelectorAll(".map button[data-src]").forEach(function (b) {
    b.addEventListener("click", function () {
      var f = d.createElement("iframe");
      f.src = b.dataset.src; f.title = "Hartă Emerald Luxury Events, Târgu Mureș"; f.loading = "lazy"; f.referrerPolicy = "no-referrer-when-downgrade";
      b.replaceWith(f);
    });
  });

  /* ---------- footer year ---------- */
  d.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
