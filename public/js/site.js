// -----------------------------------------
// OSMO PAGE TRANSITION BOILERPLATE
// -----------------------------------------

gsap.registerPlugin(CustomEase);

history.scrollRestoration = "manual";

let lenis = null;
let nextPage = document;
let onceFunctionsInitialized = false;

const hasLenis = typeof window.Lenis !== "undefined";
const hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";

const rmMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = rmMQ.matches;
rmMQ.addEventListener?.("change", e => (reducedMotion = e.matches));
rmMQ.addListener?.(e => (reducedMotion = e.matches)); 

const has = (s) => !!nextPage.querySelector(s);

let staggerDefault = 0.05;
let durationDefault = 0.6;

CustomEase.create("osmo", "0.625, 0.05, 0, 1");
gsap.defaults({ ease: "osmo", duration: durationDefault });



// -----------------------------------------
// FUNCTION REGISTRY
// -----------------------------------------

function initOnceFunctions() {
  initLenis();
  if (onceFunctionsInitialized) return;
  onceFunctionsInitialized = true;
  
  initNavCharStagger();
  initCursorMarqueeEffect();
  initSideNavWipeEffect();
  initBasicFormValidation();
  

  // Runs once on first load
  // if (has('[data-something]')) initSomething();
}

function initBeforeEnterFunctions(next) {
  nextPage = next || document;
  
  // Runs before the enter animation
  // if (has('[data-something]')) initSomething();
}

function initAfterEnterFunctions(next) {
  nextPage = next || document;

  // Runs after enter animation completes — page-specific, gated on the
  // incoming container so each only runs on pages that actually use it.
  if (has('[data-parallax="trigger"]')) initGlobalParallax();
  if (has('[data-footer-parallax]')) initFooterParallax();
  if (has('[data-bunny-background-init]')) initBunnyPlayerBackground();
  if (has('[data-css-marquee]')) initCSSMarquee();
  if (has('.slider')) initHomeSlider();


  if(hasLenis){
    lenis.resize();
  }
  
  if (hasScrollTrigger) {
    ScrollTrigger.refresh();
  }
}



// -----------------------------------------
// PAGE TRANSITIONS
// -----------------------------------------

function runPageOnceAnimation(next) {
  const tl = gsap.timeline();

  tl.call(() => {
    resetPage(next)
  }, null, 0);

  return tl;
}

function runPageLeaveAnimation(current, next) {
  const tl = gsap.timeline({
    onComplete: () => { current.remove() }
  });
  
  if (reducedMotion) {
    // Immediate swap behavior if user prefers reduced motion
    return tl.set(current, { autoAlpha: 0 });
  }

  tl.to(current, { autoAlpha: 0, duration: 0.4 });

  return tl;
}

function runPageEnterAnimation(next){
  const tl = gsap.timeline();
  
  if (reducedMotion) {
    // Immediate swap behavior if user prefers reduced motion
    tl.set(next, { autoAlpha: 1 });
    tl.add("pageReady")
    tl.call(resetPage, [next], "pageReady");
    return new Promise(resolve => tl.call(resolve, null, "pageReady"));
  }
  
  tl.add("startEnter", 0.6);
  
  tl.fromTo(next, {
    autoAlpha: 0,
  },{
    autoAlpha: 1,
  }, "startEnter");

  tl.add("pageReady");
  tl.call(resetPage, [next], "pageReady");

  return new Promise(resolve => {
    tl.call(resolve, null, "pageReady");
  });
}


// -----------------------------------------
// BARBA HOOKS + INIT
// -----------------------------------------

barba.hooks.beforeEnter(data => {
  // Position new container on top
  gsap.set(data.next.container, {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
  });
  
  if (lenis && typeof lenis.stop === "function") {
    lenis.stop();
  }
  
  initBeforeEnterFunctions(data.next.container);
  applyThemeFrom(data.next.container);
});

barba.hooks.afterLeave(() => {
  if(hasScrollTrigger){
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  }
});

barba.hooks.enter(data => {
  initBarbaNavUpdate(data);
})

