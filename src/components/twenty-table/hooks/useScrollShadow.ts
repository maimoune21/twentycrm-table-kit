import { useCallback, useEffect, useRef, useState } from "react";

type ScrollShadowState = {
  showLeft: boolean;
  showRight: boolean;
  showTop: boolean;
  showBottom: boolean;
};

/**
 * Tracks scroll position of a container and returns which shadow
 * overlays should be visible. Updates on scroll and resize.
 */
export const useScrollShadow = (
  tableRef: React.RefObject<HTMLElement | null>,
) => {
  const [shadows, setShadows] = useState<ScrollShadowState>({
    showLeft: false,
    showRight: false,
    showTop: false,
    showBottom: false,
  });
  const rafRef = useRef<number>(undefined);

  const updateShadows = useCallback(() => {
    const el = tableRef.current;
    if (!el) return;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const {
        scrollLeft,
        scrollTop,
        scrollWidth,
        scrollHeight,
        clientWidth,
        clientHeight,
      } = el;
      const threshold = 2; // px threshold to avoid floating-point edge cases

      setShadows({
        showLeft: scrollLeft > threshold,
        showRight: scrollLeft + clientWidth < scrollWidth - threshold,
        showTop: scrollTop > threshold,
        showBottom: scrollTop + clientHeight < scrollHeight - threshold,
      });
    });
  }, [tableRef]);

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;

    updateShadows();

    el.addEventListener("scroll", updateShadows, { passive: true });
    const resizeObserver = new ResizeObserver(updateShadows);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", updateShadows);
      resizeObserver.disconnect();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [tableRef, updateShadows]);

  return shadows;
};
