# Hero chapter titles (stacked, scroll-synced)

Stack titles inside your **fixed hero/header** so that as you scroll through case chapters, the hero title crossfades to match the current chapter. Titles are tied to chapters via **data attributes** and animated with **scrubbing ScrollTrigger**.

---

## 1. Where to place the titles

- **Best place:** Inside your fixed hero section, inside the same container that holds your main `hero_title` (e.g. **hero_content_contain**). That keeps the stacked titles aligned with the hero layout and over the same area as the initial title.

- Add **one wrapper** and **one title element per chapter**:

  - **Wrapper:** A div (or the same block that already wraps the hero title) with `data-hero-titles`. This is the stacking context: all chapter titles sit in the same spot.
  - **Titles:** Inside it, one heading or text block per chapter, each with `data-hero-chapter-title` and `data-chapter-index="1"`, `"2"`, etc.

- Your existing **hero_title** can stay as-is for the **page load animation** (timed animation into position). The script only controls the elements with `[data-hero-chapter-title]`; it does not touch `hero_title`. So you can either:
  - Keep `hero_title` as the initial headline and have the first chapter title appear when the first chapter scrolls in, or
  - Hide or replace `hero_title` after the load animation and use the first chapter title as the first visible title in the stack.

---

## 2. HTML / Webflow structure

```text
Hero (fixed) — e.g. .hero_section or similar
└── hero_content_contain (or your hero content wrapper)
    ├── hero_title (existing; your timed load animation)
    └── [data-hero-titles]   ← wrapper for stacked chapter titles
        ├── [data-hero-chapter-title][data-chapter-index="1"]  ← "Chapter 1 title"
        ├── [data-hero-chapter-title][data-chapter-index="2"]  ← "Chapter 2 title"
        └── [data-hero-chapter-title][data-chapter-index="3"]  ← …
```

In Webflow:

1. Add a **Div Block** inside **hero_content_contain** (or wherever the hero title lives).
2. Add the attribute **data-hero-titles** to that div (Custom attributes in the element settings).
3. Inside that div, add one **Heading** or **Text Block** per case chapter.
4. On each heading:
   - **data-hero-chapter-title** (add custom attribute)
   - **data-chapter-index** = `1`, `2`, `3`, … (same index as the corresponding chapter).

---

## 3. Chapter sections in the page

Each “chapter” (the block that, when scrolled into view, triggers a title change) must be marked so the script can match it to a title:

- Wrap each chapter block (e.g. each case card or each section that should drive a title) in a div (or use the section itself).
- On that wrapper add:
  - **data-case-chapter**
  - **data-chapter-index** = `1`, `2`, `3`, … (must match the hero title indices).

Order in the DOM should match the scroll order (chapter 1, then 2, then 3…). The script sorts by `data-chapter-index`, so the order of elements in the DOM can be explicit via index.

---

## 4. CSS (already in `site.css`)

- **[data-hero-titles]**  
  `position: relative`, `min-height: 1em` so the stack has a defined area. Adjust `min-height` or add padding so the stack matches the height of your `hero_title` area.

- **[data-hero-chapter-title]**  
  `position: absolute`, `top: 0`, `left: 0`, `width: 100%`, `opacity: 0`, and a small `transform: translateY(0.5em)`. Opacity and transform are overridden by GSAP (scrubbed). The class **is-active** is toggled when a title is visible (opacity &gt; 0.5) if you need extra styling.

You can add combo classes in Webflow for typography; keep the data attributes so the JS still finds the elements.

---

## 5. Behaviour summary

| Step | What happens |
|------|-------------------------------|
| Page load | Your existing hero_title plays its timed animation. All `[data-hero-chapter-title]` start hidden (opacity 0, slightly below). |
| First chapter scrolls in | When the first `[data-case-chapter]` reaches the trigger line (35% from top), the first hero chapter title animates in (opacity 1, y 0). |
| Next chapter scrolls in | As the next chapter reaches the trigger line, the previous title animates out (opacity 0, y -24px) and the next title animates in (opacity 1, y 24→0). |
| Scrubbing | The transition is tied to scroll: scrolling back up reverses the crossfade. |

Trigger line: a chapter is “active” when its **top** crosses **35% from the top** of the viewport. You can change this in `site.js` by editing the `activeLine` value (e.g. `vh() * 0.35` → `vh() * 0.5` for center).

---

## 6. Syncing title and chapter

The link between a title and a chapter is **only** the **data-chapter-index**:

- Same index = same “chapter”: e.g. `data-chapter-index="2"` on a hero title and `data-chapter-index="2"` on a case chapter means “when chapter 2 is in view, show title 2”.
- Count of titles and chapters can differ; the script uses the minimum count and warns in the console if the counts don’t match.

No extra IDs or classes are required; the data attributes are the single source of truth.
