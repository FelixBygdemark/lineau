// Ensure Webflow & DOM are ready
window.Webflow ||= [];
window.Webflow.push(() => {
  console.log("Custom JS loaded via Netlify.");
  document.body.classList.add("wf-custom");
});


gsap.registerPlugin(ScrollTrigger, SplitText);
gsap.registerPlugin(ScrambleTextPlugin);

// Initialize Lenis smooth scrolling
const lenis = new Lenis();

// Listen for the 'scroll' event and log the event data to the console
lenis.on('scroll', (e) => {
  console.log(e);
});

// Synchronize Lenis scrolling with GSAP's ScrollTrigger plugin
lenis.on('scroll', ScrollTrigger.update);

// Add Lenis's requestAnimationFrame (raf) method to GSAP's ticker
// This ensures Lenis's smooth scroll animation updates on each GSAP tick
gsap.ticker.add((time) => {
  lenis.raf(time * 1000); // Convert time from seconds to milliseconds
});

// Disable lag smoothing in GSAP to prevent any delay in scroll animations
gsap.ticker.lagSmoothing(0);



// ––––––––– Skew-on-velocity utility
const clamp = gsap.utils.clamp;

// Parse attribute formats:
// data-scroll-skew="y:10"  -> axis y, max 10deg
// data-scroll-skew="x:6"   -> axis x, max 6deg
// data-scroll-skew="8"     -> axis y (default), max 8deg
// data-scroll-skew=""      -> axis y, max 10deg (default)
function parseSkewAttr(el) {
  const raw = (el.getAttribute('data-scroll-skew') || '').trim();
  let axis = 'y';
  let maxDeg = 10;

  if (!raw) return { axis, maxDeg };

  if (raw.includes(':')) {
    const [a, v] = raw.split(':').map(s => s.trim());
    if (a === 'x' || a === 'y') axis = a;
    const n = parseFloat(v);
    if (!Number.isNaN(n)) maxDeg = n;
  } else {
    const n = parseFloat(raw);
    if (!Number.isNaN(n)) maxDeg = n;
  }
  return { axis, maxDeg };
}

// Create one ScrollTrigger per element
document.querySelectorAll('[data-scroll-skew]').forEach((el) => {
  const { axis, maxDeg } = parseSkewAttr(el);

  // Use a proxy object so we can animate back to 0
  const proxy = { skew: 0 };
  const setter = gsap.quickSetter(el, axis === 'x' ? 'skewX' : 'skewY', 'deg');

  // Optional: avoid stacking transforms from other code by initializing skew to 0
  gsap.set(el, { skewX: 0, skewY: 0 });

  ScrollTrigger.create({
    trigger: el,
    start: 'top bottom',   // start affecting when the element enters the viewport
    end: 'bottom top',     // stop affecting when it leaves
    onUpdate(self) {
      // Velocity is px/sec. Normalize a bit so the effect feels natural.
      // Tweak the divisor (e.g. 60–150) to taste.
      const v = self.getVelocity();
      const target = clamp(-maxDeg, maxDeg, (v / 800) ); // map velocity to degrees

      // Only "kick" if stronger than current (prevents tiny updates fighting ease-out)
      if (Math.abs(target) > Math.abs(proxy.skew)) {
        proxy.skew = target;
        setter(proxy.skew);

        // Smoothly ease back to 0
        gsap.to(proxy, {
          skew: 0,
          duration: 0.6,
          ease: 'power3.out',
          overwrite: true,
          onUpdate: () => setter(proxy.skew),
        });
      }
    },
    // If you want it active only while visible, keep the default toggleActions.
    // For pinned/long sections you could add scrub, but not needed here.
  });
});

// Refresh after images/fonts load (bounds change affect velocity timing)
window.addEventListener('load', () => ScrollTrigger.refresh());





// ––––––––– animate hero elements when case section enters GPT
// Select all three hero_title elements
const lines = document.querySelectorAll('.hero_title');

