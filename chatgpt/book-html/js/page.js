  
function applyTheme(theme) {
  // theme: "night" | "classic"
  document.documentElement.classList.toggle("theme-classic", theme === "classic");
  localStorage.setItem("ebookTheme", theme);

  const cb = document.getElementById("toggleTheme");
  if (cb) cb.checked = (theme === "classic");
}
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  // --------- RHS TOC generator (console output for copy/paste) ----------
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }



// ---------- Fixed header height helper ----------
function headerHeight() {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--header-h");
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 80;
}


// console.debug("headerHeight():", headerHeight());


function stripLeadingEnum(text) {
  // Matches: "1", "1.2", "1.2.a", "12.3.z" etc + whitespace
  // and removes it so titles don’t double-prefix.
  return String(text).replace(/^\s*\d+(?:\.\d+)*(?:\.[a-z]+)?\s+/i, "").trim();
}



  // ---------- Enumeration helpers ----------

// 1 -> "a", 2 -> "b", ...
function numToLetters(n) {
  // supports beyond 26 as aa, ab... if you ever need it
  let s = "";
  while (n > 0) {
    n--; // 1->0 => a
    s = String.fromCharCode(97 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s || "a";
}

// "Immediately found after the <section> tag" = first *direct child* heading of expected level
function findImmediateHeading(sectionEl, tagName) {
  const tag = tagName.toUpperCase();
  for (const child of sectionEl.children) {
    // only accept the first direct child heading that matches
    if (child.tagName === tag) return child;
    // If you want to be strict "immediately", uncomment next line to stop at first element child:
    // break;
  }
  return null;
}

function warnMissingTitle(id, enumLabel, expectedTag) {
  console.log(
    `"id"=${id} classified as ${enumLabel} :: cannot find the  appropriate <${expectedTag.toLowerCase()}>header which is the title.  Substituting with "PLACEHOLDER" for now.`
  );
}

function getCurrentChapterElement() {
  const probeY = window.scrollY + headerHeight() + 30;
  const chapters = Array.from(document.querySelectorAll("section.chapter[id]"));

  let current = null;
  for (const ch of chapters) {
    if (ch.offsetTop <= probeY) current = ch;
  }
  return current || chapters[0] || null;
}



function setEnumData(sectionEl, headingEl, enumLabel) {
  // Put on section so enumeration is discoverable even if heading is missing
  if (sectionEl) sectionEl.dataset.enum = enumLabel;

  // Put on heading for CSS ::before
  if (headingEl && headingEl.dataset) headingEl.dataset.enum = enumLabel;
}



// Compute enumeration map without modifying DOM
// Returns { chapters: [...], itemsById: Map(id -> {type, enum, title, headingEl}) }
// Compute enumeration map (sets data-enum attributes; does NOT change heading text)
// Returns { chapters: [...], itemsById: Map(id -> {type, enum, title, headingEl, el, ...}) }
function computeEnumerationModel() {
  const chapters = Array.from(document.querySelectorAll("section.chapter[id]"));
  const itemsById = new Map();

  let numberedChapterCount = 0;

  chapters.forEach((chEl) => {
    const isFront = chEl.classList.contains("frontmatter");
    const chId = chEl.id;

    // Determine chapter enumeration (blank for frontmatter)
    const chEnum = isFront ? "" : String(++numberedChapterCount);

    // Chapter title from immediate h2
    const chH = findImmediateHeading(chEl, "h2");
    const chTitle = chH ? chH.textContent.trim() : "PLACEHOLDER";
    if (!chH) warnMissingTitle(chId, chEnum || "(frontmatter)", "h2");

    // Apply enum to DOM (only if numbered)
    if (chEnum) setEnumData(chEl, chH, chEnum);
    else {
      // Ensure no stale enum remains if you re-run after edits
      delete chEl.dataset.enum;
      if (chH) delete chH.dataset.enum;
    }

    itemsById.set(chId, {
      type: "chapter",
      enum: chEnum,
      title: chTitle,
      headingEl: chH || null,
      el: chEl,
      isFrontmatter: isFront,
    });

    // Sections: direct children of chapter
    const sections = Array.from(chEl.querySelectorAll(":scope > section.section[id]"));

    sections.forEach((secEl, secIndex0) => {
      const secId = secEl.id;

      // If chapter is unnumbered (frontmatter), we can either:
      // A) leave section enums blank (recommended for clean frontmatter)
      // B) still number them like "0.1" or "FM.1"
      // We'll choose A: blank when frontmatter.
      const secEnum = chEnum ? `${chEnum}.${secIndex0 + 1}` : "";

      const secH = findImmediateHeading(secEl, "h3");
      const secTitle = secH ? secH.textContent.trim() : "PLACEHOLDER";
      if (!secH) warnMissingTitle(secId, secEnum || "(frontmatter)", "h3");

      if (secEnum) setEnumData(secEl, secH, secEnum);
      else {
        delete secEl.dataset.enum;
        if (secH) delete secH.dataset.enum;
      }

      itemsById.set(secId, {
        type: "section",
        enum: secEnum,
        title: secTitle,
        headingEl: secH || null,
        el: secEl,
        parentChapterId: chId,
        isFrontmatter: isFront,
      });

      // Subsections: direct children of section
      const subs = Array.from(secEl.querySelectorAll(":scope > section.subsection[id]"));
      subs.forEach((subEl, subIndex0) => {
        const subId = subEl.id;

        const letter = numToLetters(subIndex0 + 1);
        const subEnum = secEnum ? `${secEnum}.${letter}` : "";

        const subH = findImmediateHeading(subEl, "h4");
        const subTitle = subH ? subH.textContent.trim() : "PLACEHOLDER";
        if (!subH) warnMissingTitle(subId, subEnum || "(frontmatter)", "h4");

        if (subEnum) setEnumData(subEl, subH, subEnum);
        else {
          delete subEl.dataset.enum;
          if (subH) delete subH.dataset.enum;
        }

        itemsById.set(subId, {
          type: "subsection",
          enum: subEnum,
          title: subTitle,
          headingEl: subH || null,
          el: subEl,
          parentChapterId: chId,
          parentSectionId: secId,
          isFrontmatter: isFront,
        });
      });
    });
  });

  return { chapters, itemsById };
}






// ---------- Function 1: generateRHS (console output only) ----------
// ---------- Function: generateRHS (console output only) ----------
// generateRHS()              => uses current chapter
// generateRHS("ch-id")       => explicit chapter id
// generateRHS(chapterEl)     => explicit chapter element
function generateRHS(chapterElOrId) {
  // Ensure enumeration model is up to date
  const model = computeEnumerationModel();

  // Resolve chapter element
  let chapterEl = null;
  if (!chapterElOrId) {
    chapterEl = getCurrentChapterElement();
  } else if (typeof chapterElOrId === "string") {
    chapterEl = document.getElementById(chapterElOrId);
  } else if (chapterElOrId instanceof HTMLElement) {
    chapterEl = chapterElOrId;
  }

  if (!chapterEl || !chapterEl.classList.contains("chapter") || !chapterEl.id) {
    console.warn("generateRHS: invalid or missing chapter");
    return "";
  }

  const chId = chapterEl.id;

  // Enumeration and title (enum from DOM, title from model)
  const chEnum  = chapterEl.dataset.enum || model.itemsById.get(chId)?.enum || "";
  const chTitle = model.itemsById.get(chId)?.title || chId;

  // Collect sections (direct children only)
  const sections = Array.from(
    chapterEl.querySelectorAll(":scope > section.section[id]")
  );

  const navLines = [];

  sections.forEach((secEl) => {
    const secId = secEl.id;
    const secEnum  = secEl.dataset.enum || model.itemsById.get(secId)?.enum || "";
    const secTitle = model.itemsById.get(secId)?.title || "PLACEHOLDER";

    // Section link (TITLE ONLY; enum via data-id)
    navLines.push(
      `    <a href="#${secId}" data-id="${secEnum}" data-target="${secId}">${secTitle}</a>`
    );

    // Subsections (direct children only)
    const subs = Array.from(
      secEl.querySelectorAll(":scope > section.subsection[id]")
    );

    if (subs.length) {
      navLines.push(`    <div class="toc-nest">`);

      subs.forEach((subEl) => {
        const subId = subEl.id;
        const subEnum  = subEl.dataset.enum || model.itemsById.get(subId)?.enum || "";
        const subTitle = model.itemsById.get(subId)?.title || "PLACEHOLDER";

        navLines.push(
          `      <a href="#${subId}" data-id="${subEnum}" data-target="${subId}">${subTitle}</a>`
        );
      });

      navLines.push(`    </div>`);
    }
  });

  // Final RHS TOC markup (paste-ready)
  const out =
`<!-- Per-chapter RHS TOC (generated) -->
<aside class="right-toc chapter-toc"
       data-for-chapter="${chId}"
       aria-label="Local contents for ${chTitle}">
  <div class="toc-title">
    <span>In this chapter</span>
    <span class="muted toc-chapter-label" data-id="${chEnum}">${chTitle}</span>
  </div>

  <nav class="d-grid gap-1">
${navLines.join("\n")}
  </nav>
</aside>`;

  // Console output with clear delimiters for copy/paste
  console.log(
    `===== RHS TOC START (${chId}) =====\n` +
    out +
    `\n===== RHS TOC END (${chId}) =====`
  );

  return out;
}


// ---------- Function 2: generateEnumeration (modifies content headings) ----------
function generateEnumeration() {
  computeEnumerationModel(); // side effect: sets data-enum on sections/headings
  console.log("generateEnumeration: data-enum attributes applied (no text modified).");
}

// Expose to DevTools console
  // Make it callable from DevTools:
window.generateRHS = generateRHS;
window.generateEnumeration = generateEnumeration;



// console usage 
// find section class=chapter by its id, and the console will spit out the necessary HTML to build out the RHS sidebar navigation
//generateRHS("ch1");







/* global $, DataTable */

(function () {
  // --------- Scroll helpers ----------
  function headerHeight() {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--header-h");
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 80;
  }

  function smoothScrollToId(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - (headerHeight() + 12);
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  function setActiveLink($scope, href) {
    $scope.find("a").removeClass("active");
    $scope.find(`a[href="${href}"]`).addClass("active");
  }


  // --------- Build Left TOC from chapters ----------
function buildLeftTOC() {
  const toc = document.getElementById("tocLeft");
  if (!toc) return;

  const allChapters = Array.from(document.querySelectorAll("section.chapter[id]"));
  if (!allChapters.length) {
    console.warn("buildLeftTOC: no section.chapter[id] found");
    toc.innerHTML = "";
    return;
  }

  const frontmatter = allChapters.filter(ch => ch.classList.contains("frontmatter"));
  const mainChapters = allChapters.filter(ch => !ch.classList.contains("frontmatter"));

  const lines = [];

  function renderChapterLink(ch) {
    const id = ch.id;

    // Title from immediate h2
    const h2 = findImmediateHeading(ch, "h2");
    const title = h2 ? h2.textContent.trim() : id;

    // Enum from DOM (blank for frontmatter by design)
    const enumVal = ch.dataset.enum || (h2 ? h2.dataset.enum : "") || "";
    const dataIdAttr = enumVal ? ` data-id="${enumVal}"` : "";

    lines.push(
      `<a class="toc-chapter-link" href="#${id}"${dataIdAttr} data-target="${id}">${title}</a>`
    );
  }

  // Front Matter first
  if (frontmatter.length) {
    lines.push(`<div class="toc-group-label">Front Matter</div>`);
    frontmatter.forEach(renderChapterLink);
  }

  // Then main Chapters
  if (mainChapters.length) {
    lines.push(`<div class="toc-group-label">Chapters</div>`);
    mainChapters.forEach(renderChapterLink);
  }

  toc.innerHTML = lines.join("\n");
}




  // --------- Per-chapter RHS TOC show/hide ----------
function showChapterTOC(chapterId) {
  const tocs = Array.from(document.querySelectorAll("aside.right-toc.chapter-toc"));
  if (!tocs.length) {
    console.warn("showChapterTOC: no aside.right-toc.chapter-toc found");
    return;
  }

  // Hide all
  tocs.forEach((a) => a.classList.add("is-hidden"));

  // Show matching
  const sel = `aside.right-toc.chapter-toc[data-for-chapter="${CSS.escape(chapterId)}"]`;
  const active = document.querySelector(sel);

  if (!active) {
    console.warn("showChapterTOC: no TOC found for chapter:", chapterId);
    return;
  }

  active.classList.remove("is-hidden");
}







// temp 
window.showChapterTOC = showChapterTOC;




  // Optional: highlight local TOC item as you scroll sections within a chapter
  function wireLocalTOCActiveState() {
    // Click behavior: smooth scroll (anchors still work without JS)
    $(document).on("click", ".chapter-toc a[href^='#']", function (e) {
      const href = $(this).attr("href");
      if (!href) return;

      const id = href.replace("#", "");
      if (!document.getElementById(id)) return;

      e.preventDefault();
      smoothScrollToId(id);
    });

    // Scroll spy for local sections (lightweight)
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        // find the most "visible" entry
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];

        if (!visible) return;

        const secId = visible.target.id;
        const $activeToc = $(".chapter-toc:visible");
        if ($activeToc.length) {
          setActiveLink($activeToc, `#${secId}`);
        }
      },
      {
        root: null,
        // bias to the top reading zone under the fixed header
        rootMargin: `-${headerHeight() + 20}px 0px -70% 0px`,
        threshold: [0.05, 0.15, 0.3, 0.6],
      }
    );

    // Observe only “real” sections that can appear in local TOC
    $("section[id][data-title]").each(function () {
      sectionObserver.observe(this);
    });
  }








function wireTOCClicks() {
  // One handler for all in-page hash links in the TOCs
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;

    // Only react to links inside either TOC
    if (!a.closest(".left-toc") && !a.closest(".chapter-toc")) return;

    const targetId = a.getAttribute("href").slice(1);
    if (!targetId) return;

    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;

    // Find the chapter containing that target
    const chapterEl = targetEl.closest("section.chapter[id]");
    if (chapterEl?.id) {
      showChapterTOC(chapterEl.id);
    }
  });

  // Also handle browser navigation (back/forward) and manual hash edits
  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (!id) return;

    const el = document.getElementById(id);
    const ch = el?.closest("section.chapter[id]");
    if (ch?.id) showChapterTOC(ch.id);
  });
}



  // Detect which chapter you're in and show its TOC
 function wireChapterDetection() {
  const chapters = Array.from(document.querySelectorAll("section.chapter[id]"));
  if (!chapters.length) {
    console.warn("wireChapterDetection: no section.chapter[id] found");
    return;
  }

  let activeId = null;

  function setActiveChapter(id) {
    if (!id || id === activeId) return;
    activeId = id;
    showChapterTOC(id);
  }

  // Use a stable, literal rootMargin (IntersectionObserver requires px/% only)
  const headerH =
    parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h"), 10) || 80;

  // Trigger when the chapter top crosses below header region
  const topMarginPx = headerH + 30;

  const io = new IntersectionObserver(
    (entries) => {
      // Prefer the entry closest to the top that is intersecting
      const visible = entries.filter((e) => e.isIntersecting);
      if (!visible.length) return;

      visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      const best = visible[0]?.target;
      if (best?.id) setActiveChapter(best.id);
    },
    {
      root: null,
      rootMargin: `-${topMarginPx}px 0px -70% 0px`,
      threshold: 0.01,
    }
  );

  chapters.forEach((ch) => io.observe(ch));

  // Initial selection:
  // 1) if hash points somewhere, show that chapter
  // 2) else show the first chapter
 // Initial selection: hash-aware
if (location.hash) {
  const id = location.hash.slice(1);
  const el = document.getElementById(id);
  const ch = el?.closest("section.chapter[id]");
  if (ch?.id) showChapterTOC(ch.id);
} else {
  const first = document.querySelector("section.chapter[id]");
  if (first?.id) showChapterTOC(first.id);
}



}






















