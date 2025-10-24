// Ensure Webflow & DOM are ready
window.Webflow ||= [];
window.Webflow.push(() => {
  console.log("Custom JS loaded via Netlify.");
  document.body.classList.add("wf-custom");
});


gsap.registerPlugin(ScrollTrigger, SplitText);
gsap.registerPlugin(ScrambleTextPlugin);
gsap.registerPlugin(DrawSVGPlugin);
gsap.registerPlugin(InertiaPlugin);

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


// OSMO footer reveal on scroll

// Footer Parallax Effect
function initFooterParallax(){
  document.querySelectorAll('[data-footer-parallax]').forEach(el => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: 'clamp(top bottom)',
        end: 'clamp(top top)',
        scrub: true
      }
    });
  
    const inner = el.querySelector('[data-footer-parallax-inner]');
    const dark  = el.querySelector('[data-footer-parallax-dark]');
  
    if (inner) {
      tl.from(inner, {
        yPercent: -25,
        ease: 'linear'
      });
    }
  
    if (dark) {
      tl.from(dark, {
        opacity: 0.5,
        ease: 'linear'
      }, '<');
    }
  });
}

// Initialize Footer with Parallax Effect
document.addEventListener('DOMContentLoaded', () => {
  initFooterParallax();
});

// !! OSMO DRAW SVG LINKS

function initDrawRandomUnderline() {

  const svgVariants = [
    `<svg width="310" height="40" viewBox="0 0 310 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 20.9999C26.7762 16.2245 49.5532 11.5572 71.7979 14.6666C84.9553 16.5057 97.0392 21.8432 109.987 24.3888C116.413 25.6523 123.012 25.5143 129.042 22.6388C135.981 19.3303 142.586 15.1422 150.092 13.3333C156.799 11.7168 161.702 14.6225 167.887 16.8333C181.562 21.7212 194.975 22.6234 209.252 21.3888C224.678 20.0548 239.912 17.991 255.42 18.3055C272.027 18.6422 288.409 18.867 305 17.9999" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`,
    `<svg width="310" height="40" viewBox="0 0 310 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 24.2592C26.233 20.2879 47.7083 16.9968 69.135 13.8421C98.0469 9.5853 128.407 4.02322 158.059 5.14674C172.583 5.69708 187.686 8.66104 201.598 11.9696C207.232 13.3093 215.437 14.9471 220.137 18.3619C224.401 21.4596 220.737 25.6575 217.184 27.6168C208.309 32.5097 197.199 34.281 186.698 34.8486C183.159 35.0399 147.197 36.2657 155.105 26.5837C158.11 22.9053 162.993 20.6229 167.764 18.7924C178.386 14.7164 190.115 12.1115 201.624 10.3984C218.367 7.90626 235.528 7.06127 252.521 7.49276C258.455 7.64343 264.389 7.92791 270.295 8.41825C280.321 9.25056 296 10.8932 305 13.0242" stroke="#E55050" stroke-width="1" stroke-linecap="round"/></svg>`,
    `<svg width="310" height="40" viewBox="0 0 310 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 29.5014C9.61174 24.4515 12.9521 17.9873 20.9532 17.5292C23.7742 17.3676 27.0987 17.7897 29.6575 19.0014C33.2644 20.7093 35.6481 24.0004 39.4178 25.5014C48.3911 29.0744 55.7503 25.7731 63.3048 21.0292C67.9902 18.0869 73.7668 16.1366 79.3721 17.8903C85.1682 19.7036 88.2173 26.2464 94.4121 27.2514C102.584 28.5771 107.023 25.5064 113.276 20.6125C119.927 15.4067 128.83 12.3333 137.249 15.0014C141.418 16.3225 143.116 18.7528 146.581 21.0014C149.621 22.9736 152.78 23.6197 156.284 24.2514C165.142 25.8479 172.315 17.5185 179.144 13.5014C184.459 10.3746 191.785 8.74853 195.868 14.5292C199.252 19.3205 205.597 22.9057 211.621 22.5014C215.553 22.2374 220.183 17.8356 222.979 15.5569C225.4 13.5845 227.457 11.1105 230.742 10.5292C232.718 10.1794 234.784 12.9691 236.164 14.0014C238.543 15.7801 240.717 18.4775 243.356 19.8903C249.488 23.1729 255.706 21.2551 261.079 18.0014C266.571 14.6754 270.439 11.5202 277.146 13.6125C280.725 14.7289 283.221 17.209 286.393 19.0014C292.321 22.3517 298.255 22.5014 305 22.5014" stroke="#E55050" stroke-width="1" stroke-linecap="round"/></svg>`,
    `<svg width="310" height="40" viewBox="0 0 310 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.0039 32.6826C32.2307 32.8412 47.4552 32.8277 62.676 32.8118C67.3044 32.807 96.546 33.0555 104.728 32.0775C113.615 31.0152 104.516 28.3028 102.022 27.2826C89.9573 22.3465 77.3751 19.0254 65.0451 15.0552C57.8987 12.7542 37.2813 8.49399 44.2314 6.10216C50.9667 3.78422 64.2873 5.81914 70.4249 5.96641C105.866 6.81677 141.306 7.58809 176.75 8.59886C217.874 9.77162 258.906 11.0553 300 14.4892" stroke="#E55050" stroke-width="1" stroke-linecap="round"/></svg>`,
    `<svg width="310" height="40" viewBox="0 0 310 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.99805 20.9998C65.6267 17.4649 126.268 13.845 187.208 12.8887C226.483 12.2723 265.751 13.2796 304.998 13.9998" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`,
    `<svg width="310" height="40" viewBox="0 0 310 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 29.8857C52.3147 26.9322 99.4329 21.6611 146.503 17.1765C151.753 16.6763 157.115 15.9505 162.415 15.6551C163.28 15.6069 165.074 15.4123 164.383 16.4275C161.704 20.3627 157.134 23.7551 153.95 27.4983C153.209 28.3702 148.194 33.4751 150.669 34.6605C153.638 36.0819 163.621 32.6063 165.039 32.2029C178.55 28.3608 191.49 23.5968 204.869 19.5404C231.903 11.3436 259.347 5.83254 288.793 5.12258C294.094 4.99476 299.722 4.82265 305 5.45025" stroke="#E55050" stroke-width="1" stroke-linecap="round"/></svg>`
  ];

  // Add attributes to <svg> elements
  function decorateSVG(svgEl) {
    svgEl.setAttribute('class', 'text-draw__box-svg');
    svgEl.setAttribute('preserveAspectRatio', 'none');
    svgEl.querySelectorAll('path').forEach(path => {
      path.setAttribute('stroke', 'currentColor');
    });
  }

  let nextIndex = null;

  document.querySelectorAll('[data-draw-line]').forEach(container => {
    const box = container.querySelector('[data-draw-line-box]');
    if (!box) return;

    let enterTween = null;
    let leaveTween = null;

    container.addEventListener('mouseenter', () => {
      // Don't restart if still playing
      if (enterTween && enterTween.isActive()) return;
      if (leaveTween && leaveTween.isActive()) leaveTween.kill();

      // Random Start
      if (nextIndex === null) {
        nextIndex = Math.floor(Math.random() * svgVariants.length);
      }

      // Animate Draw
      box.innerHTML = svgVariants[nextIndex];
      const svg = box.querySelector('svg');
      if (svg) {
        decorateSVG(svg);
        const path = svg.querySelector('path');
        if (path) {
          gsap.set(path, { drawSVG: '0%' });
          enterTween = gsap.to(path, {
            duration: 0.5,
            drawSVG: '100%',
            ease: 'power2.inOut',
            onComplete: () => { enterTween = null; }
          });
        }
      }

      // Advance for next hover across all items
      nextIndex = (nextIndex + 1) % svgVariants.length;
    });

    container.addEventListener('mouseleave', () => {
      const path = box.querySelector('path');
      if (!path) return;

      const playOut = () => {
        // Don't restart if still drawing out
        if (leaveTween && leaveTween.isActive()) return;
        leaveTween = gsap.to(path, {
          duration: 0.5,
          drawSVG: '100% 100%',
          ease: 'power2.inOut',
          onComplete: () => {
            leaveTween = null;
            box.innerHTML = ''; // remove SVG when done
          }
        });
      };

      if (enterTween && enterTween.isActive()) {
        // Wait until draw-in finishes
        enterTween.eventCallback('onComplete', playOut);
      } else {
        playOut();
      }
    });
  });
}

