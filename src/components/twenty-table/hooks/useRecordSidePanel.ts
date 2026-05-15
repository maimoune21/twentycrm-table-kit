/**
 * @deprecated — Use useSidePanelMenu, useNavigateSidePanel, useSidePanelHistory,
 *   useOpenRecordInSidePanel from "../side-panel/hooks" instead.
 *
 * Thin compatibility wrapper kept for legacy consumers.
 */
import { useAtomValue } from "jotai";
import {
  isSidePanelOpenedAtom,
  sidePanelRecordIdAtom,
  sidePanelPageAtom,
  sidePanelNavigationStackAtom,
} from "../side-panel/states";
import {
  useSidePanelMenu,
  useOpenRecordInSidePanel,
  useSidePanelHistory,
} from "../side-panel/hooks";

export const useRecordSidePanel = () => {
  const isOpen = useAtomValue(isSidePanelOpenedAtom);
  const activeRecordId = useAtomValue(sidePanelRecordIdAtom);
  const sidePanelPage = useAtomValue(sidePanelPageAtom);
  const navigationStack = useAtomValue(sidePanelNavigationStackAtom);

  const { openSidePanelMenu, closeSidePanelMenu, toggleSidePanelMenu } =
    useSidePanelMenu();
  const { openRecordInSidePanel: _openRecord } = useOpenRecordInSidePanel();
  const { goBackFromSidePanel } = useSidePanelHistory();

  const openRecordInSidePanel = (recordId: string) =>
    _openRecord({ recordId });

  return {
    isOpen,
    activeRecordId,
    sidePanelPage,
    navigationStack,
    openRecordInSidePanel,
    openCommandMenu: openSidePanelMenu,
    toggleCommandMenu: toggleSidePanelMenu,
    closeSidePanel: closeSidePanelMenu,
    goBack: goBackFromSidePanel,
    setIsOpen: () => {}, // Deprecated, use useSidePanelMenu directly
  };
};
