# Webflow Card Component Structure (Grid Section)

Use this structure for the **card component** in your grid section so you can:
- Adjust **image aspect ratio** per instance
- Swap **image/video** and **titles** per card
- Reuse your existing hover/scroll animations (`home_case_card`, `data-fade="case-card"`)

---

## 1. Component hierarchy (inside the component)

Build **one** Webflow component with this tree. Each line is a **div** (or the element type in parentheses). Indent = child of the row above.

```
Card Wrapper (Link Block) — class: home_case_card
├── Media wrapper — class: case_media_parallax
│   └── Image (or Video) — no fixed ratio here; ratio controlled by wrapper
└── Content wrapper — class: case_card_content (optional wrapper)
    ├── Title — class: case_text (first one = main title)
    └── Subtitle / Meta — class: case_text (optional, for stagger)
```

**Why this works with your JS:**
- `document.querySelectorAll(".home_case_card")` finds each card.
- `.case_media_parallax` is the element that gets `scale: 1.10` on hover when `data-scale-up` is set.
- `.case_text` elements get the character stagger when `data-text-in` is set.

---

## 2. Controlling image ratio in Webflow

**Option A – Component-level class (recommended)**  
On the **media wrapper** (`.case_media_parallax`):

1. Add a **combo class** per ratio, e.g.:
   - `case_media_parallax` + `ratio-4-3`  →  padding-bottom: 75%
   - `case_media_parallax` + `ratio-16-9` →  padding-bottom: 56.25%
   - `case_media_parallax` + `ratio-1-1`  →  padding-bottom: 100%
   - `case_media_parallax` + `ratio-3-4`  →  padding-bottom: 133.33%

2. Set the wrapper to **position: relative** and **overflow: hidden**; make the image **position: absolute**, full width/height, **object-fit: cover**.

Then on each **instance** of the component, add only the ratio combo class you want (e.g. `ratio-16-9`). No need to touch the image size directly.

**Option B – Symbol/component override**  
If your plan supports it, use a **component property** for “ratio” (e.g. dropdown: 1:1, 4:3, 16:9) and map it to the same combo classes above. Otherwise, Option A is enough.

---

## 3. Editable content per instance

- **Image/Video:** Put one **Image** or **Video** element inside `.case_media_parallax`. In Webflow, when you drop the component on a page, you can replace the image/video per instance.
- **Titles:** Use **Text Block** (or Heading) with class `case_text`. First = main title, second = optional subtitle. Edit these on each instance as usual.

So: **one component**, many instances; you only change **media**, **text**, and **ratio combo class** per instance.

---

## 4. Grid section structure

- **Section** (or container)  
  - **Grid** (CSS Grid or Flexbox)  
    - **Card component** (instance 1)  
    - **Card component** (instance 2)  
    - …

Use the same grid for all cards; no need to nest another grid inside the component. Keep the component as a single “card” unit.

---

## 5. Optional: keep your current animations

- Add **data-fade="case-card"** to the **Card Wrapper** (the link block with `home_case_card`) if you want the existing scroll fade.
- Add **data-scale-down**, **data-scale-up**, **data-text-in** on the same wrapper to enable the existing hover behavior (scale card, scale image, text chars in).

No JS changes required if you keep the classes and structure above.

---

## 6. Summary

| Goal                     | How in Webflow                                                                 |
|--------------------------|---------------------------------------------------------------------------------|
| Reusable card            | One component with `.home_case_card` → `.case_media_parallax` → image + `.case_text`(s). |
| Adjust ratio per card    | Combo class on `.case_media_parallax` (e.g. `ratio-4-3`, `ratio-16-9`).        |
| New media per card       | Replace Image/Video inside the component instance.                              |
| New titles per card      | Edit the `case_text` text elements on each instance.                          |
| Existing animations      | Same classes + data attributes on the wrapper; your `site.js` keeps working.   |

If you later add a different grid block (e.g. “Work” vs “Projects”), duplicate the component and optionally use a different wrapper class (e.g. `grid_project_card`) so you can target it separately in JS/CSS without breaking the home case cards.
