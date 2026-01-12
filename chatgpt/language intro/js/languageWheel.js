/* global jQuery */
(function ($) {
  "use strict";

  // -------------------------------
  // Primal definitions (LOCKED so far)
  // Unknowns are intentionally placeholders.
  // -------------------------------
  
  const PRIMAL_DEFINITIONS = window.PRIMAL_DEFINITIONS || {};

  function defText(token) {
  return (
    window.PRIMAL_DEFINITIONS?.vowels[token] ||
    window.PRIMAL_DEFINITIONS?.consonants[token] ||
    window.PRIMAL_DEFINITIONS?.clicks[token] ||
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
  const defaults = window.LANGUAGE_WHEEL_DEFAULTS || {};

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
          $("<p/>", { class: "lw-hint" }).text(
            "Hover wheel labels for tooltips. Undefined items are placeholders."
          )
        );

        const $grid = $("<div/>", { class: "lw-def-grid" });

        function addRow(token) {
          const text = defText(token);
          $grid.append($("<div/>", { class: "lw-def-token" }).text(token));
          $grid.append(
            $("<div/>", {
              class:
                "lw-def-text" +
                (text.includes("pending") ? " lw-def-pending" : "")
            }).text(text)
          );
        }

        // Vowels (include E always, plus primals)
        addRow("E");
        settings.primalVowels.forEach(addRow);

        // A few known blends/stress placeholders if present in definition map
        if (PRIMAL_DEFINITIONS.vowels.AE) addRow("AE");
        if (PRIMAL_DEFINITIONS.vowels["ə"]) addRow("ə");

        // Consonants (from configured ring + de-dupe)
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
            x1: cx,
            y1: 0,
            x2: cx,
            y2: size,
            class: "lw-centerline"
          })
        );
        // horizontal
        gGeom.appendChild(
          svgEl("line", {
            x1: 0,
            y1: cy,
            x2: size,
            y2: cy,
            class: "lw-centerline"
          })
        );
        gGeom.appendChild(
          svgEl("circle", { cx, cy, r: 3, class: "lw-center-dot" })
        );
      }

      if (settings.showInnerCircles) {
        // 2/3 circle
        gGeom.appendChild(
          svgEl("circle", {
            cx,
            cy,
            r: radius * (2 / 3),
            class: "lw-inner-circle-2thirds"
          })
        );
        // 1/3 circle
        gGeom.appendChild(
          svgEl("circle", {
            cx,
            cy,
            r: radius * (1 / 3),
            class: "lw-inner-circle-1third"
          })
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
              svgEl("line", {
                x1: cx,
                y1: cy,
                x2: p.x,
                y2: p.y,
                class: "lw-radial"
              })
            );

            // dots at 1/3 and 2/3
            const p13 = polarToXY(cx, cy, radius * (1 / 3), theta);
            const p23 = polarToXY(cx, cy, radius * (2 / 3), theta);
            gGeom.appendChild(
              svgEl("circle", {
                cx: p13.x,
                cy: p13.y,
                r: 4.2,
                class: "lw-tickdot"
              })
            );
            gGeom.appendChild(
              svgEl("circle", {
                cx: p23.x,
                cy: p23.y,
                r: 4.2,
                class: "lw-tickdot"
              })
            );
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
            .map(
              (i, k) =>
                `${k === 0 ? "M" : "L"} ${vowelPoints[i].x} ${vowelPoints[i].y}`
            )
            .join(" ");
          gGeom.appendChild(svgEl("path", { d, class: "lw-pentagram" }));
        }
      }

      // -------------------------------
// Monad E (rotated ellipse + label)
// One vertex at origin, one at (R/3, 10°)
// Vertical height = R/3
// -------------------------------
if (settings.showMonadE) {
  const a = radius / 6;   // semi-major axis (half of R/3)
  const b = radius / 6;   // semi-minor axis (vertical height / 2)
  const theta = 10;       // degrees

  // vertex at origin (center of wheel)
  const v1 = { x: cx, y: cy };

  // second vertex at R/3 along 10°
  const v2 = polarToXY(cx, cy, radius / 3, theta);

  // ellipse center = midpoint of vertices
  const ex = (v1.x + v2.x) / 2;
  const ey = (v1.y + v2.y) / 2;

  // rotated ellipse
  gGeom.appendChild(
    svgEl("ellipse", {
      cx: ex,
      cy: ey,
      rx: a,
      ry: b,
      transform: `rotate(${theta} ${ex} ${ey})`,
      class: "lw-monad-ellipse"
    })
  );

  // label at ellipse center
  const te = svgEl("text", {
    x: ex,
    y: ey,
    class: "lw-monad-label"
  });
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
          const t = svgEl("text", {
            x: p.x,
            y: p.y,
            class: "lw-consonant-label"
          });
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