function initEpomPopover() {
  const trigger = document.getElementById("epomLink");
  const tpl = document.getElementById("tpl-epom");
  if (!trigger || !tpl) return;

  const getContentHtml = () => {
    const node = tpl.content.cloneNode(true);
    const wrap = document.createElement("div");
    wrap.appendChild(node);
    return wrap.innerHTML;
  };

  // eslint-disable-next-line no-undef
  const pop = new bootstrap.Popover(trigger, {
    html: true,
    sanitize: false,
    placement: "top",     // doesn't matter; we'll override position after show
    trigger: "manual",
    title: "EPOM–ESCM",
    content: getContentHtml,
    customClass: "epom-popover"
  });

  const isOpen = () => !!trigger.getAttribute("aria-describedby");

  function positionPopover() {
    const tipId = trigger.getAttribute("aria-describedby");
    const tipEl = tipId ? document.getElementById(tipId) : null;
    if (!tipEl) return;

    // Desired anchor: just above footer
    const footer = document.querySelector(".app-footer");
    const footerRect = footer ? footer.getBoundingClientRect() : { top: window.innerHeight };

    // Measure popover
    const tipRect = tipEl.getBoundingClientRect();

    // 50px from left edge (your requirement)
    let left = 50;

    // Just above footer with a small gap
    const gap = 10;
    let top = footerRect.top - tipRect.height - gap;

    // Clamp within viewport (top)
    if (top < 10) top = 10;

    // Clamp right edge so it doesn't go offscreen
    const maxLeft = window.innerWidth - tipRect.width - 10;
    if (left > maxLeft) left = Math.max(10, maxLeft);

    // Force fixed positioning
    tipEl.style.position = "fixed";
    tipEl.style.inset = "auto";     // neutralize Popper's inset styles if present
    tipEl.style.top = `${Math.round(top)}px`;
    tipEl.style.left = `${Math.round(left)}px`;
    tipEl.style.transform = "none"; // neutralize Popper translate()
  }

  function show() {
    pop.show();

    // Wait a tick so tip exists in DOM, then position it
    requestAnimationFrame(() => {
      positionPopover();
    });
  }

  function hide() {
    pop.hide();
  }

  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    if (isOpen()) hide();
    else show();
  });

  // Close on outside click, but allow selection inside
  document.addEventListener("click", (e) => {
    if (!isOpen()) return;

    const tipId = trigger.getAttribute("aria-describedby");
    const tipEl = tipId ? document.getElementById(tipId) : null;

    const insideTrigger = trigger.contains(e.target);
    const insidePopover = tipEl && tipEl.contains(e.target);

    if (!insideTrigger && !insidePopover) hide();
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) hide();
  });

  // Reposition on resize (and if you ever change footer height)
  window.addEventListener("resize", () => {
    if (isOpen()) positionPopover();
  });
}