if (lines.length) {
  // Create GSAP timeline
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.case_wrap',
      start: 'top bottom',
      toggleActions: 'play reverse play reverse',
      markers: false
    }
  });

  // Loop through each line and add SplitText animation to timeline
  lines.forEach((el, index) => {
    const split = new SplitText(el, { type: 'chars' });

    tl.to(split.chars, {
      yPercent: 100,
      opacity: 1,
      stagger: 0.02,
      duration: 0.5,
      ease: 'power3.in'
    }, index * 0.05); // 🔧 delay between lines
  });
}



// ––––––––– Parallax using data-parallax
document.querySelectorAll('[data-parallax]').forEach(el => {
  const parallaxValue = parseFloat(el.getAttribute('data-parallax')) || 10;
  
  gsap.fromTo(el, { yPercent: -parallaxValue },
  {
    yPercent: parallaxValue,
    ease: "none",
    scrollTrigger: {
      trigger: el,
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });
});



// !!! Fade In from bottom
// Data-fade="case-card" – Fades in the object when scrolled into view, this is attacked to the link cards on the homepage for selected cases
document.querySelectorAll('[data-fade="case-card"]').forEach(el => {
  gsap.fromTo(el, { opacity: 0 },
  {
    opacity: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: el,
      start: 'top 90%', // when top hits bottom of viewport → start fading in
      end: 'top 35%', // when top hits top of viewport → fade out
      scrub: true,
      markers: false
    }
  });
});

//Case card hover GPT
document.querySelectorAll(".case_card").forEach((wrap) => {
  const imgClip = wrap.querySelector(".case_media_parallax");
  const textBlocks = wrap.querySelectorAll(".case_text");

  // Check if this card has the required data attributes
  const hasScaleDown = wrap.hasAttribute('data-scale-down');
  const hasScaleUp = imgClip && imgClip.hasAttribute('data-scale-up');
  const hasTextIn = wrap.hasAttribute('data-text-in');

  // Only proceed if at least one animation is enabled
  if (!hasScaleDown && !hasScaleUp && !hasTextIn) return;

  let splitTexts = [];
  
  // Only create SplitText if text animation is enabled
  if (hasTextIn && textBlocks.length) {
    splitTexts = Array.from(textBlocks).map(el => new SplitText(el, { type: "chars" }));

    // Immediately hide all split characters on page load
    splitTexts.forEach(split => {
      gsap.set(split.chars, {
        y: 20,
        opacity: 0
      });
    });
  }

  let enterTweens = [];
  let leaveTweens = [];

  wrap.addEventListener("mouseenter", () => {
    // Kill any leave tweens still running
    leaveTweens.forEach(t => t.kill());
    leaveTweens = [];

    // Scale down animation (if enabled)
    if (hasScaleDown) {
      enterTweens.push(
        gsap.to(wrap, {
          scale: 0.98,
          duration: 0.4,
          ease: "power3.out"
        })
      );
    }

    // Scale up animation (if enabled)
    if (hasScaleUp && imgClip) {
      enterTweens.push(
        gsap.to(imgClip, {
          scale: 1.10,
          duration: 1.4,
          ease: "power3.out"
        })
      );
    }

    // Text animation (if enabled)
    if (hasTextIn && splitTexts.length) {
      splitTexts.forEach((split, i) => {
        const tween = gsap.fromTo(split.chars, { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.03,
          delay: i * 0.15
        });
        enterTweens.push(tween);
      });
    }
  });

  wrap.addEventListener("mouseleave", () => {
    // Kill enter tweens so they don't conflict
    enterTweens.forEach(t => t.kill());
    enterTweens = [];

    // Scale down animation reset (if enabled)
    if (hasScaleDown) {
      leaveTweens.push(
        gsap.to(wrap, {
          scale: 1,
          duration: 0.5,
          ease: "power2.inOut"
        })
      );
    }

    // Scale up animation reset (if enabled)
    if (hasScaleUp && imgClip) {
      leaveTweens.push(
        gsap.to(imgClip, {
          scale: 1,
          duration: 0.7,
          ease: "power2.inOut"
        })
      );
    }

    // Text animation reset (if enabled)
    if (hasTextIn && splitTexts.length) {
      splitTexts.forEach((split, i) => {
        const tween = gsap.to(split.chars,
        {
          y: 20,
          opacity: 0,
          duration: 0.2,
          ease: "power4.out",
          stagger: 0.015,
          delay: i * 0.05
        });
        leaveTweens.push(tween);
      });
    }
  });
});



