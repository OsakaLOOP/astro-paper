let cleanup = () => {};

function initPostScroll() {
  cleanup();

  const progressBar = document.getElementById("myBar");
  const container = document.getElementById("btt-btn-container");
  const button = document.querySelector<HTMLButtonElement>(
    "[data-button='back-to-top']"
  );
  const indicator = document.getElementById("progress-indicator");
  if (!progressBar || !container || !button || !indicator) return;

  const lifecycle = new AbortController();
  const root = document.documentElement;
  let frame = 0;
  let lastVisible: boolean | undefined;

  const update = () => {
    frame = 0;
    const total = root.scrollHeight - root.clientHeight;
    const progress =
      total > 0 ? Math.min(1, Math.max(0, root.scrollTop / total)) : 0;

    progressBar.style.width = `${progress * 100}%`;
    indicator.style.setProperty(
      "background-image",
      `conic-gradient(var(--accent), var(--accent) ${Math.floor(progress * 100)}%, transparent ${Math.floor(progress * 100)}%)`
    );

    const visible = progress > 0.3;
    if (visible !== lastVisible) {
      container.classList.toggle("opacity-100", visible);
      container.classList.toggle("translate-y-0", visible);
      container.classList.toggle("opacity-0", !visible);
      container.classList.toggle("translate-y-14", !visible);
      lastVisible = visible;
    }
  };
  const scheduleUpdate = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  button.addEventListener("click", () => window.scrollTo({ top: 0, left: 0 }), {
    signal: lifecycle.signal,
  });
  document.addEventListener("scroll", scheduleUpdate, {
    passive: true,
    signal: lifecycle.signal,
  });
  window.addEventListener("resize", scheduleUpdate, {
    signal: lifecycle.signal,
  });

  cleanup = () => {
    lifecycle.abort();
    cancelAnimationFrame(frame);
  };
  update();
}

document.addEventListener("astro:before-swap", () => cleanup());
document.addEventListener("astro:after-swap", () =>
  window.scrollTo({ left: 0, top: 0, behavior: "instant" })
);
document.addEventListener("astro:page-load", initPostScroll);
initPostScroll();
