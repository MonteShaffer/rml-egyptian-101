/* global window */
(function () {
  "use strict";

  // -------------------------------
// Primal semantic definitions (current synthesis)
// -------------------------------
const PRIMAL_DEFINITIONS = {
  vowels: {
    A: "Ascent / rising toward coherence; upward movement that may imply order or organization depending on context.",
    E: "Monad; constructed center or reference point; requires muscular tension and serves as a relational anchor.",
    I: "Water / fluid domain; life-flow medium (rivers, bodily fluids, circulation by context).",
    O: "Depth / profoundness; degree of inwardness or intensity of a domain.",
    U: "Outward gradient into the temporal and earthly; instability, disorder, slope, or divergence from center.",
    "ʔ": "NULL operator; intentional stop or absence (not zero); boundary where something is withheld or terminated.",
    AE: "Distressed ascent; strained or forced emergence from the center (crying, pain, exertion).",
    "ə": "Reduced or neutralized vowel; weakened center under gravitational pull of surrounding sounds."
  },

  consonants: {
    R: "Manifestation; making something internal or latent externally perceivable or realized.",
    L: "Continuity; sustained extension, smooth persistence, or calming carry-through.",
    T: "Plane / horizon; infinite line or surface defining a boundary or level of reference.",
    N: "Interface operator; negotiates or mediates between what lies to its left and right.",
    S: "Make / enact / assert; to cause something to occur or be established.",
    M: "Turning; modulation, internal circulation, reversal, or oscillation of a process.",
    G: "Bounded resistance; hard constraint, obstruction, or stopping force.",
    K: "Unbounded or infinite force; scale beyond finitude, overwhelming or limitless extension.",
    H: "Breath; baseline life-energy and respiration without applied force.",
    B: "Foot; grounding, contact with earth, physical support or base.",
    D: "Hand; agency above the horizon, action taken from a higher or guiding position.",
    V: "Bottom or lower extremity; base point or lowest functional part of a thing.",
    Y: "Directed force; focused, aimed agency or intentional strike.",
    P: "Class or membership operator; denotes category, grouping, or class-instance relation.",

    ch: "Activated life-energy; vitality or animating force (chi-like), energized but not violent.",
    th: "Tongue–teeth interface; grasping, tearing, or seizing action at a boundary.",
    sh: "Emotional modulation; affective coloring of energy (joy, sorrow, attachment, feeling).",
    zh: "Radiant or shimmering vitality; animated light or expressive energy (definition stabilizing).",
   J: "Discernment; cognitive recognition and evaluation without enactment.",
    Z: "Light-from-above; radiant illumination, clarity, or revealed presence.",
    W: "Flow or conveyance; carried motion or passage (definition stabilizing).",
    F: "Administrative regulation; impartial bearing of duty, burden, or governance without judgment."
  },

  clicks: {
    "ʘ": "Internalized closure; sealed or contained absence (definition stabilizing).",
    "ǁ": "Parallel separation; dual-channel division or split pathway (definition stabilizing).",
    "ǀ": "Singular cut or discrete boundary; isolated separation (definition stabilizing)."
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
      blendVowels: false,
      consonants: true,
      clicks: false
    },

    showCenterLines: true,
    showInnerCircles: true,
    showRadials: true,
    showPentagram: true,
    showMonadE: true,
	showStressedAE: true,
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
