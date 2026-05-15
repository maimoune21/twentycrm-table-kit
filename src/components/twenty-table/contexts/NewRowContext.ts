import { createContext, useContext } from "react";

/**
 * Context for the new row being created.
 * Provides a way to update pending data without needing a recordId.
 */
type NewRowContextType = {
  pendingData: Record<string, unknown>;
  onFieldChange: (fieldName: string, value: unknown) => void;
  /** Loading state during save */
  isLoading: boolean;
  /** Validation errors per field */
  validationErrors: Record<string, string>;
  /** Fields that have been touched (focused and blurred) */
  touchedFields: Set<string>;
  /** Mark a field as touched */
  markFieldTouched: (fieldName: string) => void;
  /** Required field names */
  requiredFields: string[];
};

export const NewRowContext = createContext<NewRowContextType | null>(null);

export const useNewRowContext = () => {
  const ctx = useContext(NewRowContext);
  if (!ctx) {
    throw new Error(
      "useNewRowContext must be used within NewRowContext.Provider",
    );
  }
  return ctx;
};
