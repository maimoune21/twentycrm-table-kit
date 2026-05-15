import { useAtomValue } from "jotai";
import { rowHeightSizeAtom } from "../states";
import { RECORD_TABLE_ROW_HEIGHTS } from "../constants";

export const useRowHeight = () => {
  const size = useAtomValue(rowHeightSizeAtom);
  return RECORD_TABLE_ROW_HEIGHTS[size];
};
