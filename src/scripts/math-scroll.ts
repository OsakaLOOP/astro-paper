function scrollDisplayMath(event: WheelEvent) {
  if (event.ctrlKey || event.defaultPrevented || !event.cancelable) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  const formula = target.closest<HTMLElement>(".app-prose .katex-display");
  if (!formula) return;

  const overflow = formula.scrollWidth - formula.clientWidth;
  if (overflow <= 1) return;

  const styles = getComputedStyle(formula);
  const delta =
    Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ? event.deltaX
      : event.deltaY;
  const scale =
    event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? parseFloat(styles.lineHeight) || 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? formula.clientWidth
        : 1;
  const minimum = styles.direction === "rtl" ? -overflow : 0;
  const maximum = styles.direction === "rtl" ? 0 : overflow;
  const nextLeft = Math.min(
    maximum,
    Math.max(minimum, formula.scrollLeft + delta * scale)
  );
  if (Math.abs(nextLeft - formula.scrollLeft) <= 0.5) return;

  event.preventDefault();
  formula.scrollLeft = nextLeft;
}

document.addEventListener("wheel", scrollDisplayMath, { passive: false });
