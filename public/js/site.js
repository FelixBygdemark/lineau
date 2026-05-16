// Scroll-to-top on load/refresh is handled by Webflow custom code (see webflow-scroll-to-top.html)

// Ensure Webflow & DOM are ready
window.Webflow ||= [];
window.Webflow.push(() => {
  document.body.classList.add("wf-custom");
});


gsap.registerPlugin(ScrollTrigger, SplitText);
gsap.registerPlugin(ScrambleTextPlugin);
gsap.registerPlugin(InertiaPlugin);

// Initialize Lenis smooth scrolling
const lenis = new Lenis();
window.lenis = lenis; // Expose for Webflow page embed (home scroll lock)

window.addEventListener('pageshow', function () {
  lenis.scrollTo(0, { immediate: true });
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





//OSMO Global Parallax

function initGlobalParallax() {
  const mm = gsap.matchMedia()

  mm.add(
    {
      isMobile: "(max-width:479px)",
      isMobileLandscape: "(max-width:767px)",
      isTablet: "(max-width:991px)",
      isDesktop: "(min-width:992px)"
    },
    (context) => {
      const { isMobile, isMobileLandscape, isTablet } = context.conditions

      const ctx = gsap.context(() => {
        document.querySelectorAll('[data-parallax="trigger"]').forEach((trigger) => {
            // Check if this trigger has to be disabled on smaller breakpoints
            const disable = trigger.getAttribute("data-parallax-disable")
            if (
              (disable === "mobile" && isMobile) ||
              (disable === "mobileLandscape" && isMobileLandscape) ||
              (disable === "tablet" && isTablet)
            ) {
              return
            }
            
            // Optional: you can target an element inside a trigger if necessary 
            const target = trigger.querySelector('[data-parallax="target"]') || trigger

            // Get the direction value to decide between xPercent or yPercent tween
            const direction = trigger.getAttribute("data-parallax-direction") || "vertical"
            const prop = direction === "horizontal" ? "xPercent" : "yPercent"
            
            // Get the scrub value, our default is 'true' because that feels nice with Lenis
            const scrubAttr = trigger.getAttribute("data-parallax-scrub")
            const scrub = scrubAttr ? parseFloat(scrubAttr) : true
            
            // Get the start position in %
            const startAttr = trigger.getAttribute("data-parallax-start")
            const startVal = (startAttr != null && startAttr !== "") ? parseFloat(startAttr) : 20

            // Get the end position in %
            const endAttr = trigger.getAttribute("data-parallax-end")
            const endVal = (endAttr != null && endAttr !== "") ? parseFloat(endAttr) : -20
            
            // Get the start value of the ScrollTrigger
            const scrollStartRaw = trigger.getAttribute("data-parallax-scroll-start") || "top bottom"
            const scrollStart = `clamp(${scrollStartRaw})`
            
           // Get the end value of the ScrollTrigger  
            const scrollEndRaw = trigger.getAttribute("data-parallax-scroll-end") || "bottom top"
            const scrollEnd = `clamp(${scrollEndRaw})`

            gsap.fromTo(
              target,
              { [prop]: startVal },
              {
                [prop]: endVal,
                ease: "none",
                scrollTrigger: {
                  trigger,
                  start: scrollStart,
                  end: scrollEnd,
                  scrub,
                },
              }
            )
          })
      })

      return () => ctx.revert()
    }
  )
}

// Initialize Global Parallax Setup (run now if DOM already ready, e.g. script at end of body).
// If you animate parallax triggers into view on page load (e.g. from -yPercent), either:
// 1) Call ScrollTrigger.refresh() in the onComplete of that entrance so trigger positions are recalculated, or
// 2) Set window.__PARALLAX_DEFER_INIT__ = true before this script runs, then call initGlobalParallax() (and ScrollTrigger.refresh()) when the entrance finishes.
if (!window.__PARALLAX_DEFER_INIT__) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGlobalParallax)
  } else {
    initGlobalParallax()
  }
}





// ––––––––– Parallax using data-parallax
// document.querySelectorAll('[data-parallax]').forEach(el => {
//   const parallaxValue = parseFloat(el.getAttribute('data-parallax')) || 10;
  
//   gsap.fromTo(el, { yPercent: -parallaxValue },
//   {
//     yPercent: parallaxValue,
//     ease: "none",
//     scrollTrigger: {
//       trigger: el,
//       start: "top bottom",
//       end: "bottom top",
//       scrub: true
//     }
//   });
// });



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





