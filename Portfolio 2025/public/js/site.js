// Ensure Webflow & DOM are ready
window.Webflow ||= [];
window.Webflow.push(() => {
  console.log("Custom JS loaded via Netlify.");
  document.body.classList.add("wf-custom");
});


gsap.registerPlugin(ScrollTrigger, SplitText);
gsap.registerPlugin(ScrambleTextPlugin);

//––––––– OSMO Staggering Button GPT

function initButtonCharacterStagger() {
  const offsetIncrement = 0.01;
  const buttons = document.querySelectorAll('[data-button-animate-chars]');

  if (!buttons.length) return; // Prevent error if no buttons found

  buttons.forEach(button => {
    const text = button.textContent || '';
    button.innerHTML = '';

    [...text].forEach((char, index) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.transitionDelay = `${index * offsetIncrement}s`;

      if (char === ' ') {
        span.style.whiteSpace = 'pre';
      }

      button.appendChild(span);
    });
  });
}

// Run immediately (Slater runs after DOM is ready)
initButtonCharacterStagger();

// –––––– OSMO Custom cursor
function initDynamicCustomTextCursor() {
  let cursorItem = document.querySelector(".cursor");
  let cursorParagraph = cursorItem.querySelector("p");
  let targets = document.querySelectorAll("[data-cursor]");
  let xOffset = 6;
  let yOffset = 140;
  let cursorIsOnRight = false;
  let currentTarget = null;
  let lastText = '';

  // Position cursor relative to actual cursor position on page load
  gsap.set(cursorItem, { xPercent: xOffset, yPercent: yOffset });

  // Use GSAP quick.to for a more performative tween on the cursor
  let xTo = gsap.quickTo(cursorItem, "x", { ease: "power3" });
  let yTo = gsap.quickTo(cursorItem, "y", { ease: "power3" });

  // Function to get the width of the cursor element including a buffer
  const getCursorEdgeThreshold = () => {
    return cursorItem.offsetWidth + 16; // Cursor width + 16px margin
  };

  // On mousemove, call the quickTo functions to the actual cursor position
  window.addEventListener("mousemove", e => {
    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;
    let scrollY = window.scrollY;
    let cursorX = e.clientX;
    let cursorY = e.clientY + scrollY; // Adjust cursorY to account for scroll

    // Default offsets
    let xPercent = xOffset;
    let yPercent = yOffset;

    // Adjust X offset dynamically based on cursor width
    let cursorEdgeThreshold = getCursorEdgeThreshold();
    if (cursorX > windowWidth - cursorEdgeThreshold) {
      cursorIsOnRight = true;
      xPercent = -100;
    } else {
      cursorIsOnRight = false;
    }

    // Adjust Y offset if in the bottom 10% of the current viewport
    if (cursorY > scrollY + windowHeight * 0.9) {
      yPercent = -120;
    }

    if (currentTarget) {
      let newText = currentTarget.getAttribute("data-cursor");
      if (newText !== lastText) { // Only update if the text is different
        cursorParagraph.innerHTML = newText;
        lastText = newText;

        // Recalculate edge awareness whenever the text changes
        cursorEdgeThreshold = getCursorEdgeThreshold();
      }
    }

    gsap.to(cursorItem, {
      xPercent: xPercent,
      yPercent: yPercent,
      duration: 0.9,
      ease: "power3"
    });
    xTo(cursorX);
    yTo(cursorY - scrollY);
  });

  // Add a mouse enter listener for each link that has a data-cursor attribute
  targets.forEach(target => {
    target.addEventListener("mouseenter", () => {
      currentTarget = target; // Set the current target

      let newText = target.getAttribute("data-cursor");

      // Update only if the text changes
      if (newText !== lastText) {
        cursorParagraph.innerHTML = newText;
        lastText = newText;

        // Recalculate edge awareness whenever the text changes
        let cursorEdgeThreshold = getCursorEdgeThreshold();
      }
    });
  });
}

// Initialize Dynamic Text Cursor (Edge Aware)

initDynamicCustomTextCursor();

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
  gsap.fromTo(el, { yPercent: -10 },
  {
    yPercent: 10,
    ease: "none",
    scrollTrigger: {
      trigger: el,
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });
});

// ––––––––––––––––––––– Home Cases Scroll Parallax Section GPT
// Parallax scroll for each image
document.querySelectorAll('.case_img_clip').forEach(el => {
  gsap.fromTo(el, { yPercent: -10 },
  {
    yPercent: 10,
    ease: "none",
    scrollTrigger: {
      trigger: el,
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });
});

// fade in case items when scrolled into view
document.querySelectorAll('.case_img_contain').forEach(el => {
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
document.querySelectorAll(".case_item_wrap").forEach((wrap) => {
  const imgClip = wrap.querySelector(".case_img_clip");
  const textBlocks = wrap.querySelectorAll(".case_text");

  const splitTexts = Array.from(textBlocks).map(el => new SplitText(el, { type: "chars" }));

  // Immediately hide all split characters on page load
  splitTexts.forEach(split => {
    gsap.set(split.chars, {
      y: 20,
      opacity: 0
    });
  });

  let enterTweens = [];
  let leaveTweens = [];

  wrap.addEventListener("mouseenter", () => {
    // Kill any leave tweens still running
    leaveTweens.forEach(t => t.kill());
    leaveTweens = [];

    // Scale wrap and image
    enterTweens.push(
      gsap.to(wrap, {
        scale: 0.98,
        duration: 0.4,
        ease: "power3.out"
      }),
      gsap.to(imgClip, {
        scale: 1.10,
        duration: 1.4,
        ease: "power3.out"
      })
    );

    // Animate in each text block with stagger between blocks
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
  });

  wrap.addEventListener("mouseleave", () => {
    // Kill enter tweens so they don’t conflict
    enterTweens.forEach(t => t.kill());
    enterTweens = [];

    // Scale wrap and image back
    leaveTweens.push(
      gsap.to(wrap, {
        scale: 1,
        duration: 0.5,
        ease: "power2.inOut"
      }),
      gsap.to(imgClip, {
        scale: 1,
        duration: 0.7,
        ease: "power2.inOut"
      })
    );

    // Animate out each text block
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
  });
});

//reusable text reaveal on lines

document.querySelectorAll("[data-scroll-lines]").forEach((el) => {
  // Split text into lines
  const split = new SplitText(el, {
    type: "lines",
    linesClass: "line" // each line gets this class
  });

  // Wrap each line’s content in a div for clipping
  split.lines.forEach((line) => {
    const wrapper = document.createElement("div");
    wrapper.style.display = "inline-block";
    wrapper.style.transform = "translateY(100%)";
    wrapper.style.willChange = "transform";

    while (line.firstChild) {
      wrapper.appendChild(line.firstChild);
    }

    line.appendChild(wrapper);
  });

  // Animate the inner wrappers (not the .line itself)
  gsap.to(split.lines.map(line => line.firstChild), {
    y: 0,
    ease: "power4.out",
    duration: 0.6,
    stagger: 0.2,
    scrollTrigger: {
      trigger: el,
      start: "top 70%",
      toggleActions: "play reverse play reverse", // <- resets when out of view
      markers: false // set to true for debugging
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
