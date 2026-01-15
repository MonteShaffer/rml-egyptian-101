/* global jQuery */
(function ($) {
  "use strict";


const CLASS_MAP = {
	
  consonants:   { svg: "lw-consonants",    label: "Consonants" },
  primalVowels: { svg: "lw-primal-vowels", label: "Primal Vowels" },
  monadE:       { svg: "lw-monad-e",       label: "Monad E" },
  stressedAE:   { svg: "lw-stressed-ae",   label: "Stressed Æ" },
  backgroundImage: { svg: "lw-bg-image", label: "Background Image" }
  // clicks:       { svg: "lw-clicks",        label: "Clicks" }
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
  
  




  function renderFinalArrows(moves, pointMemory, gAnim, svgEl) {
  // Clear current
  while (gAnim.firstChild) gAnim.removeChild(gAnim.firstChild);

  const c = pointMemory["center"];
  // const center = getPointXY(pointMemory, "center");
  const center = c ? { x: Number(c.x), y: Number(c.y) } : null;

  for (const m of moves) {
    if (m.kind === "blend") {
      // Blend requires center + two vowels
      if (!center || !m.v1 || !m.v2) continue;

     // const pV1 = polarToXYFromMemory(pointMemory, m.v1);
      //const pV2 = polarToXYFromMemory(pointMemory, m.v2);
		const pV1    = getPointXY(pointMemory, m.v1);
		const pV2    = getPointXY(pointMemory, m.v2);

      const dest = computeBlendDestination(pointMemory, m.v1, m.v2);

      if (!pV1 || !pV2 || !dest) continue;

      // Optional: light gray guides in static mode too
     // drawGuideArrow(svgEl, gAnim, center, pV1);
    //  drawGuideArrow(svgEl, gAnim, center, pV2);
	  
	  // Gray guides with different widths
drawGuideArrow(svgEl, gAnim, center, pV1, { width: 22 }); // v1 thick
drawGuideArrow(svgEl, gAnim, center, pV2, { width: 8  }); // v2 thin

      // Static blend arrow: center -> dest (no dash animation)
      const line = svgEl("line", {
        x1: center.x, y1: center.y,
        x2: dest.x,   y2: dest.y,
        class: "lw-anim-arrow",
        "marker-end": "url(#lw-arrowhead)"
      });
      gAnim.appendChild(line);

      // Blend label at destination
      drawBlendLabel(svgEl, gAnim, `(${m.v1}${m.v2})`, dest.x, dest.y);

      continue;
    }

    // NORMAL move: from -> to
    const p1 = pointMemory[m.from];
    const p2 = pointMemory[m.to];
    if (!p1 || !p2) continue;

    const line = svgEl("line", {
      x1: p1.x, y1: p1.y,
      x2: p2.x, y2: p2.y,
      class: "lw-anim-arrow",
      "marker-end": "url(#lw-arrowhead)"
    });

    gAnim.appendChild(line);
  }
}





function renderFinalArrowsFromTokens(tokens, pointMemory, gAnim) {
  while (gAnim.firstChild) gAnim.removeChild(gAnim.firstChild);

  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i], b = tokens[i + 1];
    const p1 = pointMemory[a];
    const p2 = pointMemory[b];
    if (!p1 || !p2) continue;

    const line = svgEl("line", {
      x1: p1.x, y1: p1.y,
      x2: p2.x, y2: p2.y,
      class: "lw-anim-arrow",
      "marker-end": "url(#lw-arrowhead)"
    });

    gAnim.appendChild(line);
  }
}


function animateMoves(moves, pointMemory, gAnim, opts = {}) {
  const waitMs   = opts.waitMs ?? 900;
  const pauseMs  = opts.pauseMs ?? 120;
  const pxPerSec = opts.pxPerSec ?? 900;

  if (!moves || moves.length === 0) return null;

  // stop any previous run
  if (animateMoves._timer) clearTimeout(animateMoves._timer);
  animateMoves._stopped = false;

  function clearAnim() {
    while (gAnim.firstChild) gAnim.removeChild(gAnim.firstChild);
  }

  function schedule(fn, ms) {
    animateMoves._timer = setTimeout(() => {
      if (!animateMoves._stopped) fn();
    }, ms);
  }

  function drawStep(i) {
    if (i >= moves.length) {
      // PHASE 2: hold all arrows
      schedule(() => {
        // PHASE 3: clear and hold empty
        clearAnim();
        schedule(() => {
          clearAnim();
          drawStep(0);
        }, waitMs);
      }, waitMs);
      return;
    }

   const m = moves[i];
let durationMs = 0;


if (m.kind === "blend") {
  durationMs = drawBlendMove(svgEl, gAnim, pointMemory, m.v1, m.v2, m.destKey, m.fromKey, { pxPerSec }) || 400;
} else {
  durationMs = drawArrow(gAnim, pointMemory, m.from, m.to, { kind: "normal", pxPerSec }) || 400;
}





    schedule(() => {
      drawStep(i + 1);
    }, durationMs + pauseMs);
  }

  // start fresh
  clearAnim();
  drawStep(0);

  return {
    stop() {
      animateMoves._stopped = true;
      if (animateMoves._timer) clearTimeout(animateMoves._timer);
    },
    clear() {
      clearAnim();
    }
  };
}



function drawArrowToPoint(svgEl, gAnim, from, to, opts = {}) {
  const x1 = Number(from.x), y1 = Number(from.y);
  const x2 = Number(to.x),   y2 = Number(to.y);

  const len = Math.hypot(x2 - x1, y2 - y1);

  const line = svgEl("line", { x1, y1, x2, y2, class: "lw-anim-arrow" });

  // dash reveal
  line.style.strokeDasharray = String(len);
  line.style.strokeDashoffset = String(len);

  gAnim.appendChild(line);

  // constant-speed timing
  const pxPerSec = opts.pxPerSec ?? 900;
  const minMs = opts.minMs ?? 180;
  const maxMs = opts.maxMs ?? 1200;
  let durationMs = (len / pxPerSec) * 1000;
  durationMs = Math.max(minMs, Math.min(maxMs, durationMs));

  requestAnimationFrame(() => {
    line.style.transition = `stroke-dashoffset ${durationMs}ms linear`;
    line.style.strokeDashoffset = "0";
  });

  // delay arrowhead so it doesn't appear too early
  const headAt = opts.headAt ?? 0.88;
  setTimeout(() => {
    if (line.isConnected) line.setAttribute("marker-end", "url(#lw-arrowhead)");
  }, Math.floor(durationMs * headAt));

  return durationMs;
}


function drawBlendLabel(svgEl, gAnim, text, x, y) {
  const dx = 8;  // offset so it doesn't sit exactly on arrow tip
  const dy = -8;

  const t = svgEl("text", {
    x: x + dx,
    y: y + dy,
    class: "lw-blend-label"
  });

  t.textContent = text;
  gAnim.appendChild(t);
  return t;
}


function drawBlendMove(svgEl, gAnim, pointMemory, v1, v2, destKey, fromKey, opts = {}) {
  const center = getPointXY(pointMemory, "center");
  const pV1 = getPointXY(pointMemory, v1);
  const pV2 = getPointXY(pointMemory, v2);
  const dest = getPointXY(pointMemory, destKey);

  // NEW: start point for the blend's main arrow
  const fromPt = getPointXY(pointMemory, fromKey) || center;

  if (!center || !pV1 || !pV2 || !dest || !fromPt) return 0;

  // Gray guides (always from center to the component vowels)
  // Gray guides with different widths
drawGuideArrow(svgEl, gAnim, center, pV1, { width: 22 }); // v1 thick
drawGuideArrow(svgEl, gAnim, center, pV2, { width: 8  }); // v2 thin

  // Main blue arrow: from previous token (or center if none) -> dest
  const durationMs = drawArrowToPoint(svgEl, gAnim, fromPt, dest, {
    kind: "blend",
    pxPerSec: opts.pxPerSec ?? 900,
    headAt: opts.headAt ?? 0.88
  }) || 400;

  drawBlendLabel(svgEl, gAnim, `(${v1}${v2})`, dest.x, dest.y);

  return durationMs;
}








function drawArrow(gAnim, pointMemory, from, to, opts = {}) {
  const p1 = pointMemory[from];
  const p2 = pointMemory[to];
  if (!p1 || !p2) return 0;

  const x1 = Number(p1.x), y1 = Number(p1.y);
  const x2 = Number(p2.x), y2 = Number(p2.y);

  const len = Math.hypot(x2 - x1, y2 - y1);

  const kind = opts.kind || "normal";
  const cls = kind === "blend"
    ? "lw-anim-arrow lw-anim-arrow-blend"
    : "lw-anim-arrow";

  const line = svgEl("line", { x1, y1, x2, y2, class: cls });

  // draw-on effect
  line.style.strokeDasharray = String(len);
  line.style.strokeDashoffset = String(len);

  // no arrowhead until near end (so it doesn't appear too soon)
  gAnim.appendChild(line);

  const pxPerSec = opts.pxPerSec ?? 900;
  const minMs = opts.minMs ?? 180;
  const maxMs = opts.maxMs ?? 1200;

  let durationMs = (len / pxPerSec) * 1000;
  durationMs = Math.max(minMs, Math.min(maxMs, durationMs));

  requestAnimationFrame(() => {
    line.style.transition = `stroke-dashoffset ${durationMs}ms linear`;
    line.style.strokeDashoffset = "0";
  });

  const headAt = opts.headAt ?? 0.88;
  setTimeout(() => {
    if (line.isConnected) line.setAttribute("marker-end", "url(#lw-arrowhead)");
  }, Math.floor(durationMs * headAt));

  return durationMs;
}



  
  function animateSoundString(tokens, pointMemory, gAnim, opts = {}) {
		  const waitMs   = opts.waitMs ?? 900;     // how long to hold "all arrows" AND "cleared"
		  const pauseMs  = opts.pauseMs ?? 120;    // tiny pause between steps
		  const pxPerSec = opts.pxPerSec ?? 900;   // constant-speed draw
		  const headAt   = opts.headAt ?? 0.88;    // when arrowhead appears within draw

		  // cancel any prior run
		  if (animateSoundString._timer) clearTimeout(animateSoundString._timer);
		  animateSoundString._stopped = false;

		  function clearAnim() {
			while (gAnim.firstChild) gAnim.removeChild(gAnim.firstChild);
		  }

		  function schedule(fn, ms) {
			animateSoundString._timer = setTimeout(() => {
			  if (!animateSoundString._stopped) fn();
			}, ms);
		  }
		  
		  
		 


		  // --- Draw one arrow. IMPORTANT: do NOT clear between steps; we accumulate. ---
		  function drawStep(i) {
			if (tokens.length < 2) return loopRestart();

			const a = tokens[i];
			const b = tokens[i + 1];

			// drawArrow should draw into gAnim and return durationMs
			//const durationMs = drawArrow(a, b, { pxPerSec, headAt }) || 400;
			const durationMs = drawArrow(gAnim, pointMemory, a, b, { kind: "normal", pxPerSec: 900 }) || 400;

			const nextI = i + 1;
			const isLast = nextI >= tokens.length - 1;

			schedule(() => {
			  if (isLast) {
				// Phase 2: hold ALL arrows on screen for waitMs
				schedule(() => {
				  // Phase 3: clear and hold empty for waitMs
				  clearAnim();
				  schedule(() => {
					// Phase 1 again
					clearAnim();
					drawStep(0);
				  }, waitMs);
				}, waitMs);
			  } else {
				// Continue steps (accumulating arrows)
				drawStep(nextI);
			  }
			}, durationMs + pauseMs);
		  }

		  function loopRestart() {
			clearAnim();
			schedule(() => {
			  clearAnim();
			  drawStep(0);
			}, waitMs);
		  }

		  // start: ensure clean slate, then begin
		  clearAnim();
		  drawStep(0);

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



function getPointXY(pointMemory, key) {
  const p = pointMemory?.[key];
  if (!p) return null;

  const x = Number(p.x);
  const y = Number(p.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  // Your pointMemory stores ABSOLUTE SVG coordinates for center and all tokens.
  // So just return them directly.
  return { x, y };
}






function addMove(from, to, kind) {
  if (!from || !to) return;
  if (!pointMemory[from] || !pointMemory[to]) return;
  moves.push({ from, to, kind });
}



function cleanseAndTokenizeQuery(raw, pointMemory) {
	const moves = [];
	const state = { lastToken: null };
	
	
	Object.keys(pointMemory).forEach(k => {
  if (k.startsWith("blend:")) delete pointMemory[k];
});

		  const DIP = ["th", "sh", "ch", "zh"];
		  const BLEND_VOWELS = new Set(["A", "E", "I", "O", "U", "ʔ", "Æ"]);

		  // 1) Normalize whitespace (collapse multiple spaces)
		  let s = String(raw || "").replace(/\s+/g, " ").trim();

		  let cleansed = "";
		  const tokens = [];


		  
function pushNormalToken(token, tokens, moves, pointMemory, state) {
  if (!token || !pointMemory[token]) return;

  // Keep a token record (optional but useful)
  tokens.push(token);

  const prev = state.lastToken;

  // Create a normal move from previous token → this token
  if (prev && pointMemory[prev]) {
    moves.push({
      kind: "normal",
      from: prev,
      to: token
    });
  }

  state.lastToken = token;
}






function pushBlendTokens(blendText, tokens, moves, pointMemory, state) {
  const BLEND_VOWELS = new Set(["A","E","I","O","U","ʔ","Æ"]);
  const up = String(blendText || "").toUpperCase();
  const chars = [...up];
  if (chars.length !== 2) return false;

  const [v1, v2] = chars;
  if (!BLEND_VOWELS.has(v1) || !BLEND_VOWELS.has(v2)) return false;


console.log("BLEND INPUT", v1, v2,
  "center", getPointXY(pointMemory, "center"),
  v1, getPointXY(pointMemory, v1),
  v2, getPointXY(pointMemory, v2)
);





  // Compute destination using ABSOLUTE coords (fixed method)
  const dest = computeBlendDestination(pointMemory, v1, v2);
  if (!dest) return false;

  // Create a unique destination "token" in pointMemory
  const blendKey = `blend:${v1}${v2}:${state.blendIndex || 0}`;
  state.blendIndex = (state.blendIndex || 0) + 1;
  
  console.log("DESTKEY STORE", blendKey, pointMemory[blendKey], "E", pointMemory[v2], "I", pointMemory[v1]);

  // pointMemory[blendKey] = { x: dest.x, y: dest.y };
  pointMemory[blendKey] = { x: dest.x, y: dest.y, abs: true };

  // Record token for display/debug
  // tokens.push(v1, v2);
  tokens.push(`(${v1}${v2})`);

/*
  // IMPORTANT: add normal move INTO the blend destination if we have a prior token
  if (state.lastToken && pointMemory[state.lastToken]) {
    moves.push({ kind: "normal", from: state.lastToken, to: blendKey });
  }

  // Record the blend move itself (so animator can draw guides + label)
  moves.push({ kind: "blend", v1, v2, destKey: blendKey });
  */
  
  // Record the blend move itself, including where the path comes from.
// This REPLACES the normal move into the blend destination.
moves.push({
  kind: "blend",
  v1,
  v2,
  destKey: blendKey,
  fromKey: state.lastToken || "center"
});
  
  console.log(moves);

  // Now the chain continues from the destination
  state.lastToken = blendKey;

  return true;
}





		  // If a (...) group isn't a valid diphthong or vowel-blend,
		  // we "de-parenthesize" it and re-parse its content normally.
		  function parseInline(chunk) {
			// parse chunk using the same rules as the main loop (but no parentheses nesting)
			for (let k = 0; k < chunk.length; ) {
			  const c = chunk[k];

			  if (c === " " || c === "-") { k++; continue; }

			  const two = chunk.slice(k, k + 2);
			  if (two.length === 2 && DIP.includes(two.toLowerCase())) {
				const d = two.toLowerCase();
				cleansed += `(${d})`;
				//pushToken(d);
				pushNormalToken(d, tokens, moves, pointMemory, state);
				k += 2;
				continue;
			  }

			  if (/[A-Za-z]/.test(c)) {
				const up = c.toUpperCase();
				cleansed += up;
				pushNormalToken(up, tokens, moves, pointMemory, state);
				k++;
				continue;
			  }

			  if (c === "Æ" || c === "ʔ" || c === "ə" || c === "ǁ" || c === "ǀ" || c === "ʘ") {
				cleansed += c;
				pushNormalToken(c, tokens, moves, pointMemory, state);
				k++;
				continue;
			  }

			  k++;
			}
		  }
		  
		  
		  
		  
		  

		  // 2) Scan left to right
		  for (let i = 0; i < s.length; ) {
			const c = s[i];

			if (c === " " || c === "-") { i++; continue; }

			// Parenthesized group
			if (c === "(") {
			  const j = s.indexOf(")", i + 1);
			  if (j === -1) { i++; continue; } // unclosed

			  let inside = s.slice(i + 1, j);
			  inside = inside.replace(/[ -]/g, ""); // remove spaces/dashes inside groups
			  if (!inside) { i = j + 1; continue; }

			  const low = inside.toLowerCase();

			  // Parenthesized diphthong normalization: (CH) -> (ch)
			  if (DIP.includes(low)) {
				cleansed += `(${low})`;
				//pushToken(low);
				pushNormalToken(low, tokens, moves, pointMemory, state);
				i = j + 1;
				continue;
			  }

			  // Otherwise: treat as vowel blend ONLY if all chars are allowed blend vowels
			  const up = inside.toUpperCase();

			  const isVowelBlend =
				up.length >= 2 && // blend implies 2+ vowels; remove if you want to allow (A)
				[...up].every(ch => BLEND_VOWELS.has(ch));

			  if (isVowelBlend) {
					const didBlend = pushBlendTokens(up, tokens, moves, pointMemory, state);

				if (didBlend) {
						  cleansed += `(${up})`;
						  
						  
						  
						  
						} else {
						  // fallback: parse contents normally, character by character
						  for (const ch of up) {
							pushNormalToken(ch, tokens, moves, pointMemory, state);
							cleansed += ch;
						  }
						}
					} else {
					// Not a valid blend: re-parse contents as normal stream (no parentheses)
						parseInline(inside);
					  }

			  i = j + 1;
			  continue;
			}

			// Non-parenthesized diphthongs: CH -> (ch)
			const two = s.slice(i, i + 2);
			if (two.length === 2 && DIP.includes(two.toLowerCase())) {
			  const d = two.toLowerCase();
			  cleansed += `(${d})`;
			 // pushToken(d);
			 pushNormalToken(d, tokens, moves, pointMemory, state);
			  i += 2;
			  continue;
			}

			// Single letters -> uppercase
			if (/[A-Za-z]/.test(c)) {
			  const up = c.toUpperCase();
			  cleansed += up;
			 //pushToken(up);
			  pushNormalToken(up, tokens, moves, pointMemory, state);
			  i++;
			  continue;
			}

			// Special symbols
			if (c === "Æ" || c === "ʔ" || c === "ə" || c === "ǁ" || c === "ǀ" || c === "ʘ") {
			  cleansed += c;
			  //pushToken(c);
			    pushNormalToken(c, tokens, moves, pointMemory, state);
			  i++;
			  continue;
			}

			i++;
		  }

		  return { cleansed, tokens, moves };
	}




function formatParsedTokens(tokens) {
  if (!tokens || !tokens.length) return "";

  return "Parsed: " + tokens.map(t => `(${t})`).join(" ");
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
	// console.log(entry);
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
	  
	  
	  
	  
      <div class="d-flex align-items-center gap-2">
        <div class="form-check form-switch m-0">
          <input class="form-check-input lw-animate-toggle"
                 type="checkbox"
                 id="lw-animate-toggle"
                 checked>
          <label class="form-check-label small" for="lw-animate-toggle">
            Animate?
          </label>
        </div>

        <div class="btn-group btn-group-sm" role="group" aria-label="Admin controls">
          <button type="button" class="btn btn-outline-secondary lw-btn-stop">Stop</button>
          <button type="button" class="btn btn-outline-secondary lw-btn-clear">Clear</button>
        </div>
      </div>
	  
	  
    </div>

    <div class="card-body d-flex flex-column gap-3">

      <!-- Query input -->
      <div>
        <div class="input-group input-group-sm">
          <input type="text"
                 class="form-control lw-query"
                 value="MILK"
                 aria-label="Sound query"  onfocus="this.select();">
          <button class="btn btn-primary lw-run"
                  type="button"
                  aria-label="Run animation">
            &rarr;
          </button>
        </div>

<div class="form-text">
  <div class="mb-1">
    Enter sound string (click to insert):
  </div>

  <div class="lw-palette-special mb-1">
    <a href="#" class="lw-insert-sound badge rounded-pill text-bg-light border">(ch)</a>
    <a href="#" class="lw-insert-sound badge rounded-pill text-bg-light border">(sh)</a>
    <a href="#" class="lw-insert-sound badge rounded-pill text-bg-light border">(th)</a>
    <a href="#" class="lw-insert-sound badge rounded-pill text-bg-light border">(zh)</a>
  </div>

  <div class="lw-palette-vowels">
    <a href="#" class="lw-insert-sound badge rounded-pill text-bg-light border">A</a>
    <a href="#" class="lw-insert-sound badge rounded-pill text-bg-light border">E</a>
    <a href="#" class="lw-insert-sound badge rounded-pill text-bg-light border">I</a>
    <a href="#" class="lw-insert-sound badge rounded-pill text-bg-light border">O</a>
    <a href="#" class="lw-insert-sound badge rounded-pill text-bg-light border">U</a>
    <a href="#" class="lw-insert-sound badge rounded-pill text-bg-light border">Æ</a>
    <a href="#" class="lw-insert-sound badge rounded-pill text-bg-light border">ʔ</a>
  </div>
</div>



		<div class="lw-parsed form-text mt-1 text-muted"></div>
      </div>

      <!-- Toggles -->
      <div class="d-flex flex-column gap-2 lw-toggles"></div>
	  
	  <div class="lw-samples small mt-2">
  Samples:

<a href="#" class="lw-insert-sound-string">HELO</a>
	<span class="text-muted mx-1">|</span>
	
<a href="#" class="lw-insert-sound-string">M(IE)LK</a>
	<span class="text-muted mx-1">|</span>
	
<a href="#" class="lw-insert-sound-string">JOKSTR</a>
	<span class="text-muted mx-1">|</span>
	
<a href="#" class="lw-insert-sound-string">JESTR</a>
	<span class="text-muted mx-1">|</span>
	
<a href="#" class="lw-insert-sound-string">HUA</a>




</div>


<div class="lw-history mt-3">
  <div class="d-flex justify-content-between align-items-center">
    <div class="fw-semibold small">History</div>
    <button type="button" class="btn btn-sm btn-outline-secondary lw-history-clear">Clear</button>
  </div>

  <div class="list-group list-group-flush lw-history-list mt-2" style="max-height: 190px; overflow-y: auto;">
    <!-- items appended here -->
  </div>
</div>




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


// blend functions 

function polarToXYFromMemory(pointMemory, token) {
  const c = pointMemory["center"];
  const p = pointMemory[token];
  if (!c || !p) return null;

  // Assumptions:
  // - c.x, c.y exist (center point)
  // - c.radius exists
  // - p.a is angle in degrees for that vowel
  const cx = Number(c.x), cy = Number(c.y);
  const r  = Number(c.radius);
  const aDeg = Number(p.a);

  const a = (aDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(a),
    y: cy + r * Math.sin(a)
  };
}


function drawGuideArrow(svgEl, parent, fromPt, toPt, opts = {}) {
  const w = opts.width ?? 10;

  const line = svgEl("line", {
    x1: fromPt.x, y1: fromPt.y,
    x2: toPt.x,   y2: toPt.y,
    class: "lw-anim-guide",
    "marker-end": "url(#lw-arrowhead-guide)"
  });

  line.setAttribute("stroke", "#cfcfcf");
  line.setAttribute("stroke-width", String(w));      // ✅ variable width
  line.setAttribute("opacity", "0.55");
  line.setAttribute("fill", "none");
  line.setAttribute("stroke-linecap", "round");

  parent.appendChild(line);
  return line;
}







function computeBlendDestination(pointMemory, v1, v2) {
  const c = getPointXY(pointMemory, "center");
  const p1 = getPointXY(pointMemory, v1);
  const p2 = getPointXY(pointMemory, v2);
  if (!c || !p1 || !p2) return null;
  
  console.log("c"); console.log(c);
  console.log("p1/p2");  console.log(p1); console.log(p2);

  const dx1 = p1.x - c.x;
  const dy1 = p1.y - c.y;
  const dx2 = p2.x - c.x;
  const dy2 = p2.y - c.y;
  
   console.log("dx1,dy1");  console.log(dx1); console.log(dy1);
    console.log("dx2,dy2");  console.log(dx2); console.log(dy2);

  const dx = (1/3) * dx1 + (1/9) * dx2;
  const dy = (1/3) * dy1 + (1/9) * dy2;
  
  console.log("dx,dy"); console.log(dx); console.log(dy);

  return { x: c.x + dx, y: c.y + dy };
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








function buildSoundPalette($root) {
  const sounds = ["A","E","I","O","U","ʔ","Æ","(th)","(sh)","(ch)","(zh)"];

  const $pal = $root.find(".lw-palette").empty();

  sounds.forEach((s, idx) => {
    //const $a = $(`<a href="#" class="lw-insert-sound">${s}</a>`);
	const $a = $(`<a href="#" class="lw-insert-sound badge rounded-pill text-bg-light border">${s}</a>`);

    $a.attr("data-sound", s);

    $pal.append($a);
    if (idx < sounds.length - 1) $pal.append(document.createTextNode(" "));
  });
  
  
}

buildSoundPalette($BcontrolCol);






	  
	  
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
//const gClicks       = svgEl("g", { class: "lw-clicks" });

// Non-toggled geometry (always visible unless you want to toggle it too)
const gGeometry     = svgEl("g", { class: "lw-geometry" });

const gBackground = svgEl("g", { class: "lw-bg-image" });
svg.appendChild(gBackground);   // FIRST = behind everything

// Append groups ONCE (order matters for layering)
svg.appendChild(gGeometry);
svg.appendChild(gPrimalVowels);
svg.appendChild(gMonadE);
svg.appendChild(gStressedAE);
svg.appendChild(gConsonants);
//svg.appendChild(gClicks);



// Animation overlay group (always on top)
const gAnim = svgEl("g", { class: "lw-anim-layer" });
svg.appendChild(gAnim);


const bgImg = svgEl("image", {
  href: "images/background.png",
  x: 0,
  y: 0,
  width: 954,
  height: 997,
  opacity: 0.5,
  "pointer-events": "none",
  preserveAspectRatio: "none"   // <-- important
});


gBackground.appendChild(bgImg);





function applyBackgroundTransform(bgImgEl, pointMemory, opts = {}) {
  // wheel anchors
  const lipsToken   = opts.lipsToken ?? "th";
  const throatToken = opts.throatToken ?? "ʔ";

  const p1 = pointMemory[lipsToken];
  const p2 = pointMemory[throatToken];
  if (!p1 || !p2) {
    console.warn("Missing wheel anchors for background:", lipsToken, throatToken);
    return;
  }

  // image anchors (pixels in background.png space)
  const i1 = opts.imgLips   ?? { x: 828, y: 431 };
  const i2 = opts.imgThroat ?? { x: 350, y: 450 };

  // vectors
  const vImgX = i2.x - i1.x, vImgY = i2.y - i1.y;
  const vTarX = p2.x - p1.x, vTarY = p2.y - p1.y;

  const lenImg = Math.hypot(vImgX, vImgY) || 1;
  const lenTar = Math.hypot(vTarX, vTarY) || 1;

  // uniform scale
  const s = (lenTar / lenImg) * (opts.scaleMul ?? 1);

  // rotation (SVG y-axis points down, same as image pixels -> atan2 is consistent)
  const aImg = Math.atan2(vImgY, vImgX);
  const aTar = Math.atan2(vTarY, vTarX);
  const rot = (aTar - aImg) + ((opts.rotDeg ?? 0) * Math.PI / 180);

  const cos = Math.cos(rot), sin = Math.sin(rot);

  // We want:  p = R*s*(i - i1) + p1
  // Expand to SVG matrix:
  // [a c e]   where:
  // a = s*cos, b = s*sin, c = -s*sin, d = s*cos
  // e = p1.x - (a*i1.x + c*i1.y)
  // f = p1.y - (b*i1.x + d*i1.y)
  const a = s * cos;
  const b = s * sin;
  const c = -s * sin;
  const d = s * cos;
  const e = p1.x - (a * i1.x + c * i1.y) + (opts.dx ?? 0);
  const f = p1.y - (b * i1.x + d * i1.y) + (opts.dy ?? 0);

  bgImgEl.setAttribute("transform", `matrix(${a} ${b} ${c} ${d} ${e} ${f})`);
}










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

// for blend background grey 
// in <defs>
const markerGuide = svgEl("marker", {
  id: "lw-arrowhead-guide",
  markerWidth: "10",
  markerHeight: "10",
  refX: "8",
  refY: "5",
  orient: "auto",
  markerUnits: "userSpaceOnUse" // ← THIS is the magic
});

markerGuide.appendChild(
  svgEl("path", {
    d: "M0,0 L10,5 L0,10 Z",
    fill: "#cfcfcf",
    opacity: "0.55"
  })
);

defs.appendChild(markerGuide);








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
pointMemory["center"] = {token: "center", x: cx, y: cy, radius: radius};
applyVisibilityFromShowClasses(settings.showClasses, svg);

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
	  /*
        const rClick = radius * (1 / 3);

        settings.clicks.forEach((c) => {
          const p = polarToXY(cx, cy, rClick, c.theta);
          const t = svgEl("text", { x: p.x, y: p.y, class: "lw-click-label" });
          t.textContent = c.token;
pointMemory[c.token] = {token:c.token, x: p.x, y: p.y, a: c.theta};
          addTitle(t, `${c.token}: ${defText(c.token)}`);
          gClicks.appendChild(t);
        });
*/

console.log(pointMemory);

const IMG_ANCHOR_LIPS   = { x: 828, y: 431 }; // mouth opening
const IMG_ANCHOR_THROAT = { x: 350,  y: 450 }; // glottis/throat area

applyBackgroundTransform(bgImg, pointMemory, {
  imgLips:   { x: 828, y: 431 },
  imgThroat: { x: 350, y: 450 },
  lipsToken: "th",
  throatToken: "ʔ",

  // optional fine tuning:
   rotDeg: -10,
  // scaleMul: 1,
  // dx: 0,
   dy: -50
});



  
  
/* end of SVG */



$BcontrolCol.on("change", ".lw-toggle", function() {
  const key = $(this).data("key");
  settings.showClasses[key] = this.checked;
  applyVisibilityFromShowClasses(settings, svg);
});


// ANIMATION 
let animCtl = null;

let lastParsed = {
  tokens: [],
  moves: [],
  cleansed: ""
};

$BcontrolCol.on("click", ".lw-run", function () {
  const q = $BcontrolCol.find(".lw-query").val();
  
  const { cleansed, tokens, moves } = cleanseAndTokenizeQuery(q, pointMemory);
  
  addRunToHistory($BcontrolCol, cleansed);
  // Update URL hash so it stays shareable for any run (Enter or arrow click)
	//window.location.hash = "sound-" + encodeURIComponent(cleansed);
	window.location.hash = "sound-" + (cleansed);

  
  // const tokens = parseQueryString(q, pointMemory);
  
  // DISPLAY the cleansed parsed form
 // show cleansed parsed form
  $BcontrolCol.find(".lw-parsed").text(cleansed ? `Parsed: ${cleansed}` : "Parsed: (none)");

  
  console.log(cleansed);
  console.log(tokens);
  console.log(moves);
  
  // Save for Animate? toggle changes later
lastParsed = {
  cleansed: cleansed || "",
  tokens: tokens || [],
  moves: moves || []
};



  if (animCtl) animCtl.stop();
  
  // Check Animate? toggle
  const doAnimate = $BcontrolCol.find(".lw-animate-toggle").is(":checked");
  
  if (!doAnimate) {
    // Static: show final end state
    if (moves && moves.length) {
      renderFinalArrows(lastParsed.moves, pointMemory, gAnim, svgEl);

    } else {
      renderFinalArrowsFromTokens(tokens, pointMemory, gAnim);
    }
    return;
  }
  
  


  // Animated: run your existing loop (tokens or moves)
  if (moves && moves.length) {
    animCtl = animateMoves(moves, pointMemory, gAnim, { waitMs: 900, pxPerSec: 900 });
  } else {
    animCtl = animateSoundString(tokens, pointMemory, gAnim, { waitMs: 900, pxPerSec: 900 });
  }
  
  
  
 
  
});

$BcontrolCol.on("click", ".lw-btn-stop", function () {
  if (animCtl) animCtl.stop();
});

$BcontrolCol.on("click", ".lw-btn-clear", function () {
  if (animCtl) animCtl.stop();
  while (gAnim.firstChild) gAnim.removeChild(gAnim.firstChild);
});






$BcontrolCol.on("change", ".lw-animate-toggle", function () {
  const doAnimate = this.checked;

  // Stop any running animation
  if (animCtl) animCtl.stop();

  // Nothing parsed yet? Nothing to do.
  const hasMoves = lastParsed.moves && lastParsed.moves.length;
  const hasTokens = lastParsed.tokens && lastParsed.tokens.length;

  if (!hasMoves && !hasTokens) return;

  if (!doAnimate) {
    // Switch OFF: show final static arrows immediately
    if (hasMoves) {
      renderFinalArrows(lastParsed.moves, pointMemory, gAnim, svgEl );
    } else {
      renderFinalArrowsFromTokens(lastParsed.tokens, pointMemory, gAnim);
    }
    return;
  }

  // Switch ON: restart animation immediately (using last parsed result)
  if (hasMoves) {
    animCtl = animateMoves(lastParsed.moves, pointMemory, gAnim, { waitMs: 900, pxPerSec: 900 });
  } else {
    animCtl = animateSoundString(lastParsed.tokens, pointMemory, gAnim, { waitMs: 900, pxPerSec: 900 });
  }
});










$BcontrolCol.on("keydown", ".lw-query", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    $BcontrolCol.find(".lw-run").trigger("click");
  }
});





console.log("SVG size", svg.getAttribute("width"), svg.getAttribute("height"),
            "viewBox", svg.getAttribute("viewBox"));



  function getSoundFromHash() {
  const h = (window.location.hash || "").replace(/^#/, ""); // remove leading #
  if (!h) return null;

  // Accept: sound-HELO
  if (!h.toLowerCase().startsWith("sound-")) return null;

  const raw = h.slice("sound-".length);
  if (!raw) return null;

  // Decode URL encoding (so %28IE%29 works for parentheses)
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}


const hashSound = getSoundFromHash();
if (hashSound) {
  const $q = $BcontrolCol.find(".lw-query");
  $q.val(hashSound);
  
  console.log(hashSound);

  // Trigger the existing Run click handler
  // Use a 0ms timeout to ensure DOM is fully in place
  setTimeout(() => {
    $BcontrolCol.find(".lw-run").trigger("click");
  }, 0);
}

$(window).on("hashchange.languageWheel", function () {
  const hashSound = getSoundFromHash();
  if (!hashSound) return;

  $BcontrolCol.find(".lw-query").val(hashSound);
  $BcontrolCol.find(".lw-run").trigger("click");
});





function insertAtCaret(inputEl, text) {
  const start = inputEl.selectionStart ?? inputEl.value.length;
  const end = inputEl.selectionEnd ?? inputEl.value.length;

  const before = inputEl.value.slice(0, start);
  const after = inputEl.value.slice(end);

  inputEl.value = before + text + after;

  const newPos = start + text.length;
  inputEl.setSelectionRange(newPos, newPos);
  inputEl.focus();
}



$BcontrolCol.on("click", ".lw-insert-sound", function (e) {
  e.preventDefault();

  const sound = $(this).text();
  const inputEl = $BcontrolCol.find(".lw-query").get(0);

  insertAtCaret(inputEl, sound);
});




$BcontrolCol.on("click", ".lw-insert-sound-string", function (e) {
  e.preventDefault();

  const s = ($(this).attr("data-sound") || $(this).text() || "").trim();
  if (!s) return;

  // 1) Put in textbox
  const $input = $BcontrolCol.find(".lw-query");
  $input.val(s).trigger("input").focus();

  // 2) Update hash (so the URL is shareable)
  // Encode to support parentheses etc. [monte: don't encode]
  window.location.hash = "sound-" + (s);

  // 3) Run as if user clicked arrow / pressed Enter
  $BcontrolCol.find(".lw-run").trigger("click");
});






const LW_HISTORY_KEY = "languageWheel.history.v1";
const LW_HISTORY_MAX = 200; // keep up to 200 entries (scroll UI still shows ~5)

function fmtHistoryTime(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function loadHistoryFromStorage() {
  try {
    const raw = localStorage.getItem(LW_HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    // expected: [{ q: "HELO", ts: "YYYY-MM-DD HH:mm:ss" }, ...]
    return arr
      .filter(x => x && typeof x.q === "string" && typeof x.ts === "string")
      .slice(0, LW_HISTORY_MAX);
  } catch {
    return [];
  }
}

function saveHistoryToStorage(items) {
  try {
    localStorage.setItem(LW_HISTORY_KEY, JSON.stringify(items.slice(0, LW_HISTORY_MAX)));
  } catch {
    // ignore quota/security errors
  }
}


function renderHistoryList($BcontrolCol, items) {
  const $list = $BcontrolCol.find(".lw-history-list").empty();

  items.forEach(({ q, ts }) => {
    const $item = $(`
      <a href="#" class="list-group-item list-group-item-action lw-history-item">
        <div class="d-flex justify-content-between align-items-start">
          <div class="me-2 text-truncate" style="max-width: 70%"></div>
          <small class="text-muted flex-shrink-0"></small>
        </div>
      </a>
    `);

    $item.attr("data-sound", q);
    $item.find("div > div").first().text(q);
    $item.find("small").text(ts);

    $list.append($item);
  });
}





function addRunToHistory($BcontrolCol, cleansed) {
  const q = String(cleansed || "").trim();
  if (!q) return;

  const ts = fmtHistoryTime(new Date());
  const items = loadHistoryFromStorage();

  // Remove existing duplicate (case-sensitive; change if you want case-insensitive)
  const existingIndex = items.findIndex(x => x.q === q);
  if (existingIndex !== -1) items.splice(existingIndex, 1);

  // Add to top
  items.unshift({ q, ts });

  // Persist + render
  const trimmed = items.slice(0, LW_HISTORY_MAX);
  saveHistoryToStorage(trimmed);
  renderHistoryList($BcontrolCol, trimmed);
}




$BcontrolCol.on("click", ".lw-history-item", function (e) {
  e.preventDefault();

  const s = ($(this).attr("data-sound") || "").trim();
  if (!s) return;

  // Put in textbox
  $BcontrolCol.find(".lw-query").val(s).trigger("input").focus();

  // Update hash (optional but consistent with your other behavior)
  window.location.hash = "sound-" + encodeURIComponent(s);

  // Run
  $BcontrolCol.find(".lw-run").trigger("click");
});



$BcontrolCol.on("click", ".lw-history-clear", function () {
  $BcontrolCol.find(".lw-history-list").empty();
});




renderHistoryList($BcontrolCol, loadHistoryFromStorage());


function isBackgroundImageVisible(svg) {
  if (!svg || typeof svg.querySelector !== "function") return false;

  const el = svg.querySelector(".lw-bg-image");
  // console.log(window.getComputedStyle(el).display);
  if (!el) return false;

  return window.getComputedStyle(el).display !== "none";
}



function determineBackgroundState($BcontrolCol, settings, svg) {
  const desired = !!settings?.showClasses?.backgroundImage;
  const actual  = isBackgroundImageVisible(svg);
  
  console.log(desired); console.log(actual);

  const $cb = $BcontrolCol.find("#lw-toggle-backgroundImage");
  if ($cb.length === 0) return;

  if (desired !== actual) {
    $cb.trigger("click", { programmatic: true });
  }
  
  if(!desired)
  {
	  $cb.trigger("click", { programmatic: true });
  }
 
}



determineBackgroundState($BcontrolCol, settings, svg);





/* end of instance */
    });
  };
})(jQuery);





/* ============================================================================
 * languageWheel.js — Table of Contents (current functions)
 * ----------------------------------------------------------------------------
 * 0) Plugin Wrapper / Globals
 *    - CLASS_MAP (const)
 *    - PRIMAL_DEFINITIONS (const via window.PRIMAL_DEFINITIONS)
 *
 * 1) Definitions
 *    - defText(token)
 *
 * 2) Static Rendering
 *    - renderFinalArrows(moves, pointMemory, gAnim, svgEl)
 *    - renderFinalArrowsFromTokens(tokens, pointMemory, gAnim)
 *
 * 3) Animation (Moves-based: current)
 *    - animateMoves(moves, pointMemory, gAnim, opts = {})
 *      - clearAnim()                [inner]
 *      - schedule(fn, ms)           [inner]
 *      - drawStep(i)                [inner]
 *
 * 4) Arrow / Blend Drawing Primitives
 *    - drawArrowToPoint(svgEl, gAnim, from, to, opts = {})
 *    - drawBlendLabel(svgEl, gAnim, text, x, y)
 *    - drawBlendMove(svgEl, gAnim, pointMemory, v1, v2, opts = {})
 *    - drawArrow(gAnim, pointMemory, from, to, opts = {})
 *
 * 5) Animation (Tokens-based: legacy / duplicate path)
 *    - animateSoundString(tokens, pointMemory, gAnim, opts = {})
 *      - clearAnim()                [inner]
 *      - schedule(fn, ms)           [inner]
 *      - drawStep(i)                [inner]
 *      - loopRestart()              [inner]
 *
 * 6) Parsing + Move Construction
 *    - addMove(from, to, kind)
 *    - cleanseAndTokenizeQuery(raw, pointMemory)
 *      - pushNormalToken(token, moves, pointMemory, state)   [inner]
 *      - pushBlendTokens(blendText, moves, pointMemory, state)[inner]
 *      - parseInline(chunk)                                  [inner]
 *    - formatParsedTokens(tokens)
 *    - parseQueryString(q, pointMemory)
 *      - resolveToken(t, pm)                                 [inner]
 *      - greedyParseChunk(chunk, sortedTokens, pm)           [inner]
 *
 * 7) Show/Hide Classes
 *    - applyVisibilityFromShowClasses(settings, svg)
 *
 * 8) Admin Panel / UI Construction
 *    - buildControlsPanel(settings)
 *      - addRow(token)                                       [inner]
 *
 * 9) Geometry Helpers (Polar / Blend Math)
 *    - polarToXYFromMemory(pointMemory, token)
 *    - drawGuideArrow(svgEl, gAnim, fromPt, toPt)
 *    - computeBlendDestination(pointMemory, v1, v2)
 *    - degToRad(deg)
 *    - polarToXY(cx, cy, r, thetaDeg)
 *
 * 10) SVG Helpers
 *    - svgEl(name, attrs = {})
 *    - addTitle(node, text)
 *
 * ----------------------------------------------------------------------------
 * Notes:
 * - There are two animation systems in-file: animateMoves(...) (primary) and
 *   animateSoundString(...) (legacy). Consider consolidating later.
 * - Nested functions listed as [inner] live inside their parent function.
 * ============================================================================
 */
 
 // https://study.com/cimages/multimages/16/vocal_tract_overview8820776905474252399.jpg
 
