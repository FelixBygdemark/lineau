# Webflow Infinite Horizontal Slider — Structure

Recreates the Codegrid "infinite horizontal parallax slider" demo (see the standalone
project files: `index.html`, `styles.css`, `script.js`, `sliderData.js`) as static,
editable Webflow markup for the homepage section at `/home-infinite-slider`.

Scope: **slider only** — no nav, no footer. The site's existing nav is used as-is.

A backup tag (`backup-pre-webflow-slider`, commit `e75246f`) exists on `origin` as a
rollback point from before this work started.

---

## 1. Element hierarchy

Build this structure directly on the page (no component needed yet, since slide count
is fixed for now — see §4 if you want to make it a reusable component later):

```
Div Block          class: slider
└─ Div Block       class: slide-track
   ├─ Link Block   class: slide           (instance 1 of 8)
   │  ├─ Div Block    class: slide-image
   │  │  └─ Image        class: home-slider-image (alt text = slide title)
   │  └─ Div Block    class: slide-overlay
   │     └─ Text Block  class: project-title
   ├─ Link Block   class: slide           (instance 2 of 8)
   │  └─ ...same inner structure...
   └─ ... continue through slide 8
```

Start with **8 slides**. To add more later, duplicate one `.slide` Link Block and edit
its image/title/href — no component system required for this.

---

## 2. Per-element notes

- **`.slider`** — outer wrapper. `position: relative`, `overflow: hidden`, `width: 100vw`,
  `height: 100svh` (matches the original full-viewport demo; adjust height if the
  section isn't full-viewport on your site).
- **`.slide-track`** — `position: absolute`, `width: 100%`, `height: 100%`,
  `display: flex`. This is the element the JS will apply `translate3d(x, 0, 0)` to —
  don't add layout properties that would conflict with a `transform` (e.g. avoid
  `overflow` on this element itself).
- **`.slide`** (**Link Block**, not a plain Div Block) — set a real `href` per slide to
  that project's page. This replaces the JS-driven `window.location.href` navigation
  from the original demo. Needs the **full** property set, not just sizing:
  `height: 65svh` (responsive — tune to taste in the 65–70% range; `svh` rather than `%`
  so it's self-contained and doesn't depend on `.slide-track`'s height rule staying
  `100%`), `aspect-ratio: 350 / 500` (locks the card's proportions — **no separate
  `width`**, it's computed automatically from height × ratio), `margin: 0 20px`,
  `flex-shrink: 0`, `position: relative`, `top: 50%`, `transform: translateY(-50%)`
  (the vertical-centering trick for aligning slides within `.slide-track`),
  `overflow: visible`, `display: flex`, `flex-direction: column`, `cursor: pointer`. The
  `display: flex; flex-direction: column` here is what makes `.slide-image`'s `flex: 1`
  below actually do anything — without it, `.slide-image` has no flex container to grow
  inside. No JS changes needed for this — `measureSlideWidth()` in `site.js` already
  reads the slide's actual rendered width from the DOM rather than a hardcoded value,
  and `buildLoop()` re-measures on every `resize`.
- **`.slide-image`** — wraps the image. `width/height: 100%`, `overflow: hidden`,
  `flex: 1`, and **`position: relative`** (added in `site.css`, not the Designer — see
  §3) so the oversized image inside it can be centered via `position: absolute`.
- **Image** inside `.slide-image` — class **`home-slider-image`**. Must be a real
  Webflow **Image** element, not a background-image div — the JS finds it via
  `slide.querySelector("img")` and animates it directly every frame; a background-fill
  div wouldn't be matched, and the effect would silently do nothing (no error, it'd
  just never pan). Designer style: `height: 100%`, `object-fit: cover`,
  `will-change: transform`, `user-select: none` (the last one stops the image being
  drag-selected during the click-and-drag interaction). `site.css` (§3) overrides
  `width` to **`225%`** and adds `position: absolute; top: 0; left: 50%` — the image is
  deliberately wider than its container and centered, so the JS can pan it left/right
  via `translateX` with **no scale/zoom at all** (this replaced an earlier
  `transform: scale(2.25)` approach — panning a wider image reads as more natural
  movement than scaling, and doesn't zoom in on an axis that's never animated). 225% =
  125% wider than the slide, split evenly left/right, matching the pan range the old
  scale gave. One shared `home-slider-image` class works for all 8 slides — the class
  controls style, each instance's actual picture is set separately via the Assets
  panel. Only add a combo class if a specific image needs its own style override (e.g.
  a different `object-position` focal point).