//nav text-link stagger — hover on [data-nav-stagger] (often a parent); text split on [data-nav-stagger-target] or legacy same-element <a>
function initNavCharStagger() {
  const triggers = document.querySelectorAll('[data-nav-stagger]');

  triggers.forEach(trigger => {
    if (trigger.dataset.splitInit) return;

    let target = trigger.querySelector('[data-nav-stagger-target]');
    if (!target) {
      if (trigger.matches('a')) {
        target = trigger;
      } else {
        target = trigger.querySelector('a') || trigger.firstElementChild;
      }
    }
    if (!target) return;

    trigger.dataset.splitInit = 'true';

    const split = new SplitText(target, {
      type: 'chars',
      charsClass: 'char'
    });

    gsap.set(split.chars, {
      yPercent: 0
    });

    let enterTween = null;
    let leaveTween = null;
    let leaveQueued = false;

    const runLeave = () => {
      leaveQueued = false;
      if (leaveTween) leaveTween.kill();
      leaveTween = gsap.to(split.chars, {
        yPercent: 0,
        duration: 0.3,
        ease: 'power4.out',
        stagger: {
          each: 0.01
        },
        onComplete: () => {
          leaveTween = null;
        }
      });
    };

    trigger.addEventListener('mouseenter', () => {
      leaveQueued = false;
      if (leaveTween) {
        leaveTween.kill();
        leaveTween = null;
      }
      if (enterTween) enterTween.kill();
      enterTween = gsap.to(split.chars, {
        yPercent: -100,
        duration: 0.3,
        ease: 'power4.out',
        stagger: {
          each: 0.01
        },
        onComplete: () => {
          enterTween = null;
          if (leaveQueued) runLeave();
        }
      });
    });

    trigger.addEventListener('mouseleave', () => {
      leaveQueued = true;
      if (!enterTween) {
        runLeave();
      }
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



// OSMO Trailing cursor
function initRotatingImageTrail() {
  var area = document.querySelector("[data-trail-area]");
  if (!area) return;

  var collection = area.querySelector("[data-trail-collection]");
  if (!collection) return;

  var items = collection.querySelectorAll("[data-trail-item]");
  if (!items.length) return;

  // Distance logic
  var index = 0;
  var lastCloneX = null;
  var lastCloneY = null;

  var cardWidth = items[0].getBoundingClientRect().width;
  var stepDistance = cardWidth * 0.5;

  function spawnTrailItem(x, y) {
    var original = items[index];
    var clone = original.cloneNode(true);

    clone.style.left = x + "px";
    clone.style.top = y + "px";

    clone.setAttribute("data-trail-item", "hidden");

    area.appendChild(clone);

    void clone.getBoundingClientRect();

    clone.setAttribute("data-trail-item", "visible");

    setTimeout(function () {
      clone.setAttribute("data-trail-item", "transition-out");
    }, 400);

    setTimeout(function () {
      clone.remove();
    }, 1200);

    index = (index + 1) % items.length;
    lastCloneX = x;
    lastCloneY = y;
  }

  // Mouse movement logic
  area.addEventListener("mousemove", function (event) {
    var rect = area.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      lastCloneX = null;
      lastCloneY = null;
      return;
    }

    if (lastCloneX === null || lastCloneY === null) {
      spawnTrailItem(x, y);
      return;
    }

    var dx = x - lastCloneX;
    var dy = y - lastCloneY;
    var distance = Math.sqrt(dx * dx + dy * dy);

    if (distance >= stepDistance) {
      spawnTrailItem(x, y);
    }
  });
}

// Initialize Rotating Image Trail
document.addEventListener("DOMContentLoaded", function () {
  initRotatingImageTrail();
});


// OSMO Custom form validation
function initBasicFormValidation() {
  const formElements = document.querySelectorAll('form[data-form-validate]');

  formElements.forEach((form) => {
    const fields = form.querySelectorAll('[data-validate] input, [data-validate] textarea');
    const submitButtonDiv = form.querySelector('[data-submit]'); // The div wrapping the submit button
    // Support both <input type="submit"> and <button type="submit"> (Webflow often uses button)
    const submitInput =
      (submitButtonDiv && submitButtonDiv.querySelector('input[type="submit"], button[type="submit"]')) ||
      form.querySelector('input[type="submit"], button[type="submit"]');

    if (!submitInput) return; // No submit control found, skip this form

    // Capture the form load time
    const formLoadTime = new Date().getTime(); // Timestamp when the form was loaded

    // Function to validate individual fields (input or textarea)
    const validateField = (field) => {
      const parent = field.closest('[data-validate]'); // Get the parent div
      if (!parent) return true;
      const minLength = field.getAttribute('min');
      const maxLength = field.getAttribute('max');
      const type = field.getAttribute('type');
      let isValid = true;

      // Check if the field has content
      if (field.value.trim() !== '') {
        parent.classList.add('is--filled');
      } else {
        parent.classList.remove('is--filled');
      }

      // Validation logic for min and max length
      if (minLength && field.value.length < minLength) {
        isValid = false;
      }

      if (maxLength && field.value.length > maxLength) {
        isValid = false;
      }

      // Validation logic for email input type
      if (type === 'email' && field.value.trim() !== '' && !/\S+@\S+\.\S+/.test(field.value)) {
        isValid = false;
      }

      // Add or remove success/error classes on the parent div
      if (isValid) {
        parent.classList.remove('is--error');
        parent.classList.add('is--success');
      } else {
        parent.classList.remove('is--success');
        parent.classList.add('is--error');
      }

      return isValid;
    };

    // Function to start live validation for a field
    const startLiveValidation = (field) => {
      field.addEventListener('input', function () {
        validateField(field);
      });
    };

    // Function to validate and start live validation for all fields, focusing on the first field with an error
    const validateAndStartLiveValidationForAll = () => {
      let allValid = true;
      let firstInvalidField = null;

      fields.forEach((field) => {
        const valid = validateField(field);
        if (!valid && !firstInvalidField) {
          firstInvalidField = field; // Track the first invalid field
        }
        if (!valid) {
          allValid = false;
        }
        startLiveValidation(field); // Start live validation for all fields
      });

      // If there is an invalid field, focus on the first one
      if (firstInvalidField) {
        firstInvalidField.focus();
      }

      return allValid;
    };

    // Anti-spam: Check if form was filled too quickly
    const isSpam = () => {
      const currentTime = new Date().getTime();
      const timeDifference = (currentTime - formLoadTime) / 1000; // Convert milliseconds to seconds
      return timeDifference < 5; // Return true if form is filled within 5 seconds
    };

    let allowSubmit = false;

    const trySubmit = () => {
      if (validateAndStartLiveValidationForAll()) {
        if (isSpam()) {
          alert('Form submitted too quickly. Please try again.');
          return;
        }
        allowSubmit = true;
        if (typeof form.requestSubmit === 'function') {
          form.requestSubmit();
        } else {
          form.submit();
        }
      }
    };

    // Intercept form submit so validation runs before Webflow/native submit
    form.addEventListener('submit', function (event) {
      if (!allowSubmit) {
        event.preventDefault();
        trySubmit();
      } else {
        allowSubmit = false;
      }
    });

    // Click on the [data-submit] wrapper (e.g. div with "Submit" text) — the real input is often hidden in Webflow
    if (submitButtonDiv) {
      submitButtonDiv.addEventListener('click', function (e) {
        e.preventDefault();
        trySubmit();
      });
      // Allow Enter on the wrapper if it has tabindex (keyboard submit)
      submitButtonDiv.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          trySubmit();
        }
      });
    }

    // Handle pressing the "Enter" key
    form.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault(); // Prevent the default form submission
        trySubmit();
      }
    });
  });
}