function wireLocalTOCScrollSpy() {
  const targets = Array.from(
    document.querySelectorAll("section.section[id], section.subsection[id]")
  );
  if (!targets.length) return;

  let currentId = null;

  function setActive(id) {
    if (!id || id === currentId) return;
    currentId = id;

    const activeChapter = getCurrentChapterElement?.();
    const chapterId = activeChapter?.id;

    document
      .querySelectorAll("aside.chapter-toc a.active")
      .forEach((a) => a.classList.remove("active"));

    if (!chapterId) return;

    const toc = document.querySelector(
      `aside.chapter-toc[data-for-chapter="${chapterId}"]`
    );
    if (!toc) return;

    const link = toc.querySelector(
      `a[data-target="${CSS.escape(id)}"]`
    );
    if (link) link.classList.add("active");
  }

  // ✅ Compute numeric values FIRST
  const headerOffset =
    parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue("--header-h")) || 80;

  const topMargin = headerOffset + 20; // tweak if needed

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting);
      if (!visible.length) return;

      visible.sort(
        (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
      );

      const best = visible[0]?.target;
      if (best?.id) setActive(best.id);
    },
    {
      root: null,
      rootMargin: `-${topMargin}px 0px -60% 0px`,
      threshold: 0.01,
    }
  );

  targets.forEach((el) => observer.observe(el));

  // Hash navigation support
  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (id) setActive(id);
  });

  if (location.hash) {
    setActive(location.hash.slice(1));
  }
}