- **`.slide-overlay`** — `position: absolute`, anchored to the bottom of the slide
  (`bottom: -1.75rem; left: 0; right: 0`), holds only the title now. **Always visible**
  (`opacity: 1`, overridden in `site.css` — see §3) — the title itself is hidden/revealed
  per character via GSAP `SplitText` on hover in `site.js`, not container opacity.
- **`.project-title`** (Text Block) — uppercase, `font-size: 0.8rem`, `font-weight: 500`.
  The arrow icon (`.project-arrow` in the original demo) is **intentionally dropped** —
  text-only overlay per current design direction.

---

## 3. CSS to bring over

Add to the site's custom CSS (or this section's embed) — this overrides Webflow's own
`.slide-overlay { opacity: 0; }` default so the container is always visible:

```css
.slide-overlay {
  opacity: 1;
}

/* Oversized + centered image for the pan-only parallax — no scale/zoom.
   225% width = 125% wider than the slide, split evenly left/right. */
.slide-image {
  position: relative;
}

.home-slider-image {
  position: absolute;
  top: 0;
  left: 50%;
  width: 225%;
}
```

The title reveal itself is **not** CSS-driven — `site.js` splits `.project-title` into
characters with GSAP `SplitText` per slide, hides them (`opacity: 0; y: 20`), and
animates them in/out on that slide's own `mouseenter`/`mouseleave`. This fires
immediately regardless of whether the slider is moving or idle (no gating on slider
state), and only runs on hover-capable devices (`matchMedia("(hover: hover)")`) — on
touch, the title just stays visible via `.slide-overlay`'s `opacity: 1` above, since
there's no hover to trigger the animation.

Also check:
- **`DM Mono` font** — the original demo loads it via a Google Fonts `@import`. Confirm
  whether the site already has a font loaded for this section, or add the same import.
- **Skip** porting the `.project-arrow` CSS rule from the original `styles.css` — it's
  dead weight now that the arrow markup is dropped.

---

## 4. Notes for the later "custom code" pass (not implemented yet)

These are flagged for when `script.js` gets adapted and wired in as custom code —
don't act on them while building the static structure:

- **Biggest change:** the original `initializeSlides()` wipes `.slide-track` and
  generates 6 loop-copies of each slide *from `sliderData.js`* via `createSlideElement()`.
  With slides now authored as static Webflow markup, that function needs to be rewritten
  to read the 8 existing DOM slides (`document.querySelectorAll(".slide-track .slide")`)
  and clone *those* for the loop copies, instead of building elements from a data array.
  `sliderData.js` and its `dataIndex`-based click navigation go away entirely.
- Since `.slide` is now a real anchor with its own `href`, the JS no longer drives
  navigation directly — but it still needs the original drag-vs-click disambiguation
  (`dragDistance` / `hasActuallyDragged` in `script.js`) adapted to call
  `e.preventDefault()` on the slide's click when a drag occurred, so dragging the
  slider doesn't accidentally follow the link.
- `script.js` currently uses a native ES module `import` from `sliderData.js` — moot
  once `sliderData.js` is removed, but if any module-style import remains, Webflow's
  custom code embed will need `<script type="module">` or a bundled/inlined file.
- Images are managed directly in Webflow per-slide, so there's no path/CDN re-hosting
  step needed for them — just confirm `object-fit: cover` on the (225%-wide, centered)
  image still reads well against whatever aspect ratios are used for the 8 images.

---

## 5. Summary

| Goal                        | How in Webflow                                                              |
|------------------------------|------------------------------------------------------------------------------|
| Reusable, duplicable slide  | `.slide` Link Block → `.slide-image` (image) + `.slide-overlay` → `.project-title`. |
| Add more slides later       | Duplicate a `.slide` block, swap image/title/href.                          |
| Slide → project page link   | Native Webflow `href` on the `.slide` Link Block (no JS navigation needed). |
| Hover title reveal          | `.slide-overlay` always visible (CSS); GSAP `SplitText` animates `.project-title` chars in/out per-slide on `mouseenter`/`mouseleave` in `site.js`, independent of slider movement, hover-only. |
| Parallax / infinite loop    | Wired in `public/js/site.js` (bottom, "HOME INFINITE SLIDER" block) — clones the 8 static slides into loop copies and drives drag/wheel physics + parallax. |