barba.hooks.afterEnter(data => {
  // Run page functions
  initAfterEnterFunctions(data.next.container);
  
  // Settle
  if(hasLenis){
    lenis.resize();
    lenis.start();    
  }
  
  if(hasScrollTrigger){
    ScrollTrigger.refresh(); 
  }
});

barba.init({
  debug: true, // Set to 'false' in production
  timeout: 7000,
  preventRunning: true,
  transitions: [
    {
      name: "default",
      sync: true,
      
      // First load
      async once(data) {
        initOnceFunctions();

        return runPageOnceAnimation(data.next.container);
      },

      // Current page leaves
      async leave(data) {
        return runPageLeaveAnimation(data.current.container, data.next.container);
      },

      // New page enters
      async enter(data) {
        return runPageEnterAnimation(data.next.container);
      }
    }
  ],
});



// -----------------------------------------
// GENERIC + HELPERS
// -----------------------------------------

const themeConfig = {
  light: {
    nav: "dark",
    transition: "light"
  },
  dark: {
    nav: "light",
    transition: "dark"
  }
};

function applyThemeFrom(container) {
  const pageTheme = container?.dataset?.pageTheme || "light";
  const config = themeConfig[pageTheme] || themeConfig.light;
  
  document.body.dataset.pageTheme = pageTheme;
  const transitionEl = document.querySelector('[data-theme-transition]');
  if (transitionEl) {
    transitionEl.dataset.themeTransition = config.transition;
  }

  const nav = document.querySelector('[data-theme-nav]');
  if (nav) {
    nav.dataset.themeNav = config.nav;
  }
}

function initLenis() {
  if (lenis) return; // already created
  if (!hasLenis) return;

  lenis = new Lenis({
    lerp: 0.5,
    wheelMultiplier: 1.25,
  });

  if (hasScrollTrigger) {
    lenis.on("scroll", ScrollTrigger.update);
  }

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);
}

function resetPage(container){
  window.scrollTo(0, 0);
  gsap.set(container, { clearProps: "position,top,left,right" });
  
  if(hasLenis){
    lenis.resize();
    lenis.start();    
  }
}

function debounceOnWidthChange(fn, ms) {
  let last = innerWidth,
    timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (innerWidth !== last) {
        last = innerWidth;
        fn.apply(this, args);
      }
    }, ms);
  };
}

function initBarbaNavUpdate(data) {
  var tpl = document.createElement('template');
  tpl.innerHTML = data.next.html.trim();
  var nextNodes = tpl.content.querySelectorAll('[data-barba-update]');
  var currentNodes = document.querySelectorAll('nav [data-barba-update]');

  currentNodes.forEach(function (curr, index) {
    var next = nextNodes[index];
    if (!next) return;

    // Aria-current sync
    var newStatus = next.getAttribute('aria-current');
    if (newStatus !== null) {
      curr.setAttribute('aria-current', newStatus);
    } else {
      curr.removeAttribute('aria-current');
    }

    // Class list sync
    var newClassList = next.getAttribute('class') || '';
    curr.setAttribute('class', newClassList);
  });
}



// -----------------------------------------
// YOUR FUNCTIONS GO BELOW HERE
// -----------------------------------------

// GSAP plugins used across this file (the boilerplate only registers CustomEase).
// Runs at parse time, before any init* / Barba hook fires.
window.Webflow ||= [];
gsap.registerPlugin(ScrollTrigger, SplitText);



// -----------------------------------------
// GLOBAL FUNCTIONS
// -----------------------------------------


// Nav text-link stagger
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

// OSMO marquee cursor
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

// OSMO Nav flyout
CustomEase.create("main", "0.65, 0.01, 0.05, 0.99");
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

// Contact Flyout
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



// -----------------------------------------
// PAGE SPECIFIC FUNCTIONS
// -----------------------------------------


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
            const startVal = (startAttr != null && startAttr !== "") ? parseFloat(startAttr) : 10

            // Get the end position in %
            const endAttr = trigger.getAttribute("data-parallax-end")
            const endVal = (endAttr != null && endAttr !== "") ? parseFloat(endAttr) : -10
            
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

