/* js/languageWheel.js */
(function ($) {

  const NS = "http://www.w3.org/2000/svg";

  function svgEl(name, attrs) {
    const el = document.createElementNS(NS, name);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  // Polar coordinates:
  // theta = 0° is north, positive clockwise
  function polarToXY(cx, cy, r, thetaDeg) {
    const t = thetaDeg * Math.PI / 180;
    return {
      x: cx + r * Math.sin(t),
      y: cy - r * Math.cos(t)
    };
  }

  $.fn.languageWheel = function (opts) {

    const settings = $.extend(true, {
      unitRadiusPx: 300,
      svgPadFactor: 0.10,

      // Class toggles (clicks OFF by default)
      showClasses: {
        primalVowels: true,
        monad: true,
        consonants: true,
        clicks: false
      },

      primalLabels: ["A", "I", "U", "O", "ʔ"],
      primalStartThetaDeg: -22,
      primalStepDeg: 72,

      monad: {
        label: "E",
        offset: -1 / 3,
        rxFactor: 0.09,
        ryFactor: 0.065
      },

      consonantRadiusFactor: 2 / 3,
      clickRadiusFactor: 1 / 3,

      consonants: [],
      clicks: []
    }, opts);

    return this.each(function () {

      const r = settings.unitRadiusPx;
      const pad = r * settings.svgPadFactor;
      const size = r * 2;
      const svgSize = size + pad * 2;

      const cx = r, cy = r;

      const $host = $(this).empty().css({
        width: svgSize + "px",
        height: svgSize + "px"
      });

      const svg = svgEl("svg", {
        class: "lw-svg",
        viewBox: `0 0 ${svgSize} ${svgSize}`
      });

      const gGeom = svgEl("g", { transform: `translate(${pad},${pad})` });
      const gLbls = svgEl("g", { transform: `translate(${pad},${pad})` });

      svg.appendChild(gGeom);
      svg.appendChild(gLbls);
      $host[0].appendChild(svg);

      // ---- Helpers ----
      const line = (x1, y1, x2, y2, c) =>
        gGeom.appendChild(svgEl("line", { x1, y1, x2, y2, class: c }));

      const circle = (x, y, rr, c) =>
        gGeom.appendChild(svgEl("circle", { cx: x, cy: y, r: rr, class: c }));

      const ellipse = (x, y, rx, ry, c) =>
        gGeom.appendChild(svgEl("ellipse", { cx: x, cy: y, rx, ry, class: c }));

      const label = (x, y, t, c) => {
        const e = svgEl("text", { x, y, class: c });
        e.textContent = t;
        gLbls.appendChild(e);
      };

      // ---- Center guide lines bleed into padding ----
      line(cx, -pad, cx, size + pad, "lw-centerline");
      line(-pad, cy, size + pad, cy, "lw-centerline");

      // ---- Inner circles at 2/3 and 1/3 ----
      circle(cx, cy, (2 / 3) * r, "lw-inner-circle-2thirds");
      circle(cx, cy, (1 / 3) * r, "lw-inner-circle-1third");

      // ---- Primals ----
      const primals = [];
      for (let i = 0; i < 5; i++) {
        const theta = settings.primalStartThetaDeg + i * settings.primalStepDeg;
        primals.push({
          ...polarToXY(cx, cy, r, theta),
          label: settings.primalLabels[i]
        });
      }

      // Radials + tick dots + primal labels (guarded)
      primals.forEach(p => {
        // Radial line
        line(cx, cy, p.x, p.y, "lw-radial");
        // Tick dots at 1/3 and 2/3 of each radial
        [1 / 3, 2 / 3].forEach(f =>
          circle(cx + (p.x - cx) * f, cy + (p.y - cy) * f, 3, "lw-tickdot")
        );
      });

      if (settings.showClasses.primalVowels) {
        primals.forEach(p => label(p.x, p.y, p.label, "lw-label"));
      }

      // ---- Monad E (guarded) ----
      if (settings.showClasses.monad) {
        const my = cy + settings.monad.offset * r;
        ellipse(
          cx,
          my,
          settings.monad.rxFactor * r,
          settings.monad.ryFactor * r,
          "lw-monad-ellipse"
        );
        label(cx, my, settings.monad.label, "lw-monad-label");
      }

      // ---- Consonants on 2/3 ring (FIXED: guarded) ----
      if (settings.showClasses.consonants && Array.isArray(settings.consonants)) {
        settings.consonants.forEach(c => {
          if (!c || typeof c.thetaDeg !== "number" || c.label == null) return;
          const p = polarToXY(cx, cy, settings.consonantRadiusFactor * r, c.thetaDeg);
          label(p.x, p.y, String(c.label), "lw-consonant-label");
        });
      }

      // ---- Clicks on 1/3 ring (FIXED: guarded; OFF by default) ----
      if (settings.showClasses.clicks && Array.isArray(settings.clicks)) {
        settings.clicks.forEach(c => {
          if (!c || typeof c.thetaDeg !== "number" || c.label == null) return;
          const p = polarToXY(cx, cy, settings.clickRadiusFactor * r, c.thetaDeg);
          label(p.x, p.y, String(c.label), "lw-click-label");
        });
      }

    });
  };

})(jQuery);