// Initialize Basic Form Validation
document.addEventListener('DOMContentLoaded', () => {
  initBasicFormValidation();
});





// Contact Flyout — GSAP-driven panel. Open: [data-contact="open"]. Close: [data-contact="close"] or click [data-contact="overlay"] or Escape.
// Structure: .contact-flyout_wrap (data-contact="wrapper") — flex layout, do not change. .contact-flyout_overlay (data-contact="overlay"). .contact-flyout_panel (data-contact="panel") slides 110% → 0% xPercent. Inside panel: [data-contact="header"], [data-contact="title"] (SplitText lines), [data-contact="links"], [data-contact="form"]
window.Webflow ||= [];
window.Webflow.push(function initContactFlyout() {
  const wrap = document.querySelector('.contact-flyout_wrap');
  if (!wrap) return;

  const overlay = wrap.querySelector('[data-contact="overlay"]');
  const panel = wrap.querySelector('[data-contact="panel"]') || wrap.querySelector('.contact-flyout_panel') || wrap.querySelector('.contact-flyout') || wrap.firstElementChild;
  const openTriggers = document.querySelectorAll('[data-contact="open"]');
  const closeTriggers = wrap.querySelectorAll('[data-contact="close"]');

  // Panel inner elements (optional)
  const headerEl = panel?.querySelector('[data-contact="header"]');
  const titleEl = panel?.querySelector('[data-contact="title"]');
  const linksEl = panel?.querySelector('[data-contact="links"]');
  const formEl = panel?.querySelector('[data-contact="form"]');

  const state = { isOpen: false };
  let titleSplit = null; // SplitText instance for cleanup

  // Initial state: wrap pointer-events only (do not touch flex/layout), overlay 0%, panel at 110% xPercent, inner elements at "from" values
  // Wrap is made visible by JS on open; keep opacity 0 and pointer-events none until then so it doesn't show or block
  gsap.set(wrap, {
    visibility: 'visible',
    opacity: 0,
    pointerEvents: 'none',
  });
  if (overlay) gsap.set(overlay, { opacity: 0, pointerEvents: 'none' });
  gsap.set(panel, { xPercent: 110 });

  // Header: from yPercent 150, opacity 0
  if (headerEl) gsap.set(headerEl, { yPercent: 150, opacity: 0 });
  // Title: split by lines, overflow hidden, from yPercent 110, opacity 0
  if (titleEl && typeof SplitText !== 'undefined') {
    titleEl.style.overflow = 'hidden';
    titleSplit = new SplitText(titleEl, { type: 'lines' });
    gsap.set(titleSplit.lines, { yPercent: 110, opacity: 0 });
  } else if (titleEl) {
    gsap.set(titleEl, { yPercent: 110, opacity: 0 });
  }
  // Links: from yPercent 150, opacity 0
  if (linksEl) gsap.set(linksEl, { yPercent: 150, opacity: 0 });
  // Form: all children from yPercent 150, opacity 0
  if (formEl) gsap.set(formEl.children, { yPercent: 150, opacity: 0 });

  // Open timeline
  const innerStart = 0.2;
  const flyoutTl = gsap.timeline({ paused: true });
  // data-contact="overlay"
  if (overlay) flyoutTl.to(overlay, {
    opacity: 0.6,
    duration: 0.2,
    ease: 'linear',
  }, 0);
  // data-contact="panel" (.contact-flyout_panel) 110% → 0%
  flyoutTl.to(panel, {
    xPercent: 0,
    duration: 0.5,
    ease: 'power4.inOut',
  }, 0);
  // data-contact="header"
  if (headerEl) flyoutTl.to(headerEl, {
    yPercent: 0,
    opacity: 1,
    duration: 0.6,
    ease: 'power4.out',
  }, innerStart);
  // data-contact="title" (split by lines)
  if (titleEl) {
    if (titleSplit?.lines) {
      flyoutTl.to(titleSplit.lines, {
        yPercent: 0,
        opacity: 1,
        duration: 0.5,
        ease: 'power4.out',
        stagger: 0.05,
      }, innerStart + 0.1);
    } else {
      flyoutTl.to(titleEl, {
        yPercent: 0,
        opacity: 1,
        duration: 0.5,
        ease: 'power4.out',
      }, innerStart);
    }
  }
  // data-contact="links"
  if (linksEl) flyoutTl.to(linksEl, {
    yPercent: 0,
    opacity: 1,
    duration: 0.5,
    ease: 'power4.out',
  }, innerStart + 0.2);
  // data-contact="form" (children)
  if (formEl && formEl.children.length) {
    flyoutTl.to(formEl.children, {
      yPercent: 0,
      opacity: 1,
      duration: 0.5,
      ease: 'power4.out',
      stagger: 0.03,
    }, innerStart + 0.3);
  }

  function open() {
    if (state.isOpen) return;
    state.isOpen = true;
    // if (window.lenis) window.lenis.stop();
    wrap.setAttribute('aria-hidden', 'false');

    gsap.set(wrap, { visibility: 'visible', opacity: 1, pointerEvents: 'auto' });
    if (overlay) gsap.set(overlay, { pointerEvents: 'auto' });

    flyoutTl.reversed(false);
    flyoutTl.timeScale(1);
    flyoutTl.progress(0);
    flyoutTl.play();
  }

  function close() {
    if (!state.isOpen) return;
    state.isOpen = false;
    flyoutTl.pause();

    const closeDuration = 0.35;
    const closeEase = 'power3.in';
    const closeTl = gsap.timeline({
      onComplete: () => {
        gsap.set(wrap, { pointerEvents: 'none', opacity: 0 });
        if (overlay) gsap.set(overlay, { pointerEvents: 'none' });
        wrap.setAttribute('aria-hidden', 'true');
        // if (window.lenis) window.lenis.start();
      },
    });

    // data-contact="header"
    if (headerEl) closeTl.to(headerEl, {
      yPercent: 150,
      opacity: 0,
      duration: closeDuration * 0.6,
      ease: closeEase,
    }, 0);
    // data-contact="title" (split by lines)
    if (titleEl) {
      if (titleSplit?.lines) {
        closeTl.to(titleSplit.lines, {
          yPercent: 110,
          opacity: 0,
          duration: closeDuration * 0.6,
          ease: closeEase,
          stagger: 0.02,
        }, 0);
      } else {
        closeTl.to(titleEl, {
          yPercent: 110,
          opacity: 0,
          duration: closeDuration * 0.6,
          ease: closeEase,
        }, 0);
      }
    }
    // data-contact="links"
    if (linksEl) closeTl.to(linksEl, {
      yPercent: 150,
      opacity: 0,
      duration: closeDuration * 0.6,
      ease: closeEase,
    }, 0);
    // data-contact="form" (children)
    if (formEl && formEl.children.length) {
      closeTl.to(formEl.children, {
        yPercent: 150,
        opacity: 0,
        duration: closeDuration * 0.6,
        ease: closeEase,
        stagger: 0.015,
      }, 0);
    }
    // data-contact="panel" (.contact-flyout_panel) 0% → 110%
    closeTl.to(panel, {
      xPercent: 110,
      duration: closeDuration * 1.2,
      ease: closeEase,
    }, closeDuration * 0.1);
    // data-contact="overlay" — longer, softer fade to avoid abrupt flash
    if (overlay) closeTl.to(overlay, {
      opacity: 0,
      duration: 0.5,
      ease: 'linear',
    }, closeDuration * 0.1);
  }

  openTriggers.forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      open();
    });
  });

  closeTriggers.forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      close();
    });
  });

  // Close: overlay click, or click outside panel
  if (overlay) {
    overlay.addEventListener('click', close);
  } else {
    wrap.addEventListener('click', (e) => {
      if (!panel.contains(e.target)) close();
    });
  }
  panel.addEventListener('click', (e) => e.stopPropagation());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.isOpen) close();
  });

  wrap.setAttribute('aria-hidden', 'true');
});



