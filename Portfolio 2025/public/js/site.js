// Ensure Webflow & DOM are ready
window.Webflow ||= [];
window.Webflow.push(() => {
  console.log("Custom JS loaded via Netlify.");
  document.body.classList.add("wf-custom");
});