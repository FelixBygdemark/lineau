// Scroll-to-top on load/refresh is handled by Webflow custom code (see webflow-scroll-to-top.html)

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

// Start with scroll at top and scrolling stopped (for preloader / first 5s)
lenis.scrollTo(0, { immediate: true });
lenis.stop();

// Re-enable scrolling after 5 seconds
setTimeout(function () {
  lenis.start();
}, 5000);

window.addEventListener('pageshow', function () {
  lenis.scrollTo(0, { immediate: true });
});

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



// LINEAU SKEW ON SCROLL (Project cards)
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
window.addEventListener('load', () => {
  lenis.scrollTo(0, { immediate: true });
  ScrollTrigger.refresh();
});





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



//Case card hover GPT
document.querySelectorAll(".home_case_card").forEach((wrap) => {
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

// OSMO new custom cursor
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



// Magnetic button

function initMagneticEffect() {
  const magnets = document.querySelectorAll('[data-magnetic-strength]');
  if (window.innerWidth <= 991) return;
  
  // Helper to kill tweens and reset an element.
  const resetEl = (el, immediate) => {
    if (!el) return;
    gsap.killTweensOf(el);
    (immediate ? gsap.set : gsap.to)(el, {
      x: "0em",
      y: "0em",
      rotate: "0deg",
      clearProps: "all",
      ...(!immediate && { ease: "elastic.out(1, 0.3)", duration: 1.6 })
    });
  };

  const resetOnEnter = e => {
    const m = e.currentTarget;
    resetEl(m, true);
    resetEl(m.querySelector('[data-magnetic-inner-target]'), true);
  };

  const moveMagnet = e => {
    const m = e.currentTarget,
      b = m.getBoundingClientRect(),
      strength = parseFloat(m.getAttribute('data-magnetic-strength')) || 25,
      inner = m.querySelector('[data-magnetic-inner-target]'),
      innerStrength = parseFloat(m.getAttribute('data-magnetic-strength-inner')) || strength,
      offsetX = ((e.clientX - b.left) / m.offsetWidth - 0.5) * (strength / 16),
      offsetY = ((e.clientY - b.top) / m.offsetHeight - 0.5) * (strength / 16);
    
    gsap.to(m, { x: offsetX + "em", y: offsetY + "em", rotate: "0.001deg", ease: "power4.out", duration: 1.6 });
    
    if (inner) {
      const innerOffsetX = ((e.clientX - b.left) / m.offsetWidth - 0.5) * (innerStrength / 16),
        innerOffsetY = ((e.clientY - b.top) / m.offsetHeight - 0.5) * (innerStrength / 16);
      gsap.to(inner, { x: innerOffsetX + "em", y: innerOffsetY + "em", rotate: "0.001deg", ease: "power4.out", duration: 2 });
    }
  };

  const resetMagnet = e => {
    const m = e.currentTarget,
      inner = m.querySelector('[data-magnetic-inner-target]');
    gsap.to(m, { x: "0em", y: "0em", ease: "elastic.out(1, 0.3)", duration: 1.6, clearProps: "all" });
    if (inner) {
      gsap.to(inner, { x: "0em", y: "0em", ease: "elastic.out(1, 0.3)", duration: 2, clearProps: "all" });
    }
  };

  magnets.forEach(m => {
    m.addEventListener('mouseenter', resetOnEnter);
    m.addEventListener('mousemove', moveMagnet);
    m.addEventListener('mouseleave', resetMagnet);
  });
}

// Initialize Magnetic Effect
document.addEventListener('DOMContentLoaded', () => {
  initMagneticEffect();
});

// Bunny player background
function initBunnyPlayerBackground() {

  document.querySelectorAll('[data-bunny-background-init]').forEach(function(player) {

    var src = player.getAttribute('data-player-src');

    if (!src) return;



    var video = player.querySelector('video');

    if (!video) return;



    try { video.pause(); } catch(_) {}

    try { video.removeAttribute('src'); video.load(); } catch(_) {}



    // Attribute helpers

    function setStatus(s) {

      if (player.getAttribute('data-player-status') !== s) {

        player.setAttribute('data-player-status', s);

      }

    }

    function setActivated(v) { player.setAttribute('data-player-activated', v ? 'true' : 'false'); }

    if (!player.hasAttribute('data-player-activated')) setActivated(false);



    // Flags

    var lazyMode   = player.getAttribute('data-player-lazy'); // "true" | "false" (no meta)

    var isLazyTrue = lazyMode === 'true';

    var autoplay   = player.getAttribute('data-player-autoplay') === 'true';

    var initialMuted = player.getAttribute('data-player-muted') === 'true';



    // Used to suppress 'ready' flicker when user just pressed play in lazy modes

    var pendingPlay = false;



    // Autoplay forces muted + loop; IO will drive play/pause

    if (autoplay) { video.muted = true; video.loop = true; }

    else { video.muted = initialMuted; }



    video.setAttribute('muted', '');

    video.setAttribute('playsinline', '');

    video.setAttribute('webkit-playsinline', '');

    video.playsInline = true;

    if (typeof video.disableRemotePlayback !== 'undefined') video.disableRemotePlayback = true;

    if (autoplay) video.autoplay = false;



    var isSafariNative = !!video.canPlayType('application/vnd.apple.mpegurl');

    var canUseHlsJs    = !!(window.Hls && Hls.isSupported()) && !isSafariNative;



    // Attach media only once (for actual playback)

    var isAttached = false;

    var userInteracted = false;

    var lastPauseBy = ''; // 'io' | 'manual' | ''

    function attachMediaOnce() {

      if (isAttached) return;

      isAttached = true;



      if (player._hls) { try { player._hls.destroy(); } catch(_) {} player._hls = null; }



      if (isSafariNative) {

        video.preload = isLazyTrue ? 'none' : 'auto';

        video.src = src;

        video.addEventListener('loadedmetadata', function() {

          readyIfIdle(player, pendingPlay);

        }, { once: true });

      } else if (canUseHlsJs) {

        var hls = new Hls({ maxBufferLength: 10 });

        hls.attachMedia(video);

        hls.on(Hls.Events.MEDIA_ATTACHED, function() { hls.loadSource(src); });

        hls.on(Hls.Events.MANIFEST_PARSED, function() {

          readyIfIdle(player, pendingPlay);

        });

        player._hls = hls;

      } else {

        video.src = src;

      }

    }



    // Initialize based on lazy mode

    if (isLazyTrue) {

      video.preload = 'none';

    } else {

      attachMediaOnce();

    }



    // Toggle play/pause

    function togglePlay() {

      userInteracted = true;

      if (video.paused || video.ended) {

        if (isLazyTrue && !isAttached) attachMediaOnce();

        pendingPlay = true;

        lastPauseBy = '';

        setStatus('loading');

        safePlay(video);

      } else {

        lastPauseBy = 'manual';

        video.pause();

      }

    }



    // Toggle mute

    function toggleMute() {

      video.muted = !video.muted;

      player.setAttribute('data-player-muted', video.muted ? 'true' : 'false');

    }



    // Controls (delegated)

    player.addEventListener('click', function(e) {

      var btn = e.target.closest('[data-player-control]');

      if (!btn || !player.contains(btn)) return;

      var type = btn.getAttribute('data-player-control');

      if (type === 'play' || type === 'pause' || type === 'playpause') togglePlay();

      else if (type === 'mute') toggleMute();

    });



    // Media event wiring

    video.addEventListener('play', function() { setActivated(true); setStatus('playing'); });

    video.addEventListener('playing', function() { pendingPlay = false; setStatus('playing'); });

    video.addEventListener('pause', function() { pendingPlay = false; setStatus('paused'); });

    video.addEventListener('waiting', function() { setStatus('loading'); });

    video.addEventListener('canplay', function() { readyIfIdle(player, pendingPlay); });

    video.addEventListener('ended', function() { pendingPlay = false; setStatus('paused'); setActivated(false); });



    // In-view auto play/pause (only when autoplay is true)

    if (autoplay) {

      if (player._io) { try { player._io.disconnect(); } catch(_) {} }

      var io = new IntersectionObserver(function(entries) {

        entries.forEach(function(entry) {

          var inView = entry.isIntersecting && entry.intersectionRatio > 0;

          if (inView) {

            if (isLazyTrue && !isAttached) attachMediaOnce();

            if ((lastPauseBy === 'io') || (video.paused && lastPauseBy !== 'manual')) {

              setStatus('loading');

              if (video.paused) togglePlay();

              lastPauseBy = '';

            }

          } else {

            if (!video.paused && !video.ended) {

              lastPauseBy = 'io';

              video.pause();

            }

          }

        });

      }, { threshold: 0.1 });

      io.observe(player);

      player._io = io;

    }

  });



  // Helper: Ready status guard

  function readyIfIdle(player, pendingPlay) {

    if (!pendingPlay &&

        player.getAttribute('data-player-activated') !== 'true' &&

        player.getAttribute('data-player-status') === 'idle') {

      player.setAttribute('data-player-status', 'ready');

    }

  }



  // Helper: safe programmatic play

  function safePlay(video) {

    var p = video.play();

    if (p && typeof p.then === 'function') p.catch(function(){});

  }

}



// Initialize Bunny HTML HLS Player (Background)

document.addEventListener('DOMContentLoaded', function() {

  initBunnyPlayerBackground();

});





//nav text-link stagger
function initNavCharStagger() {
  const links = document.querySelectorAll('[data-nav-stagger]');

  links.forEach(link => {
    if (link.dataset.splitInit) return;
    link.dataset.splitInit = 'true';

    const split = new SplitText(link, {
      type: 'chars',
      charsClass: 'char'
    });

    // Reset initial position
    gsap.set(split.chars, {
      yPercent: 0
    });

    link.addEventListener('mouseenter', () => {
      gsap.to(split.chars, {
        yPercent: -100,
        duration: 0.6,
        ease: 'power4.out',
        stagger: {
          each: 0.01
        }
      });
    });

    link.addEventListener('mouseleave', () => {
      gsap.to(split.chars, {
        yPercent: 0,
        duration: 0.4,
        ease: 'power4.inOut',
        stagger: {
          each: 0.01
        }
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', initNavCharStagger);



// OSMO Marquee Scroll Direction

function initCSSMarquee() {
  const pixelsPerSecond = 75; // Set the marquee speed (pixels per second)
  const defaultDuration = 30; // fallback when width is 0 (e.g. before layout)
  const marquees = document.querySelectorAll('[data-css-marquee]');

  function setMarqueeDuration(list) {
    const w = list.offsetWidth;
    const duration = w > 0 ? w / pixelsPerSecond : defaultDuration;
    list.style.animationDuration = duration + 's';
    return w > 0;
  }

  // Duplicate each [data-css-marquee-list] only once (idempotent)
  marquees.forEach(marquee => {
    if (marquee.hasAttribute('data-css-marquee-inited')) return;
    marquee.setAttribute('data-css-marquee-inited', '');
    marquee.querySelectorAll('[data-css-marquee-list]').forEach(list => {
      const duplicate = list.cloneNode(true);
      marquee.appendChild(duplicate);
    });
  });

  // Create an IntersectionObserver to pause when out of view and recalc duration when in view
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const lists = entry.target.querySelectorAll('[data-css-marquee-list]');
      lists.forEach(list => {
        if (entry.isIntersecting) {
          // Recalc duration when entering view (fixes 0 width when measured before layout)
          setMarqueeDuration(list);
          list.style.animationPlayState = 'running';
        } else {
          list.style.animationPlayState = 'paused';
        }
      });
    });
  }, { threshold: 0 });

  // Measure after layout is ready (Webflow/GSAP may affect layout after DOMContentLoaded)
  function measureAndObserve() {
    marquees.forEach(marquee => {
      marquee.querySelectorAll('[data-css-marquee-list]').forEach(list => {
        setMarqueeDuration(list);
        list.style.animationPlayState = 'paused';
      });
      observer.observe(marquee);
    });
  }

  // Run after paint so offsetWidth is correct (handles parent overflow/layout)
  requestAnimationFrame(() => {
    requestAnimationFrame(measureAndObserve);
  });
}

// Initialize CSS Marquee (after DOM and optionally after Webflow)
function runCSSMarquee() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runCSSMarquee);
    return;
  }
  initCSSMarquee();
}
runCSSMarquee();
// Also run when Webflow is ready (in case marquee is injected or laid out later)
window.Webflow = window.Webflow || [];
window.Webflow.push(initCSSMarquee);


// OSMO Flip section on home
gsap.registerPlugin(ScrollTrigger, Flip);

function initFlipOnScroll() {
  let wrapperElements = document.querySelectorAll("[data-flip-element='wrapper']");
  let targetEl = document.querySelector("[data-flip-element='target']");

  let tl;
  function flipTimeline() {
    if (tl) {
      tl.kill();
      gsap.set(targetEl, { clearProps: "all" });
    }
    
    // Use the first and last wrapper elements for the scroll trigger.
    tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapperElements[0],
        start: "center center",
        endTrigger: wrapperElements[wrapperElements.length - 1],
        end: "center center",
        scrub: 0.25
      }
    });
    
    // Loop through each wrapper element.
    wrapperElements.forEach(function(element, index) {
      let nextIndex = index + 1;
      if (nextIndex < wrapperElements.length) {
        let nextWrapperEl = wrapperElements[nextIndex];
        // Calculate vertical center positions relative to the document.
        let nextRect = nextWrapperEl.getBoundingClientRect();
        let thisRect = element.getBoundingClientRect();
        let nextDistance = nextRect.top + window.pageYOffset + nextWrapperEl.offsetHeight / 2;
        let thisDistance = thisRect.top + window.pageYOffset + element.offsetHeight / 2;
        let offset = nextDistance - thisDistance;
        // Add the Flip.fit tween to the timeline.
        tl.add(
          Flip.fit(targetEl, nextWrapperEl, {
            duration: offset,
            ease: "none"
          })
        );
      }
    });
  }

  flipTimeline();

  let resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      flipTimeline();
    }, 100);
  });
}

// Initialize Scaling Elements on Scroll (GSAP Flip)
document.addEventListener('DOMContentLoaded', function() {
  initFlipOnScroll();
});




// Home_case_timeline title animation

