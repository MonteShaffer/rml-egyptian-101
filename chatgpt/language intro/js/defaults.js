/* global window */
(function () {
  "use strict";

  // -------------------------------
  // Primal semantic definitions
  // -------------------------------
  const PRIMAL_DEFINITIONS = {
    vowels: {
      A: "Up / ascent; celestial/soul contextually (not always).",
      E: "Monad; center / reference point (constructed center).",
      I: "Water / fluid domain (incl. bodily fluids by context).",
      O: "Depth / profoundness (quality of deepness).",
      U: "Slope / gradient (up or down).",
      "ʔ": "NULL / intentional stop; boundary control operator (glottal stop).",
      AE: "(definition pending)",
      "ə": "(definition pending)"
    },
    consonants: {
      R: "Manifestation (making internal → external / perceivable).",
      L: "Continuity (unbroken persistence / carry-through).",
      T: "Horizon / infinite line; plane/boundary reference.",
      N: "Interface / meeting place between elements.",
      S: "Make / set / assert (to make it so).",
      M: "Turning (modulation / reversal / internal circulation).",
      G: "Bounded resistance / obstruction (hard stop).",
      K: "Unbounded / infinite-scale operator (beyond finitude).",
      H: "Breath (the breathing sound/operator).",
      B: "Foot / grounding (earth-bound contact).",
      D: "Hand (above; heavenly side in axis mapping).",
      V: "Bottom of a thing (lower extremity; proximate to foot domain).",
      Y: "Directed force / focused agency (strike/aimed motion).",
      P: "Class / membership operator (class object).",

      ch: "(definition pending)",
      th: "(definition pending)",
      sh: "(definition pending)",
      zh: "(definition pending)",
      J: "(definition pending)",
      Z: "(definition pending)",
      W: "(definition pending)",
      F: "(definition pending)"
    },
    clicks: {
      "ʘ": "(definition pending)",
      "ǁ": "(definition pending)",
      "ǀ": "(definition pending)"
    }
  };

  // -------------------------------
  // Wheel defaults / geometry
  // -------------------------------
  const LANGUAGE_WHEEL_DEFAULTS = {
    radiusPx: 300,
    paddingFactor: 0.1,

    showClasses: {
      primalVowels: true,
      stressVowels: false,
      blendVowels: false,
      consonants: true,
      clicks: false
    },

    showCenterLines: true,
    showInnerCircles: true,
    showRadials: true,
    showPentagram: true,
    showMonadE: true,
    showDefinitionsPanel: true,

    primalVowelStartTheta: -22,
    primalVowels: ["A", "I", "U", "O", "ʔ"],

    consonants: [
      { token: "R", theta: -10 },
      { token: "L", theta: 0 },
      { token: "D", theta: 10 },
      { token: "N", theta: 23 },
      { token: "T", theta: 36 },

      { token: "S", theta: 65 },
      { token: "ch", theta: 80 },
      { token: "th", theta: 95 },
      { token: "sh", theta: 110 },

      { token: "M", theta: 130 },
      { token: "B", theta: 140 },
      { token: "V", theta: 150 },
      { token: "P", theta: 160 },
      { token: "W", theta: 170 },
      { token: "F", theta: 180 },

      { token: "Y", theta: 210 },

      { token: "K", theta: 260 },
      { token: "G", theta: 270 },

      { token: "H", theta: 285 },
      { token: "zh", theta: 300 },
      { token: "J", theta: 315 },
      { token: "Z", theta: 330 }
    ],

    clicks: [
      { token: "ǁ", theta: -5 },
      { token: "ǀ", theta: 30 },
      { token: "ʘ", theta: 150 }
    ]
  };

  // -------------------------------
  // Expose to global scope
  // -------------------------------
  window.LANGUAGE_WHEEL_DEFAULTS = LANGUAGE_WHEEL_DEFAULTS;
  window.PRIMAL_DEFINITIONS = PRIMAL_DEFINITIONS;
})();