// OSMO Nav flyout
gsap.registerPlugin(CustomEase);

CustomEase.create( "main", "0.65, 0.01, 0.05, 0.99" );

gsap.defaults({
  ease:"main",
  duration:0.7
});
  
function initSideNavWipeEffect(){

  let navWrap = document.querySelector("[data-sidenav-wrap]");
  let state = navWrap.getAttribute("data-nav-state");
  let overlay = navWrap.querySelector("[data-sidenav-overlay]");
  let menu = navWrap.querySelector("[data-sidenav-menu]");
  let bgPanels = navWrap.querySelectorAll("[data-sidenav-panel]");
  let menuToggles = document.querySelectorAll("[data-sidenav-toggle]");
  let menuLinks = navWrap.querySelectorAll("[data-sidenav-link]");
  let fadeTargets = navWrap.querySelectorAll("[data-sidenav-fade]");
  let menuButton = document.querySelector("[data-sidenav-button]");
  let menuButtonTexts = menuButton.querySelectorAll("[data-sidenav-label]");
  let menuButtonIcon = menuButton.querySelector("[data-sidenav-icon]");

  let tl = gsap.timeline()
  
  const openNav = () =>{
    navWrap.setAttribute("data-nav-state", "open");
    
    tl.clear()
    .set(navWrap,{display:"block"})
    .set(menu,{xPercent:0},"<")
    .fromTo(menuButtonTexts,{yPercent:0},{yPercent:-100,stagger:0.2})
    .fromTo(menuButtonIcon,{rotate:0},{rotate:315},"<")
    .fromTo(overlay,{autoAlpha:0},{autoAlpha:1},"<")
    .fromTo(bgPanels,{xPercent:101},{xPercent:0,stagger:0.12,duration: 0.575},"<")
    .fromTo(menuLinks,{yPercent:150,rotate:10},{yPercent:0, rotate:0,stagger:0.05},"<+=0.35")
    .fromTo(fadeTargets,{autoAlpha:0,yPercent:50},{autoAlpha:1, yPercent:0,stagger:0.04},"<+=0.2");
  }
  
  const closeNav = () =>{
    navWrap.setAttribute("data-nav-state", "closed");
    
    tl.clear()
    .to(overlay,{autoAlpha:0})
    .to(menu,{xPercent:120},"<")
    .to(menuButtonTexts,{yPercent:0},"<")
    .to(menuButtonIcon,{rotate:0},"<")
    .set(navWrap,{display:"none"});
  }  
  
  // Toggle menu open / close depending on its current state
  menuToggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      state = navWrap.getAttribute("data-nav-state");
      if (state === "open") {
        closeNav();
      } else {
        openNav();
      }
    });    
  });
  
  // If menu is open, you can close it using the "escape" key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navWrap.getAttribute("data-nav-state") === "open") {
      closeNav();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initSideNavWipeEffect();
});



// OSMO Page transition
