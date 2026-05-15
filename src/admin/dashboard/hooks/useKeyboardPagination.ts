import { useEffect } from "react";

export function useKeyboardPagination(
  pageIndex: number,
  maxPage: number,
  setPageIndex: (page: number) => void,
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowRight") {
        e.preventDefault();
        if (pageIndex < maxPage - 1) setPageIndex(pageIndex + 1);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowLeft") {
        e.preventDefault();
        if (pageIndex > 0) setPageIndex(pageIndex - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pageIndex, maxPage, setPageIndex]);
}