// Footer animation GPT

const tl = gsap.timeline({
  scrollTrigger: {
    trigger: ".case_contain",
    start: "bottom center",
    end: "bottom top",
    scrub: true
  }
});

tl.from(".footer_above_wrap", {
  yPercent: 0,
  scale: 0.9,
  opacity: 0,
  ease: "none"
}, 0); // start at 0

tl.from(".footer_below_wrap", {
  yPercent: 50,
  opacity: 0,
  ease: "none"
}, 0); // also start at 0 — plays at same time

// –––––––– NAV LINKS STAGGER ILJA

// Create a reference for all SplitText instances
let splitTextMap = new Map();

function setupSplits() {
  // Clear and revert previous
  splitTextMap.forEach(instance => instance.revert());
  splitTextMap.clear();

  document.querySelectorAll("[stagger-link]").forEach(link => {
    const textEl = link.querySelector("[stagger-link-text]");
    if (!textEl) return;

    const split = new SplitText(textEl, { type: "chars" });
    splitTextMap.set(link, split);
  });
}

// Initial split
setupSplits();

// Update on resize
let windowWidth = window.innerWidth;
window.addEventListener("resize", () => {
  if (window.innerWidth !== windowWidth) {
    windowWidth = window.innerWidth;
    setupSplits();
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  }
});

// Hover animations
document.querySelectorAll("[stagger-link]").forEach(link => {
  const split = splitTextMap.get(link);
  if (!split) return;

  link.addEventListener("mouseenter", () => {
    gsap.to(split.chars, {
      yPercent: -100,
      duration: 0.3,
      ease: "power4.inOut",
      stagger: 0.03,
      overwrite: true
    });
  });

  link.addEventListener("mouseleave", () => {
    gsap.to(split.chars, {
      yPercent: 0,
      duration: 0.2,
      ease: "power4.inOut",
      stagger: 0.02
    });
  });
});

// !!! Osmo new custom cursor
function initCursorMarqueeEffect() {
  const hoverOutDelay = 0.4;
  const followDuration = 0.8;
  const speedMultiplier = 5;

  const cursor = document.querySelector('[data-cursor-marquee-status]');
  if (!cursor) return;
  const targets = cursor.querySelectorAll('[data-cursor-marquee-text-target]');

  const xTo = gsap.quickTo(cursor, 'x', { duration: followDuration, ease: 'power3' });
  const yTo = gsap.quickTo(cursor, 'y', { duration: followDuration, ease: 'power3' });

  let pauseTimeout = null;
  let activeEl = null;
  let lastX = 0;
  let lastY = 0;

  function playFor(el) {
    if (!el) return;
    if (pauseTimeout) clearTimeout(pauseTimeout);
    const text = el.getAttribute('data-cursor-marquee-text') || '';
    const sec = (text.length || 1) / speedMultiplier;
    targets.forEach(t => {
      t.textContent = text;
      t.style.animationPlayState = 'running';
      t.style.animationDuration = sec + 's';
    });
    cursor.setAttribute('data-cursor-marquee-status', 'active');
    activeEl = el;
  }

  function pauseLater() {
    cursor.setAttribute('data-cursor-marquee-status', 'not-active');
    if (pauseTimeout) clearTimeout(pauseTimeout);
    pauseTimeout = setTimeout(() => {
      targets.forEach(t => {
        t.style.animationPlayState = 'paused';
      });
    }, hoverOutDelay * 1000);
    activeEl = null;
  }

  function checkTarget() {
    const el = document.elementFromPoint(lastX, lastY);
    const hit = el && el.closest('[data-cursor-marquee-text]');
    if (hit !== activeEl) {
      if (activeEl) pauseLater();
      if (hit) playFor(hit);
    }
  }

  window.addEventListener('pointermove', e => {
    lastX = e.clientX;
    lastY = e.clientY;
    xTo(lastX);
    yTo(lastY);
    checkTarget();
  }, { passive: true });

  window.addEventListener('scroll', () => {
    xTo(lastX);
    yTo(lastY);
    checkTarget();
  }, { passive: true });

  setTimeout(() => {
    cursor.setAttribute('data-cursor-marquee-status', 'not-active');
  }, 500);
}

