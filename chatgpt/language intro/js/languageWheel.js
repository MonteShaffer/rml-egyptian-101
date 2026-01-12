/* global jQuery */
(function ($) {
  "use strict";

  // -------------------------------
  // Primal definitions (LOCKED so far)
  // Unknowns are intentionally placeholders.
  // -------------------------------
  const PRIMAL_DEFINITIONS = {
    vowels: {
      "A": "Up / ascent; celestial/soul contextually (not always).",
      "E": "Monad; center / reference point (constructed center).",
      "I": "Water / fluid domain (incl. bodily fluids by context).",
      "O": "Depth / profoundness (quality of deepness).",
      "U": "Slope / gradient (up or down).",
      "ʔ": "NULL / intentional stop; boundary control operator (glottal stop).",
      "AE": "(definition pending)",
      "ə": "(definition pending)"
    },
    consonants: {
      "R": "Manifestation (making internal → external / perceivable).",
      "L": "Continuity (unbroken persistence / carry-through).",
      "T": "Horizon / infinite line; plane/boundary reference.",
      "N": "Interface / meeting place between elements.",
      "S": "Make / set / assert (to make it so).",
      "M": "Turning (modulation / reversal / internal circulation).",
      "G": "Bounded resistance / obstruction (hard stop).",
      "K": "Unbounded / infinite-scale operator (beyond finitude).",
      "H": "Breath (the breathing sound/operator).",
      "B": "Foot / grounding (earth-bound contact).",
      "D": "Hand (above; heavenly side in your axis mapping).",
      "V": "Bottom of a thing (lower extremity; proximate to foot domain).",
      "Y": "Directed force / focused agency (strike/aimed motion).",
      "P": "Class / membership operator (class object).",

      // placeholders for not-yet-defined consonants in the wheel:
      "ch": "(definition pending)",
      "th": "(definition pending)",
      "sh": "(definition pending)",
      "zh": "(definition pending)",
      "J": "(definition pending)",
      "Z": "(definition pending)",
      "W": "(definition pending)",
      "F": "(definition pending)",
      "p": "(definition pending)",
      "b": "(definition pending)",
      "v": "(definition pending)"
    },
    clicks: {
      "ʘ": "(definition pending)",
      "ǁ": "(definition pending)",
      "ǀ": "(definition pending)"
    }
  };

  function defText(token) {
    // Try vowel first, then consonant, then click. Fall back to pending.
    return (
      PRIMAL_DEFINITIONS.vowels[token] ||
      PRIMAL_DEFINITIONS.consonants[token] ||
      PRIMAL_DEFINITIONS.clicks[token] ||
      "(definition pending)"
    );
  }

  // -------------------------------
  // Helpers
  // -------------------------------
  function degToRad(deg) {
    return (deg * Math.PI) / 180;
  }

  // theta degrees where 0 is "north" (up), increasing clockwise
  function polarToXY(cx, cy, r, thetaDeg) {
    const t = degToRad(thetaDeg);
    const x = cx + r * Math.sin(t);
    const y = cy - r * Math.cos(t);
    return { x, y };
  }

  function svgEl(name, attrs = {}) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
    return el;
  }

  function addTitle(node, text) {
    const t = svgEl("title");
    t.textContent = text;
    node.appendChild(t);
  }

  // -------------------------------
  // Plugin
  // -------------------------------
  const defaults = {
    radiusPx: 300,
    paddingFactor: 0.10,

    // show/hide classes
    showClasses: {
      primalVowels: true,
      stressVowels: false,
      blendVowels: false,
      consonants: true,
      clicks: false
    },

    // geometry
    showCenterLines: true,
    showInnerCircles: true,
    showRadials: true,
    showPentagram: true,

    // monad E (special element)
    showMonadE: true,

    // definitions UI
    showDefinitionsPanel: true,

    // vowel placement
    // 5 primals equally spaced on outer radius, starting with A at -22° (22° left of north)
    primalVowelStartTheta: -22, // degrees
    primalVowels: ["A", "I", "U", "O", "ʔ"],

    // consonant ring positions on 2/3 radius
    consonants: [
	{ token: "R", theta: -10 },
	{ token: "L", theta: 0 },   
      { token: "D", theta: 10 },   // hand
      { token: "N", theta: 22 },
      { token: "T", theta: 34 },
      

      { token: "S",  theta: 65 },
      { token: "ch", theta: 80 },
      { token: "th", theta: 95 },
      { token: "sh", theta: 110 },

      { token: "M", theta: 130 },
      { token: "B", theta: 140 },  // foot
      { token: "V", theta: 150 },
      { token: "P", theta: 160 },
      { token: "W", theta: 170 },
      { token: "F", theta: 180 },

      { token: "Y", theta: 200 },

      { token: "K", theta: 260 },
      { token: "G", theta: 270 },

      { token: "H",  theta: 285 },
      { token: "zh", theta: 300 },
      { token: "J",  theta: 315 },
      { token: "Z",  theta: 330 }
    ],

    // clicks ring positions on 1/3 radius
    clicks: [
      { token: "ǁ", theta: -5 },
      { token: "ǀ", theta: 30 },
      { token: "ʘ", theta: 150 }
    ]
  };

  $.fn.languageWheel = function (options) {
    const settings = $.extend(true, {}, defaults, options);

    return this.each(function () {
      const $host = $(this);
      $host.empty();

      const radius = settings.radiusPx;
      const pad = radius * settings.paddingFactor;
      const size = (radius + pad) * 2;

      // Layout wrapper so we can add a side panel
      const $wrap = $("<div/>", { class: "lw-appwrap" }).css({
        display: "flex",
        gap: "18px",
        alignItems: "center"
      });

      const $wheelBox = $("<div/>", { class: "lw-container" }).css({
        width: `${size}px`,
        height: `${size}px`
      });

      $wrap.append($wheelBox);

      // Optional definitions panel
      if (settings.showDefinitionsPanel) {
        const $panel = $("<div/>", { class: "lw-definitions" });
        $panel.append($("<h2/>").text("Primal Definitions"));
        $panel.append(
          $("<p/>", { class: "lw-hint" }).text("Hover wheel labels for tooltips. Undefined items are placeholders.")
        );

        const $grid = $("<div/>", { class: "lw-def-grid" });

        function addRow(token) {
          const text = defText(token);
          $grid.append($("<div/>", { class: "lw-def-token" }).text(token));
          $grid.append(
            $("<div/>", {
              class: "lw-def-text" + (text.includes("pending") ? " lw-def-pending" : "")
            }).text(text)
          );
        }

        // Vowels (include E always, plus primals)
        addRow("E");
        settings.primalVowels.forEach(addRow);

        // A few known blends/stress placeholders if present in definition map
        if (PRIMAL_DEFINITIONS.vowels["AE"]) addRow("AE");
        if (PRIMAL_DEFINITIONS.vowels["ə"]) addRow("ə");

        // Consonants (from configured ring + any important locked ones that might not be on ring)
        const seen = new Set();
        settings.consonants.forEach((c) => {
          if (!seen.has(c.token)) {
            seen.add(c.token);
            addRow(c.token);
          }
        });

        // Clicks
        if (settings.showClasses.clicks) {
          settings.clicks.forEach((c) => addRow(c.token));
        } else {
          // still show placeholders for click tokens if you want a reminder
          // comment out if you prefer not to show them when hidden
          ["ǁ", "ǀ", "ʘ"].forEach(addRow);
        }

        $panel.append($grid);
        $wrap.append($panel);
      }

      $host.append($wrap);

      // SVG root
      const svg = svgEl("svg", {
        class: "lw-svg",
        viewBox: `0 0 ${size} ${size}`,
        width: size,
        height: size
      });

      // Two-layer groups: geometry + labels
      const gGeom = svgEl("g", { class: "lw-layer-geom" });
      const gLabels = svgEl("g", { class: "lw-layer-labels" });

      svg.appendChild(gGeom);
      svg.appendChild(gLabels);
      $wheelBox[0].appendChild(svg);

      const cx = size / 2;
      const cy = size / 2;

      // -------------------------------
      // Geometry (no outer circle; bleed center lines into padding)
      // -------------------------------
      if (settings.showCenterLines) {
        // vertical
        gGeom.appendChild(
          svgEl("line", {
            x1: cx, y1: 0,
            x2: cx, y2: size,
            class: "lw-centerline"
          })
        );
        // horizontal
        gGeom.appendChild(
          svgEl("line", {
            x1: 0, y1: cy,
            x2: size, y2: cy,
            class: "lw-centerline"
          })
        );
        gGeom.appendChild(svgEl("circle", { cx, cy, r: 3, class: "lw-center-dot" }));
      }

      if (settings.showInnerCircles) {
        // 2/3 circle
        gGeom.appendChild(
          svgEl("circle", { cx, cy, r: radius * (2 / 3), class: "lw-inner-circle-2thirds" })
        );
        // 1/3 circle
        gGeom.appendChild(
          svgEl("circle", { cx, cy, r: radius * (1 / 3), class: "lw-inner-circle-1third" })
        );
      }

      // -------------------------------
      // Primal vowels on outer radius
      // -------------------------------
      const vowelPoints = [];
      if (settings.showClasses.primalVowels) {
        const start = settings.primalVowelStartTheta; // A at -22°
        const step = 360 / settings.primalVowels.length; // 72°
        settings.primalVowels.forEach((v, idx) => {
          const theta = start + idx * step;
          const p = polarToXY(cx, cy, radius, theta);
          vowelPoints.push({ token: v, theta, x: p.x, y: p.y });

          // radial lines + tick marks
          if (settings.showRadials) {
            gGeom.appendChild(
              svgEl("line", { x1: cx, y1: cy, x2: p.x, y2: p.y, class: "lw-radial" })
            );

            // dots at 1/3 and 2/3
            const p13 = polarToXY(cx, cy, radius * (1 / 3), theta);
            const p23 = polarToXY(cx, cy, radius * (2 / 3), theta);
            gGeom.appendChild(svgEl("circle", { cx: p13.x, cy: p13.y, r: 4.2, class: "lw-tickdot" }));
            gGeom.appendChild(svgEl("circle", { cx: p23.x, cy: p23.y, r: 4.2, class: "lw-tickdot" }));
          }

          // label
          const t = svgEl("text", { x: p.x, y: p.y, class: "lw-label" });
          t.textContent = v;
          addTitle(t, `${v}: ${defText(v)}`);
          gLabels.appendChild(t);
        });

        // pentagram (connect every 2nd point)
        if (settings.showPentagram && vowelPoints.length === 5) {
          const order = [0, 2, 4, 1, 3, 0];
          const d = order
            .map((i, k) => `${k === 0 ? "M" : "L"} ${vowelPoints[i].x} ${vowelPoints[i].y}`)
            .join(" ");
          gGeom.appendChild(svgEl("path", { d, class: "lw-pentagram" }));
        }
      }

      // -------------------------------
      // Monad E (ellipse + label)
      // E is centered slightly north of true center (~1/3 of radius upward)
      // -------------------------------
      if (settings.showMonadE) {
        const eOffset = radius * (1 / 3);
        const ex = cx;
        const ey = cy - eOffset;

        // ellipse size (tweakable)
        const rx = radius * 0.10;
        const ry = radius * 0.07;

        gGeom.appendChild(
          svgEl("ellipse", {
            cx: ex,
            cy: ey,
            rx,
            ry,
            class: "lw-monad-ellipse"
          })
        );

        const te = svgEl("text", { x: ex, y: ey, class: "lw-monad-label" });
        te.textContent = "E";
        addTitle(te, `E: ${defText("E")}`);
        gLabels.appendChild(te);
      }

      // -------------------------------
      // Consonants on 2/3 radius ring
      // -------------------------------
      if (settings.showClasses.consonants) {
        const rCon = radius * (2 / 3);

        settings.consonants.forEach((c) => {
          const p = polarToXY(cx, cy, rCon, c.theta);
          const t = svgEl("text", { x: p.x, y: p.y, class: "lw-consonant-label" });
          t.textContent = c.token;
          addTitle(t, `${c.token}: ${defText(c.token)}`);
          gLabels.appendChild(t);
        });
      }

      // -------------------------------
      // Clicks on 1/3 radius ring (optional)
      // -------------------------------
      if (settings.showClasses.clicks) {
        const rClick = radius * (1 / 3);

        settings.clicks.forEach((c) => {
          const p = polarToXY(cx, cy, rClick, c.theta);
          const t = svgEl("text", { x: p.x, y: p.y, class: "lw-click-label" });
          t.textContent = c.token;
          addTitle(t, `${c.token}: ${defText(c.token)}`);
          gLabels.appendChild(t);
        });
      }
    });
  };
})(jQuery);
