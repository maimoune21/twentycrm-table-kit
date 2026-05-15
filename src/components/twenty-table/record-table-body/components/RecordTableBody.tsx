import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "framer-motion";
import { RecordTableRow } from "../../record-table-row/components/RecordTableRow";
import { RecordTableNewRow } from "../../record-table-row/components/RecordTableNewRow";
import { isPendingNewRowAtom } from "../../states";
import type { RecordData } from "../../types";

type RecordTableBodyProps = {
  records: RecordData[];
  onDragEnd: (result: DropResult) => void;
  onCreateRecord?: (data: Record<string, unknown>) => Promise<boolean>;
  onCancelCreate?: () => void;
};

const rowVariants = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -20, height: 0, overflow: "hidden" as const },
};

export const RecordTableBody = ({
  records,
  onDragEnd,
  onCreateRecord,
  onCancelCreate,
}: RecordTableBodyProps) => {
  const isPendingNewRow = useAtomValue(isPendingNewRowAtom);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="record-table-body" type="ROW">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              flex flex-col
              ${snapshot.isDraggingOver ? "bg-blue-50/20 dark:bg-blue-900/5" : ""}
            `}
          >
            {/* New row creation at top */}
            <AnimatePresence>
              {isPendingNewRow && onCreateRecord && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <RecordTableNewRow
                    onSave={onCreateRecord}
                    onCancel={onCancelCreate || (() => {})}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {records.map((record, index) => (
                <motion.div
                  key={record.id}
                  variants={rowVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  layout={false}
                >
                  <RecordTableRow
                    recordId={record.id}
                    rowIndex={isPendingNewRow ? index + 1 : index}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};