// Initialize Cursor with Marquee Effect
document.addEventListener('DOMContentLoaded', function() {
  initCursorMarqueeEffect();
});


// !!! Bend SVG mask on scroll – used for case section on homepage
  // Elements with [data-bend] will get a velocity-reactive mask bend.
  // Optional attributes:
  // - data-bend="24"            → max amplitude in px (default 24)
  // - data-bend-mode="elastic"  → "elastic" | "ribbon" | "smile"
  // - data-bend-target=".inner" → optional selector inside element to mask
  let bendUid = 0;

  function curvedRectPath(width, height, bendTop = 0, bendBottom = 0) {
    const t = bendTop;
    const b = bendBottom;
    return [
      `M0,0`,
      `C${(width*0.33).toFixed(2)},${t.toFixed(2)} ${(width*0.66).toFixed(2)},${t.toFixed(2)} ${width.toFixed(2)},0`,
      `L${width.toFixed(2)},${height.toFixed(2)}`,
      `C${(width*0.66).toFixed(2)},${(height+b).toFixed(2)} ${(width*0.33).toFixed(2)},${(height+b).toFixed(2)} 0,${height.toFixed(2)}`,
      `Z`
    ].join(" ");
  }

  function initBendFor(el) {
    const maxAmp = parseFloat(el.getAttribute('data-bend')) || 24;
    const mode = (el.getAttribute('data-bend-mode') || 'elastic').toLowerCase();
    const targetSel = el.getAttribute('data-bend-target');
    const target = targetSel ? el.querySelector(targetSel) : el;
    if (!target) return;

    const id = `bend-mask-${++bendUid}`;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');

    const defs = document.createElementNS(svgNS, 'defs');
    const mask = document.createElementNS(svgNS, 'mask');
    mask.setAttribute('id', id);
    mask.setAttribute('maskUnits', 'userSpaceOnUse');
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('fill', 'white');
    mask.appendChild(path);
    defs.appendChild(mask);
    svg.appendChild(defs);
    target.appendChild(svg); // keep mask close to target

    // apply mask to target
    target.style.mask = `url(#${id})`;
    target.style.webkitMask = `url(#${id})`;

    const state = { top: 0, bottom: 0 };
    const updatePath = () => {
      const w = target.offsetWidth || 1;
      const h = target.offsetHeight || 1;
      path.setAttribute('d', curvedRectPath(w, h, state.top, state.bottom));
    };

    // responsive updates
    const ro = new ResizeObserver(updatePath);
    ro.observe(target);
    updatePath();

    ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate(self) {
        const velocity = self.getVelocity(); // px/sec
        const amp = clamp(-maxAmp, maxAmp, velocity / 120); // lower divisor → stronger

        if (mode === 'ribbon') {
          state.top = amp; state.bottom = amp;
        } else if (mode === 'smile') {
          state.top = 0;   state.bottom = amp;
        } else { // elastic
          state.top = amp; state.bottom = -amp;
        }

        updatePath();

        // ease back to flat
        gsap.to(state, {
          top: 0,
          bottom: 0,
          duration: 0.6,
          ease: 'power3.out',
          overwrite: true,
          onUpdate: updatePath
        });
      }
    });
  }

  document.querySelectorAll('[data-bend]').forEach(initBendFor);
