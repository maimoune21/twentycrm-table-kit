/**
 * Side Panel Constants — Twenty CRM specifications
 */

// ── Focus & Instance IDs ──
export const SIDE_PANEL_FOCUS_ID = "side-panel-focus";
export const SIDE_PANEL_COMPONENT_INSTANCE_ID = "side-panel";
export const SIDE_PANEL_SELECTABLE_LIST_ID = "side-panel-list";

// ── Layout Dimensions ──
export const SIDE_PANEL_TOP_BAR_HEIGHT = 40;
export const SIDE_PANEL_LIST_PADDING = 2;
export const SIDE_PANEL_GAP_WIDTH = 8;

// ── Size Constraints ──
export const SIDE_PANEL_CONSTRAINTS = {
  min: 320,
  max: 600,
  default: 400,
} as const;

// ── CSS Variable ──
export const SIDE_PANEL_WIDTH_VAR = "--side-panel-width";

// ── Animation ──
export const SIDE_PANEL_ANIMATION = {
  duration: 0.3, // seconds
  stiffness: 300,
  damping: 30,
} as const;