// OSMO footer reveal on scroll
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

// ================================================================
// HOME INFINITE SLIDER — adapted from the Codegrid infinite horizontal
// parallax slider demo. Slides are static Webflow markup (.slider >
// .slide-track > a.slide Link Blocks) rather than JS-generated from a
// data array — this only clones them into loop copies and drives the
// drag/wheel physics + parallax. See docs/WEBFLOW-INFINITE-SLIDER-STRUCTURE.md.
// ================================================================
// TODO (§3 teardown): capture the rAF id + a running flag and remove the
// document/window listeners on Barba afterLeave when leaving `home`, or every
// return visit stacks another animate() loop over detached nodes.
function initHomeSlider() {
  document.querySelectorAll(".slider").forEach((sliderEl) => {
  const track = sliderEl.querySelector(".slide-track");
  if (!track) return;

  const originalSlides = Array.from(track.children).filter((el) =>
    el.classList.contains("slide")
  );
  if (!originalSlides.length) return;

  const slideCount = originalSlides.length;

  const config = {
    SCROLL_SPEED: 1.75,
    LERP_FACTOR: 0.05,
    MAX_VELOCITY: 150,
    LOOP_COPIES: 6,
  };

  const state = {
    currentX: 0,
    targetX: 0,
    slideWidth: 0,
    slides: [],
    isDragging: false,
    startX: 0,
    lastX: 0,
    lastMouseX: 0,
    dragDistance: 0,
    hasActuallyDragged: false,
  };

  // Title-reveal hover animation is hover-only — on touch devices the
  // title just stays visible via .slide-overlay's base opacity: 1 in CSS.
  const supportsHover = window.matchMedia("(hover: hover)").matches;

  function setupTitleHover(slide) {
    if (!supportsHover) return;

    const title = slide.querySelector(".project-title");
    if (!title) return;

    const split = new SplitText(title, { type: "chars" });
    gsap.set(split.chars, { y: 20, opacity: 0 });

    let enterTween = null;
    let leaveTween = null;

    slide.addEventListener("mouseenter", () => {
      leaveTween?.kill();
      enterTween = gsap.fromTo(
        split.chars,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power2.out", stagger: 0.03 }
      );
    });

    slide.addEventListener("mouseleave", () => {
      enterTween?.kill();
      leaveTween = gsap.to(split.chars, {
        y: 20,
        opacity: 0,
        duration: 0.2,
        ease: "power4.out",
        stagger: 0.015,
      });
    });
  }

  // Measured from the DOM (not hardcoded) so this keeps working whatever
  // width Webflow's breakpoints render the slide at. Must run AFTER the
  // clones are in the track — a detached node (e.g. the original slides
  // right after track.innerHTML = "") always reports a zero-width rect.
  function measureSlideWidth(sample) {
    const rect = sample.getBoundingClientRect();
    const styles = getComputedStyle(sample);
    return (
      rect.width + parseFloat(styles.marginLeft) + parseFloat(styles.marginRight)
    );
  }

  function buildLoop() {
    track.innerHTML = "";
    state.slides = [];

    for (let copy = 0; copy < config.LOOP_COPIES; copy++) {
      originalSlides.forEach((slide) => {
        const clone = slide.cloneNode(true);
        track.appendChild(clone);
        state.slides.push(clone);
        setupTitleHover(clone);
      });
    }

    state.slideWidth = measureSlideWidth(state.slides[0]);

    const startOffset = -(slideCount * state.slideWidth * 2);
    state.currentX = startOffset;
    state.targetX = startOffset;
  }

  function updateSlidePositions() {
    const sequenceWidth = state.slideWidth * slideCount;

    if (state.currentX > -sequenceWidth * 1) {
      state.currentX -= sequenceWidth;
      state.targetX -= sequenceWidth;
    } else if (state.currentX < -sequenceWidth * 4) {
      state.currentX += sequenceWidth;
      state.targetX += sequenceWidth;
    }

    track.style.transform = `translate3d(${state.currentX}px, 0, 0)`;
  }

  function updateParallax() {
    const viewportCenter = window.innerWidth / 2;

    state.slides.forEach((slide) => {
      const img = slide.querySelector("img");
      if (!img) return;

      const slideRect = slide.getBoundingClientRect();
      if (slideRect.right < -500 || slideRect.left > window.innerWidth + 500) {
        return;
      }

      const slideCenter = slideRect.left + slideRect.width / 2;
      const distanceFromCenter = slideCenter - viewportCenter;
      const parallaxOffset = distanceFromCenter * -0.25;

      // No scale — the image is 225%-wide and pre-centered via CSS
      // (.home-slider-image: left: 50%); -50% here re-applies that
      // centering since setting .transform overwrites any CSS transform.
      img.style.transform = `translateX(calc(-50% + ${parallaxOffset}px))`;
    });
  }

  function animate() {
    state.currentX += (state.targetX - state.currentX) * config.LERP_FACTOR;

    updateSlidePositions();
    updateParallax();

    requestAnimationFrame(animate);
  }

  function handleWheel(e) {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    e.preventDefault();

    const scrollDelta = e.deltaY * config.SCROLL_SPEED;
    state.targetX -= Math.max(
      Math.min(scrollDelta, config.MAX_VELOCITY),
      -config.MAX_VELOCITY
    );
  }

  function handleTouchStart(e) {
    state.isDragging = true;
    state.startX = e.touches[0].clientX;
    state.lastX = state.targetX;
    state.dragDistance = 0;
    state.hasActuallyDragged = false;
  }

  function handleTouchMove(e) {
    if (!state.isDragging) return;

    const deltaX = (e.touches[0].clientX - state.startX) * 1.5;
    state.targetX = state.lastX + deltaX;
    state.dragDistance = Math.abs(deltaX);

    if (state.dragDistance > 5) state.hasActuallyDragged = true;
  }

  function handleTouchEnd() {
    state.isDragging = false;
    setTimeout(() => {
      state.hasActuallyDragged = false;
    }, 100);
  }

  function handleMouseDown(e) {
    e.preventDefault();
    state.isDragging = true;
    state.startX = e.clientX;
    state.lastMouseX = e.clientX;
    state.lastX = state.targetX;
    state.dragDistance = 0;
    state.hasActuallyDragged = false;
  }

  function handleMouseMove(e) {
    if (!state.isDragging) return;

    e.preventDefault();
    const deltaX = (e.clientX - state.lastMouseX) * 2;
    state.targetX += deltaX;
    state.lastMouseX = e.clientX;
    state.dragDistance += Math.abs(deltaX);

    if (state.dragDistance > 5) state.hasActuallyDragged = true;
  }

  function handleMouseUp() {
    state.isDragging = false;
    setTimeout(() => {
      state.hasActuallyDragged = false;
    }, 100);
  }

  // Slides are real <a href> Link Blocks now, so navigation is native —
  // only block it when the interaction was actually a drag, not a tap/click.
  function handleSlideClick(e) {
    const slide = e.target.closest(".slide");
    if (!slide) return;

    if (state.hasActuallyDragged || state.dragDistance > 10) {
      e.preventDefault();
    }
  }

  function handleResize() {
    buildLoop();
  }

  buildLoop();

  sliderEl.addEventListener("wheel", handleWheel, { passive: false });
  sliderEl.addEventListener("touchstart", handleTouchStart);
  sliderEl.addEventListener("touchmove", handleTouchMove);
  sliderEl.addEventListener("touchend", handleTouchEnd);
  sliderEl.addEventListener("mousedown", handleMouseDown);
  sliderEl.addEventListener("mouseleave", handleMouseUp);
  sliderEl.addEventListener("dragstart", (e) => e.preventDefault());
  track.addEventListener("click", handleSlideClick);

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  window.addEventListener("resize", handleResize);

  animate();
  });
}

