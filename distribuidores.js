// JavaScript logic for Distribuidores directory
(function () {
  const select = document.getElementById("stateFilter");
  const sections = Array.from(document.querySelectorAll(".state-section"));
  const welcome = document.getElementById("welcome");
  const noResults = document.getElementById("noResults");
  const root = document.getElementById("sucursales-container");

  function sendHeight() {
    const height = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      root ? root.scrollHeight : 0
    ) + 8;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "imberadirectory:resize", height: height }, "*");
    }
  }

  function showState(state) {
    let found = false;
    sections.forEach(function (section) {
      const show = !!state && section.dataset.state.toLowerCase() === state.toLowerCase();
      section.hidden = !show;
      if (show) found = true;
    });
    if (welcome) welcome.hidden = !!state;
    if (noResults) noResults.hidden = found || !state;
    requestAnimationFrame(sendHeight);
  }

  // Sort cards alphabetically inside each state section on load
  sections.forEach(function (section) {
    const grid = section.querySelector(".cards-grid");
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll(".card"));
    cards.sort(function (a, b) {
      const titleA = a.querySelector(".card-title") ? a.querySelector(".card-title").textContent.trim() : "";
      const titleB = b.querySelector(".card-title") ? b.querySelector(".card-title").textContent.trim() : "";
      return titleA.localeCompare(titleB, "es", { sensitivity: "base" });
    });
    cards.forEach(function (card) {
      grid.appendChild(card);
    });
  });

  if (select) {
    select.addEventListener("change", function () {
      showState(this.value);
    });
  }

  document.querySelectorAll(".change-state").forEach(function (button) {
    button.addEventListener("click", function () {
      if (select) select.value = "";
      showState("");
      if (select) select.focus();
    });
  });

  window.addEventListener("load", sendHeight);
  window.addEventListener("resize", sendHeight);

  if (window.ResizeObserver && root) {
    new ResizeObserver(sendHeight).observe(root);
  }

  // Check URL params for pre-selecting state
  const urlParams = new URLSearchParams(window.location.search);
  const initialEstado = urlParams.get('estado') || urlParams.get('state');
  if (initialEstado && select) {
    const norm = initialEstado.toLowerCase().trim();
    select.value = norm;
    showState(norm);
  } else {
    showState("");
  }
})();
