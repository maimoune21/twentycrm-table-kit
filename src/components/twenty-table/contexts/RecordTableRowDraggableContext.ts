import { createContext, useContext } from "react";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";

export type RecordTableRowDraggableContextValue = {
  isDragging: boolean;
  dragHandleProps: DraggableProvidedDragHandleProps | null;
};

export const RecordTableRowDraggableContext =
  createContext<RecordTableRowDraggableContextValue>({
    isDragging: false,
    dragHandleProps: null,
  });

export const useRecordTableRowDraggableContext = () =>
  useContext(RecordTableRowDraggableContext);
