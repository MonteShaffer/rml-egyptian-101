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

  chapters.forEach((chEl, chIndex0) => {
    const chNum = chIndex0 + 1;
    const chEnum = `${chNum}`;
    const chId = chEl.id;

    // chapter title from immediate h2
    const chH = findImmediateHeading(chEl, "h2");
    let chTitle = chH ? chH.textContent.trim() : "PLACEHOLDER";
    if (!chH) warnMissingTitle(chId, chEnum, "h2");

    // apply enums to DOM (section + heading)
    setEnumData(chEl, chH, chEnum);

    itemsById.set(chId, {
      type: "chapter",
      enum: chEnum,
      title: chTitle,
      headingEl: chH || null,
      el: chEl,
    });

    // sections: direct children of chapter with class section
    const sections = Array.from(chEl.querySelectorAll(":scope > section.section[id]"));

    sections.forEach((secEl, secIndex0) => {
      const secNum = secIndex0 + 1;
      const secId = secEl.id;
      const secEnum = `${chNum}.${secNum}`;

      const secH = findImmediateHeading(secEl, "h3");
      let secTitle = secH ? secH.textContent.trim() : "PLACEHOLDER";
      if (!secH) warnMissingTitle(secId, secEnum, "h3");

      setEnumData(secEl, secH, secEnum);

      itemsById.set(secId, {
        type: "section",
        enum: secEnum,
        title: secTitle,
        headingEl: secH || null,
        el: secEl,
        parentChapterId: chId,
      });

      // subsections: direct children of section with class subsection
      const subs = Array.from(secEl.querySelectorAll(":scope > section.subsection[id]"));
      subs.forEach((subEl, subIndex0) => {
        const letter = numToLetters(subIndex0 + 1);
        const subId = subEl.id;
        const subEnum = `${chNum}.${secNum}.${letter}`; // e.g., 1.1.a

        const subH = findImmediateHeading(subEl, "h4");
        let subTitle = subH ? subH.textContent.trim() : "PLACEHOLDER";
        if (!subH) warnMissingTitle(subId, subEnum, "h4");

        setEnumData(subEl, subH, subEnum);

        itemsById.set(subId, {
          type: "subsection",
          enum: subEnum,
          title: subTitle,
          headingEl: subH || null,
          el: subEl,
          parentChapterId: chId,
          parentSectionId: secId,
        });
      });
    });
  });

  return { chapters, itemsById };
}




// ---------- Function 1: generateRHS (console output only) ----------
// generateRHS() => uses current chapter
// generateRHS("ch-introduction") => explicit chapter id
// generateRHS(el) => explicit chapter element
function generateRHS(chapterElOrId) {
  const model = computeEnumerationModel();

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
  const chItem = model.itemsById.get(chId);
  const chEnum = chItem?.enum || "";
  const chTitle = chItem?.title || chId;

  // Build RHS TOC entries in the order: sections then their subsections
  const sections = Array.from(chapterEl.querySelectorAll(":scope > section.section[id]"));

  let navLines = [];

  sections.forEach((secEl) => {
    const secId = secEl.id;
    const secItem = model.itemsById.get(secId);
    const secEnum = secItem?.enum || "";
    const secTitle = secItem?.title || "PLACEHOLDER";
/*
    navLines.push(
      `    <a href="#${secId}" data-id="${secEnum}" data-target="${secId}">${secEnum} ${secTitle}</a>`
    );
	*/
	
	navLines.push(
  `    <a href="#${secId}" data-id="${secEnum}" data-target="${secId}">${secTitle}</a>`
);

    const subs = Array.from(secEl.querySelectorAll(":scope > section.subsection[id]"));
    if (subs.length) {
      navLines.push(`    <div class="toc-nest">`);
      subs.forEach((subEl) => {
        const subId = subEl.id;
        const subItem = model.itemsById.get(subId);
        const subEnum = subItem?.enum || "";
        const subTitle = subItem?.title || "PLACEHOLDER";
/*
        navLines.push(
          `      <a href="#${subId}" data-id="${subEnum}" data-target="${subId}">${subEnum} ${subTitle}</a>`
        );
*/		
	navLines.push(
  `      <a href="#${subId}" data-id="${subEnum}" data-target="${subId}">${subTitle}</a>`
);	
		
		
		
      });
      navLines.push(`    </div>`);
    }
  });

  const out =
`<!-- Per-chapter RHS TOC (generated) -->
<aside class="right-toc chapter-toc" data-for-chapter="${chId}" aria-label="Local contents for ${chEnum} ${chTitle}">
  <div class="toc-title">
    <span>In this chapter</span>
    <span class="muted toc-chapter-label">${chEnum} ${chTitle}</span>
  </div>

  <nav class="d-grid gap-1">
${navLines.join("\n")}
  </nav>
</aside>`;

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
    const $toc = $("#tocLeft").empty();

    $(".chapter").each(function () {
      const id = this.id;
      const title = $(this).data("chapter-title") || $(this).find("h2").first().text().trim() || id;

      const $a = $(`<a href="#${id}" class="toc-link">${title}</a>`);
      $a.on("click", function (e) {
        e.preventDefault();
        smoothScrollToId(id);
      });

      $toc.append($a);
    });
  }

  // --------- Per-chapter RHS TOC show/hide ----------
function showChapterTOC(chapterId) {
  // Hide all chapter TOCs
  document.querySelectorAll("aside.chapter-toc").forEach((el) => {
    el.style.display = "none";
  });

  // Show the TOC for this chapter
  const sel = `aside.chapter-toc[data-for-chapter="${chapterId}"]`;
  const toc = document.querySelector(sel);
  if (toc) toc.style.display = "";

  // Sync LHS active chapter link (safe even if IDs contain special chars)
  const left = document.getElementById("tocLeft");
  if (left) {
    left.querySelectorAll("a").forEach((a) => a.classList.remove("active"));

    // Use attribute selector rather than CSS.escape dependency
    const a = left.querySelector(`a[href="#${chapterId}"]`);
    if (a) a.classList.add("active");
  }
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

  // Detect which chapter you're in and show its TOC
 
function wireChapterDetection() {
  const chapters = Array.from(document.querySelectorAll("section.chapter[id]"));
  if (!chapters.length) return;

  // Initial TOC: first chapter, or hash chapter if present
  const initial =
    (location.hash && document.getElementById(location.hash.slice(1))?.closest("section.chapter[id]")) ||
    getCurrentChapterElement() ||
    chapters[0];

  showChapterTOC(initial.id);

  // Observe chapters to show correct RHS TOC
  const obs = new IntersectionObserver(
    (entries) => {
      // choose most visible intersecting chapter
      const best = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];

      if (!best) return;

      const ch = best.target;
      if (ch && ch.id) showChapterTOC(ch.id);
    },
    {
      root: null,
      rootMargin: `-${headerHeight() + 10}px 0px -60% 0px`,
      threshold: [0.05, 0.2, 0.35, 0.5],
    }
  );

  chapters.forEach((ch) => obs.observe(ch));
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
  wireChapterDetection();
  
  
  
  // If you’re still using this, it’s fine, but it should not be required for RHS TOC anymore
  wireLocalTOCActiveState();
	

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
