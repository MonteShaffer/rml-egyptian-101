/* global jQuery */
(function ($) {
  "use strict";


const CLASS_MAP = {
  primalVowels: { svg: "lw-primal-vowels", label: "Primal Vowels" },
  monadE:       { svg: "lw-monad-e",       label: "Monad E" },
  stressedAE:   { svg: "lw-stressed-ae",   label: "Stressed Æ" },
  consonants:   { svg: "lw-consonants",    label: "Consonants" },
  clicks:       { svg: "lw-clicks",        label: "Clicks" }
};


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
  
  function animateSoundString(tokens, pointMemory, gAnim, opts = {}) 
  {
  const stepMs = opts.stepMs ?? 900;
  const endPauseMs = opts.endPauseMs ?? 1800;

		  // cancel any prior run
		  if (animateSoundString._timer) clearTimeout(animateSoundString._timer);
		  animateSoundString._stopped = false;

		  function clearAnim() {
			while (gAnim.firstChild) gAnim.removeChild(gAnim.firstChild);
		  }
			
		function drawArrow(a, b, opts = {}) {
			  const p1 = pointMemory[a];
			  const p2 = pointMemory[b];
			  if (!p1 || !p2) return 0;

			  const x1 = Number(p1.x), y1 = Number(p1.y);
			  const x2 = Number(p2.x), y2 = Number(p2.y);

			  const len = Math.hypot(x2 - x1, y2 - y1);

			  const line = svgEl("line", {
				x1, y1, x2, y2,
				class: "lw-anim-arrow"
			  });

			  // Dash setup: line starts invisible
			  line.style.strokeDasharray = String(len);
			  line.style.strokeDashoffset = String(len);

			  // IMPORTANT: do NOT set marker-end yet (arrowhead would appear immediately)
			  gAnim.appendChild(line);

			  // Constant-speed duration (pixels/sec)
			  const pxPerSec = opts.pxPerSec ?? 900;
			  const minMs = opts.minMs ?? 180;
			  const maxMs = opts.maxMs ?? 1200;

			  let durationMs = (len / pxPerSec) * 1000;
			  durationMs = Math.max(minMs, Math.min(maxMs, durationMs));

			  requestAnimationFrame(() => {
				line.style.transition = `stroke-dashoffset ${durationMs}ms linear`;
				line.style.strokeDashoffset = "0";
			  });

			  // Attach arrowhead near the end of the draw
			  const headAt = opts.headAt ?? 0.88; // 88% of duration feels right
			  setTimeout(() => {
				// Only add the marker if the line still exists (not cleared/stopped)
				if (line.isConnected) {
				  line.setAttribute("marker-end", "url(#lw-arrowhead)");
				}
			  }, Math.floor(durationMs * headAt));

			  return durationMs;
			}




		  function run(i) {
			if (animateSoundString._stopped) return;

			clearAnim();

			if (tokens.length < 2) return;

			const a = tokens[i];
			const b = tokens[(i + 1) % tokens.length];

			// draw one move
			drawArrow(a, b);

			// if we're at the end, pause then restart at 0
			const nextI = i + 1;
			const isEnd = nextI >= tokens.length - 1;

			animateSoundString._timer = setTimeout(() => {
			  if (isEnd) {
				clearAnim();
				animateSoundString._timer = setTimeout(() => run(0), endPauseMs);
			  } else {
				run(nextI);
			  }
			}, stepMs);
		  }

		  run(0);

		  // return controls
		  return {
			stop() {
			  animateSoundString._stopped = true;
			  if (animateSoundString._timer) clearTimeout(animateSoundString._timer);
			},
			clear() {
			  clearAnim();
			}
		  };
	}






function parseQueryString(q, pointMemory) {
		  if (!q) return [];

		  // 1) Build a dictionary of known tokens from pointMemory
		  //    Greedy matching prefers longer tokens first (e.g., "th" before "t").
		  const knownTokens = Object.keys(pointMemory || {});
		  if (!knownTokens.length) return [];

		  const sorted = knownTokens
			.slice()
			.sort((a, b) => b.length - a.length);

		  // 2) Normalize the input: remove whitespace, but keep symbols like Æ, ʔ, ǀ, etc.
		  //    Also keep the original around in case you want spaced-token fast path later.
		  const raw = String(q).trim();

		  // If user provided spaces, try splitting first (fast path)
		  const parts = raw.split(/\s+/).filter(Boolean);
		  if (parts.length > 1) {
			const out = [];
			for (const p of parts) {
			  // Try direct / case variants
			  const direct = resolveToken(p, pointMemory);
			  if (direct) { out.push(direct); continue; }

			  // If a chunk like "HELO" is still unrecognized, greedy-parse that chunk
			  out.push(...greedyParseChunk(p, sorted, pointMemory));
			}
			return out;
		  }

		  // Otherwise greedy-parse the whole string (e.g., "HELO")
		  return greedyParseChunk(raw.replace(/\s+/g, ""), sorted, pointMemory);

		  // --- helpers ---
		  function resolveToken(t, pm) {
			if (pm[t]) return t;
			const up = t.toUpperCase();
			if (pm[up]) return up;
			const low = t.toLowerCase();
			if (pm[low]) return low;
			return null;
		  }

		  function greedyParseChunk(chunk, sortedTokens, pm) {
			const s = chunk;
			const out = [];
			let i = 0;

			while (i < s.length) {
			  // Skip whitespace (just in case)
			  if (/\s/.test(s[i])) { i++; continue; }

			  let matched = null;

			  for (const tok of sortedTokens) {
				// Case-insensitive compare for Latin letters, but preserve canonical token
				// We attempt exact slice match first, then case variants.
				const slice = s.substring(i, i + tok.length);
				if (!slice) continue;

				// Try direct compare (fast)
				if (slice === tok) { matched = tok; break; }

				// Try case-insensitive for alphabetic tokens
				if (slice.toLowerCase() === tok.toLowerCase()) {
				  // Return canonical token as stored in pointMemory
				  matched = resolveToken(tok, pm) || tok;
				  break;
				}
			  }

			  if (matched) {
				out.push(matched);
				i += matched.length;
			  } else {
				// If no token matches at this position, skip one character.
				// (You could also collect errors here for UI feedback.)
				i += 1;
			  }
			}

			return out;
		  }
	}




  
  function applyVisibilityFromShowClasses(settings, svg) {
  if (!settings.showClasses) return;

  Object.entries(settings.showClasses).forEach(([key, enabled]) => {
    const entry = CLASS_MAP[key];
    if (!entry) return;

    const cls = entry.svg;

    svg.querySelectorAll("." + cls).forEach(el => {
      el.style.display = enabled ? "" : "none";
    });
  });
}


  
  function buildControlsPanel(settings) {
 const $card = $(`
  <div class="card shadow-sm">
    <div class="card-header d-flex justify-content-between align-items-center">
      <div class="fw-semibold">Admin</div>
      <div class="btn-group btn-group-sm" role="group" aria-label="Admin controls">
        <button type="button" class="btn btn-outline-secondary lw-btn-stop">Stop</button>
        <button type="button" class="btn btn-outline-secondary lw-btn-clear">Clear</button>
      </div>
    </div>

    <div class="card-body d-flex flex-column gap-3">

      <!-- Query input -->
      <div>
        <div class="input-group input-group-sm">
          <input type="text"
                 class="form-control lw-query"
                 value="HUAH"
                 aria-label="Sound query">
          <button class="btn btn-primary lw-run"
                  type="button"
                  aria-label="Run animation">
            &rarr;
          </button>
        </div>

        <div class="form-text small text-muted">
          Enter sound string (e.g., A I U ʔ Æ th ch)
        </div>
      </div>

      <!-- Toggles -->
      <div class="d-flex flex-column gap-2 lw-toggles"></div>

    </div>
  </div>
`);

  const $toggles = $card.find(".lw-toggles");

  // Generate a switch for each showClasses entry that exists in CLASS_MAP
  Object.entries(settings.showClasses || {}).forEach(([key, enabled]) => {
    if (!CLASS_MAP[key]) return;

    const id = `lw-toggle-${key}`;

    const $row = $(`
      <div class="form-check form-switch m-0">
        <input class="form-check-input lw-toggle"
               type="checkbox"
               id="${id}"
               data-key="${key}"
               ${enabled ? "checked" : ""}>
        <label class="form-check-label" for="${id}">
          ${CLASS_MAP[key].label}
        </label>
      </div>
    `);

    $toggles.append($row);
  });

  return $card;
}



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
      const $host = $(this).empty();
	  
	  
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
	  
/* bootstrap admin panel */



// Wrapper: wheel left, controls right
const $Bwrap = $('<div class="d-flex gap-3 align-items-start"></div>');
const $BwheelCol = $('<div class="flex-shrink-0"></div>');
const $BcontrolCol = $('<div class="flex-grow-1" style="max-width: 360px;"></div>');

$host.append($Bwrap);
$Bwrap.append($BwheelCol, $BcontrolCol);

// Build controls
const $controls = buildControlsPanel(settings);
$BcontrolCol.append($controls);





	  
	  
/*
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
*/

      $host.append($wrap);

      // SVG root
      const svg = svgEl("svg", {
        class: "lw-svg",
        viewBox: `0 0 ${size} ${size}`,
        width: size,
        height: size
      });
	  
	  
 // Root SVG groups (always present, toggled via display)
const gPrimalVowels = svgEl("g", { class: "lw-primal-vowels" });
const gMonadE       = svgEl("g", { class: "lw-monad-e" });
const gStressedAE   = svgEl("g", { class: "lw-stressed-ae" });
const gConsonants   = svgEl("g", { class: "lw-consonants" });
const gClicks       = svgEl("g", { class: "lw-clicks" });

// Non-toggled geometry (always visible unless you want to toggle it too)
const gGeometry     = svgEl("g", { class: "lw-geometry" });

// Append groups ONCE (order matters for layering)
svg.appendChild(gGeometry);
svg.appendChild(gPrimalVowels);
svg.appendChild(gMonadE);
svg.appendChild(gStressedAE);
svg.appendChild(gConsonants);
svg.appendChild(gClicks);



// Animation overlay group (always on top)
const gAnim = svgEl("g", { class: "lw-anim-layer" });
svg.appendChild(gAnim);

// arrows   // marker-end="url(#lw-arrowhead)"
const defs = svgEl("defs");
const marker = svgEl("marker", {
  id: "lw-arrowhead",
  markerWidth: "10",
  markerHeight: "10",
  refX: "7",
  refY: "3",
  orient: "auto",
  markerUnits: "strokeWidth"
});

marker.appendChild(svgEl("path", {
  d: "M0,0 L7,3 L0,6 Z",
  fill: "var(--bs-primary)",
  opacity: 0.75
}));

defs.appendChild(marker);
svg.appendChild(defs);



/*

      // Two-layer groups: geometry + labels
      const gGeom = svgEl("g", { class: "lw-layer-geom" });
      const gLabels = svgEl("g", { class: "lw-layer-labels" });

      svg.appendChild(gGeom);
      svg.appendChild(gLabels);
*/	  
     // $wheelBox[0].appendChild(svg);
$BwheelCol.append(svg);


      const cx = size / 2;
      const cy = size / 2;

      // -------------------------------
      // Geometry (no outer circle; bleed center lines into padding)
      // -------------------------------
      if (settings.showCenterLines) {
        // vertical
        gGeometry.appendChild(
          svgEl("line", {
            x1: cx,
            y1: 0,
            x2: cx,
            y2: size,
            class: "lw-centerline"
          })
        );
        // horizontal
        gGeometry.appendChild(
          svgEl("line", {
            x1: 0,
            y1: cy,
            x2: size,
            y2: cy,
            class: "lw-centerline"
          })
        );
        gGeometry.appendChild(
          svgEl("circle", { cx, cy, r: 3, class: "lw-center-dot" })
        );
      }

      if (settings.showInnerCircles) {
        // 2/3 circle
        gGeometry.appendChild(
          svgEl("circle", {
            cx,
            cy,
            r: radius * (2 / 3),
            class: "lw-inner-circle-2thirds"
          })
        );
        // 1/3 circle
        gGeometry.appendChild(
          svgEl("circle", {
            cx,
            cy,
            r: radius * (1 / 3),
            class: "lw-inner-circle-1third"
          })
        );
      }


const pointMemory = {};
pointMemory["center"] = {token: "center", x: cx, y: cy, a: 0};

      // -------------------------------
      // Primal vowels on outer radius
      // -------------------------------
      const vowelPoints = [];

        const start = settings.primalVowelStartTheta; // A at -22°
        const step = 360 / settings.primalVowels.length; // 72°
        settings.primalVowels.forEach((v, idx) => {
          const theta = start + idx * step;
          const p = polarToXY(cx, cy, radius, theta);


          // radial lines + tick marks
          if (settings.showRadials) {
            gGeometry.appendChild(
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
            gGeometry.appendChild(
              svgEl("circle", {
                cx: p13.x,
                cy: p13.y,
                r: 4.2,
                class: "lw-tickdot"
              })
            );
            gGeometry.appendChild(
              svgEl("circle", {
                cx: p23.x,
                cy: p23.y,
                r: 4.2,
                class: "lw-tickdot"
              })
            );
          }

          // label
          const t = svgEl("text", { x: p.x, y: p.y, class: "lw-vowel-label" });
          t.textContent = v;
vowelPoints.push({ token: v, theta, x: p.x, y: p.y });
pointMemory[v] = {token: v, x: p.x, y: p.y, a: theta};
		  
          addTitle(t, `${v}: ${defText(v)}`);
          gPrimalVowels.appendChild(t);
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
          gGeometry.appendChild(svgEl("path", { d, class: "lw-pentagram" }));
        }
      

// -------------------------------
// Monad E (rotated ellipse + label)
// Vertically R/3 tall, horizontally R/9 wide
// Oriented along 10°
// -------------------------------

  const theta = 10;               // degrees
  const rx = radius / 18;         // horizontal width = R/9
  const ry = radius / 6;          // vertical height = R/3

  // Place the ellipse center along the 10° ray.
  // (Using R/6 keeps it close to your prior "north-ish" intent while scaling cleanly.)
  const cE = polarToXY(cx, cy, radius / 6, theta);
  const ex = cE.x;
  const ey = cE.y;

  gMonadE.appendChild(
    svgEl("ellipse", {
      cx: ex,
      cy: ey,
      rx: rx,
      ry: ry,
      transform: `rotate(${theta} ${ex} ${ey})`,
      class: "lw-monad-ellipse"
    })
  );

  const te = svgEl("text", { x: ex, y: ey, class: "lw-monad-label" });
  te.textContent = "E";
  addTitle(te, `E: ${defText("E")}`);
pointMemory["E"] = {token:"E", x: ex, y: ey, a: 10};
  gMonadE.appendChild(te);






// -------------------------------
// Stressed AE (ellipse + label)
// Vertex 1: V1 = polar(R/3, 10°)  (touches E vertex)
// Vertex 2: V2 = polar(R,   20°)  (outer boundary)
// Height:  2R/3  => ry = R/3
// Width:   R/3   => rx = R/6
// -------------------------------

  const v1 = polarToXY(cx, cy, radius * (1 / 3), 10);
  const v2 = polarToXY(cx, cy, radius * 1, 20);

  // Ellipse center is midpoint between the two vertices
  const ax = (v1.x + v2.x) / 2;
  const ay = (v1.y + v2.y) / 2;

  // Rotate ellipse to align with the axis from v1 -> v2
  const angleRad = Math.atan2(v2.y - v1.y, v2.x - v1.x);
  const angleDeg = (angleRad * 180) / Math.PI;

/*
  // Size per spec
  const ry = radius / 6;   // width  = R/3
  const rx = radius / 3;   // height = 2R/3
*/

  gStressedAE.appendChild(
    svgEl("ellipse", {
      cx: ax,
      cy: ay,
      rx: radius / 3,
      ry: radius / 6,
      transform: `rotate(${angleDeg} ${ax} ${ay})`,
      class: "lw-ae-ellipse"
    })
  );

const mx = (v1.x + 4*v2.x) / 5;
const my = (v1.y + 4*v2.y) / 5;
  const tAE = svgEl("text", { x: mx, y: my, class: "lw-ae-label" });
  tAE.textContent = "Æ";
  addTitle(tAE, `Æ: ${defText("Æ")}`);
  pointMemory["Æ"] = {token:"Æ", x: mx, y: my, a: 20};
  
  gStressedAE.appendChild(tAE);




      // -------------------------------
      // Consonants on 2/3 radius ring
      // -------------------------------
        const rCon = radius * (2 / 3);

        settings.consonants.forEach((c) => {
          const p = polarToXY(cx, cy, rCon, c.theta);
          const t = svgEl("text", {
            x: p.x,
            y: p.y,
            class: "lw-consonant-label"
          });
pointMemory[c.token] = {token:c.token, x: p.x, y: p.y, a: c.theta};
          t.textContent = c.token;
          addTitle(t, `${c.token}: ${defText(c.token)}`);
          gConsonants.appendChild(t);
        });


      // -------------------------------
      // Clicks on 1/3 radius ring (optional)
      // -------------------------------
        const rClick = radius * (1 / 3);

        settings.clicks.forEach((c) => {
          const p = polarToXY(cx, cy, rClick, c.theta);
          const t = svgEl("text", { x: p.x, y: p.y, class: "lw-click-label" });
          t.textContent = c.token;
pointMemory[c.token] = {token:c.token, x: p.x, y: p.y, a: c.theta};
          addTitle(t, `${c.token}: ${defText(c.token)}`);
          gClicks.appendChild(t);
        });


console.log(pointMemory);
/* end of SVG */



$BcontrolCol.on("change", ".lw-toggle", function() {
  const key = $(this).data("key");
  settings.showClasses[key] = this.checked;
  applyVisibilityFromShowClasses(settings, svg);
});


// ANIMATION 
let animCtl = null;

$BcontrolCol.on("click", ".lw-run", function () {
  const q = $BcontrolCol.find(".lw-query").val();
  const tokens = parseQueryString(q, pointMemory);
  
  console.log(tokens);

  if (animCtl) animCtl.stop();

  animCtl = animateSoundString(tokens, pointMemory, gAnim, {
    stepMs: 650,
    endPauseMs: 900
  });
});

$BcontrolCol.on("click", ".lw-btn-stop", function () {
  if (animCtl) animCtl.stop();
});

$BcontrolCol.on("click", ".lw-btn-clear", function () {
  if (animCtl) animCtl.stop();
  while (gAnim.firstChild) gAnim.removeChild(gAnim.firstChild);
});






/* end of instance */
    });
  };
})(jQuery);
