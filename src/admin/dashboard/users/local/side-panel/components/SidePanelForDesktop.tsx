import { useEffect, useState, useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  isSidePanelOpenedAtom,
  isSidePanelClosingAtom,
  sidePanelWidthAtom,
} from "../states";
import {
  useSidePanelMenu,
  useSidePanelCloseCleanup,
} from "../hooks";
import {
  SIDE_PANEL_CONSTRAINTS,
  SIDE_PANEL_WIDTH_VAR,
  SIDE_PANEL_GAP_WIDTH,
  SIDE_PANEL_ANIMATION,
} from "../constants";
import { SidePanelRouter } from "./SidePanelRouter";

/**
 * SidePanelForDesktop — Twenty CRM exact reproduction
 *
 * Architecture (from Twenty source):
 * - CSS transition on wrapper width (not framer-motion)
 * - Aside with border, border-radius, bg, flex column
 * - ResizablePanelGap (8px drag handle on the left)
 * - SidePanelWidthEffect syncs CSS variable
 * - ModalContainerContext for dropdowns inside panel
 * - Content rendered via SidePanelRouter
 */
export const SidePanelForDesktop = () => {
  const isSidePanelOpened = useAtomValue(isSidePanelOpenedAtom);
  const isSidePanelClosing = useAtomValue(isSidePanelClosingAtom);
  const [sidePanelWidth, setSidePanelWidth] = useAtom(sidePanelWidthAtom);
  const { closeSidePanelMenu } = useSidePanelMenu();
  const { sidePanelCloseCleanup } = useSidePanelCloseCleanup();

  const [isResizing, setIsResizing] = useState(false);
  const [shouldRenderContent, setShouldRenderContent] =
    useState(isSidePanelOpened);

  const shouldShowContent = isSidePanelOpened || shouldRenderContent;

  // ── Sync CSS variable ──
  useEffect(() => {
    document.documentElement.style.setProperty(
      SIDE_PANEL_WIDTH_VAR,
      `${sidePanelWidth}px`,
    );
  }, [sidePanelWidth]);

  // ── Handle transition end ──
  const handleTransitionEnd = useCallback(() => {
    if (isSidePanelOpened) {
      setShouldRenderContent(true);
    } else {
      setShouldRenderContent(false);
      if (isSidePanelClosing) {
        sidePanelCloseCleanup();
      }
    }
  }, [isSidePanelOpened, isSidePanelClosing, sidePanelCloseCleanup]);

  // ── Resize drag handle ──
  const handleResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsResizing(true);
      const startX = e.clientX;
      const startWidth = sidePanelWidth;

      const onMove = (moveEvent: PointerEvent) => {
        // Moving left increases panel width (panel is on the right)
        const diff = startX - moveEvent.clientX;
        const newWidth = Math.max(
          SIDE_PANEL_CONSTRAINTS.min,
          Math.min(SIDE_PANEL_CONSTRAINTS.max, startWidth + diff),
        );
        setSidePanelWidth(newWidth);
        document.documentElement.style.setProperty(
          SIDE_PANEL_WIDTH_VAR,
          `${newWidth}px`,
        );
      };

      const onUp = () => {
        setIsResizing(false);
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [sidePanelWidth, setSidePanelWidth],
  );

  // ── Collapse on double-click ──
  const handleCollapseOnDoubleClick = useCallback(() => {
    closeSidePanelMenu();
    setIsResizing(false);
  }, [closeSidePanelMenu]);

  return (
    <>
      {/* ResizablePanelGap — 8px drag handle (Twenty: left side of panel) */}
      <div
        onPointerDown={handleResizeStart}
        onDoubleClick={handleCollapseOnDoubleClick}
        className="shrink-0 h-full cursor-col-resize select-none"
        style={{
          width: isSidePanelOpened ? SIDE_PANEL_GAP_WIDTH : 0,
          transition: isResizing ? "none" : `width ${SIDE_PANEL_ANIMATION.duration}s`,
        }}
      >
        {/* Visual drag indicator */}
        <div className="w-full h-full flex items-center justify-center group">
          <div
            className={`w-0.5 h-8 rounded-full transition-colors ${
              isResizing
                ? "bg-blue-500"
                : "bg-transparent group-hover:bg-gray-300 dark:group-hover:bg-gray-600"
            }`}
          />
        </div>
      </div>

      {/* Panel wrapper — animated width via CSS transition (Twenty pattern) */}
      <div
        className="shrink-0 min-w-0 overflow-hidden"
        style={{
          width: isSidePanelOpened ? `var(${SIDE_PANEL_WIDTH_VAR})` : "0px",
          transition: isResizing
            ? "none"
            : `width ${SIDE_PANEL_ANIMATION.duration}s`,
          flexShrink: 0,
          height: "100%",
        }}
        onTransitionEnd={handleTransitionEnd}
        data-side-panel=""
      >
        {/* Aside panel — Twenty: border, border-radius, bg, flex column */}
        <aside
          className="flex flex-col h-full w-full overflow-hidden relative box-border
            bg-white dark:bg-gray-900
            border border-gray-200 dark:border-gray-700
            rounded-lg"
        >
          {/* Modal container overlay (for dropdowns inside panel) */}
          <div className="absolute inset-0 pointer-events-none z-1" />

          {/* Panel content */}
          {shouldShowContent && <SidePanelRouter />}
        </aside>
      </div>
    </>
  );
};