// Initialize Draw Random Underline
document.addEventListener('DOMContentLoaded', function() {
  initDrawRandomUnderline();
});


// Move letters in footer

function initMomentumBasedHover() {

  // If this device can’t hover with a fine pointer, stop here
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {return;}
  
  // Configuration (tweak these for feel)
  const xyMultiplier       = 30;  // multiplies pointer velocity for x/y movement
  const rotationMultiplier = 20;  // multiplies normalized torque for rotation speed
  const inertiaResistance  = 200; // higher = stops sooner

  // Pre-build clamp functions for performance
  const clampXY  = gsap.utils.clamp(-1080, 1080);
  const clampRot = gsap.utils.clamp(-60, 60);

  // Initialize each root container
  document.querySelectorAll('[data-momentum-hover-init]').forEach(root => {
    let prevX = 0, prevY = 0;
    let velX  = 0, velY  = 0;
    let rafId = null;

    // Track pointer velocity (throttled to RAF)
    root.addEventListener('mousemove', e => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        velX = e.clientX - prevX;
        velY = e.clientY - prevY;
        prevX = e.clientX;
        prevY = e.clientY;
        rafId = null;
      });
    });

    // Attach hover inertia to each child element
    root.querySelectorAll('[data-momentum-hover-element]').forEach(el => {
      el.addEventListener('mouseenter', e => {
        const target = el.querySelector('[data-momentum-hover-target]');
        if (!target) return;

        // Compute offset from center to pointer
        const { left, top, width, height } = target.getBoundingClientRect();
        const centerX = left + width / 2;
        const centerY = top + height / 2;
        const offsetX = e.clientX - centerX;
        const offsetY = e.clientY - centerY;

        // Compute raw torque (px²/frame)
        const rawTorque = offsetX * velY - offsetY * velX;

        // Normalize torque so rotation ∝ pointer speed (deg/sec)
        const leverDist    = Math.hypot(offsetX, offsetY) || 1;
        const angularForce = rawTorque / leverDist;

        // Calculate and clamp velocities
        const velocityX        = clampXY(velX * xyMultiplier);
        const velocityY        = clampXY(velY * xyMultiplier);
        const rotationVelocity = clampRot(angularForce * rotationMultiplier);

        // Apply GSAP inertia tween
        gsap.to(target, {
          inertia: {
            x:        { velocity: velocityX,        end: 0 },
            y:        { velocity: velocityY,        end: 0 },
            rotation: { velocity: rotationVelocity, end: 0 },
            resistance: inertiaResistance
          }
        });
      });
    });
  });
}

// Initialize Momentum Based Hover (Inertia)
document.addEventListener("DOMContentLoaded", () => {
  initMomentumBasedHover();
});