/* author popover */

function initAboutAuthorPopover() {
  const trigger = document.getElementById("authorLink");
  const tpl = document.getElementById("tpl-about-author");
  if (!trigger || !tpl) return;

  const getContentHtml = () => {
    const node = tpl.content.cloneNode(true);
    const wrap = document.createElement("div");
    wrap.appendChild(node);
    return wrap.innerHTML;
  };

  // eslint-disable-next-line no-undef
  const pop = new bootstrap.Popover(trigger, {
    html: true,
    placement: "top",
    trigger: "manual",          // we will manage show/hide for better outside-click behavior
    title: "About the Author",
    content: getContentHtml,
    customClass: "about-author-popover",
    sanitize: false             // because we're injecting trusted template HTML
  });

  function isOpen() {
    return !!trigger.getAttribute("aria-describedby");
  }

  function toggle() {
    if (isOpen()) pop.hide();
    else pop.show();
  }

  // Toggle on click
  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    toggle();
  });

  // Close on click outside
  document.addEventListener("click", (e) => {
    if (!isOpen()) return;

    const tipId = trigger.getAttribute("aria-describedby");
    const tipEl = tipId ? document.getElementById(tipId) : null;

    const clickedInsideTrigger = trigger.contains(e.target);
    const clickedInsidePopover = tipEl && tipEl.contains(e.target);

    if (!clickedInsideTrigger && !clickedInsidePopover) {
      pop.hide();
    }
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) pop.hide();
  });
}




  // --------- Clipboard widget ----------
  function attachClipboardButtons() {
    // Ensure each dialog has a copy button (idempotent)
    $(".dialog").each(function () {
      const $d = $(this);
      if ($d.find(".clip-btn").length === 0) {
        $d.prepend('<button class="clip-btn" type="button">Copy</button>');
      }
    });

    // Copy bubble text
    $(document).on("click", ".clip-btn", async function () {
      const $dialog = $(this).closest(".dialog");
      const text = $dialog.find(".bubble").text().trim();
      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);
        const $btn = $(this);
        const old = $btn.text();
        $btn.text("Copied!");
        setTimeout(() => $btn.text(old), 900);
      } catch (e) {
        // Fallback
        const $tmp = $("<textarea>").val(text).appendTo("body").select();
        document.execCommand("copy");
        $tmp.remove();
      }
    });
  }

  // --------- Boot ----------
  $(function () {
	  
	  // 1) Mark JS enabled FIRST so CSS contract is predictable
  document.documentElement.classList.add("js-enabled");
  
  
  // 2) Optional: auto-enumerate BEFORE any TOC/detection so headings are stable
  if (document.documentElement.classList.contains("auto-enumerate")) {
    generateEnumeration();
  }
  
   // 3) Build UI + behaviors
  buildLeftTOC();
  attachClipboardButtons();
  
  
   // IMPORTANT: wireChapterDetection must exist and call showChapterTOC internally
  wireTOCClicks();
  wireChapterDetection();
  
  
wireLocalTOCScrollSpy();
  
  
  /*
  // Hide all RHS TOCs by default in JS mode; chapter detection will reveal one
document.querySelectorAll("aside.chapter-toc").forEach(el => el.classList.add("is-hidden"));

// Force-show first chapter's TOC immediately (prevents “none shown”)
const firstCh = document.querySelector("section.chapter[id]");
if (firstCh) showChapterTOC(firstCh.id);
*/


// Theme init (default: night)
const saved = localStorage.getItem("ebookTheme");
applyTheme(saved === "classic" ? "classic" : "night");

// Toggle handler
$("#toggleTheme").on("change", function () {
  applyTheme(this.checked ? "classic" : "night");
});


// Bootstrap tooltips (footer acronym, etc.)
document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
  // eslint-disable-next-line no-undef
  new bootstrap.Tooltip(el, { trigger: "hover focus", html: true });
});



// Bootstrap popovers (About the Author)
initAboutAuthorPopover();


initEpomPopover(); 






  
  
  // If you’re still using this, it’s fine, but it should not be required for RHS TOC anymore
  // wireLocalTOCActiveState();
	

    // DataTables demo (optional)
    const tbl = $("#demoTable");
    if (tbl.length) {
      tbl.DataTable({
        paging: false,
        searching: false,
        info: false,
      });
    }

    // If hash present, scroll nicely (still works without JS)
    if (location.hash) {
      const id = location.hash.replace("#", "");
      setTimeout(() => smoothScrollToId(id), 50);
    }
  });
  
  
  
  
  
  
  
  
  
  
 
  
  
  
})();
