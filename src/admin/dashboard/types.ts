/**
 * Shared types for Admin V2 pages using twenty-table.
 * All admin list pages (recruteurs, candidats, entreprises, etc.) share these.
 */

import type { ColumnDefinition, RecordData } from "@/components/twenty-table";

// ── Admin entity actions ──

export type AdminAction =
  | "consulter"
  | "modifier"
  | "activer"
  | "desactiver"
  | "supprimer"
  | "passerEnCandidat";

export type AdminActionHandler<T = RecordData> = (
  action: AdminAction,
  record: T,
) => void;

// ── Column definition with admin-specific extensions ──

export type AdminColumnDefinition = ColumnDefinition & {
  /** Whether this column value is editable inline */
  isEditable?: boolean;
  /** Determines which API call to use for editing (e.g. "user" | "recruteur") */
  editTarget?: "user" | "entity";
  /** Field name to send to the API (may differ from fieldName) */
  apiFieldName?: string;
  /** Marks columns rendered via page-specific custom cell logic */
  customRender?: boolean;
};

// ── Record with admin metadata ──

export type AdminRecordData = RecordData & {
  /** Raw API response data for accessing nested fields */
  _raw?: Record<string, unknown>;
  /** User ID associated with this record */
  _userId?: number;
  /** Entity-specific ID (recruteur ID, candidat ID, etc.) */
  _entityId?: number;
};

// ── Admin page configuration ──

export type AdminPageConfig = {
  /** Page title (e.g. "Recruteurs") */
  title: string;
  /** Icon for the page header */
  icon?: React.ReactNode;
  /** Singular entity name for dialogs (e.g. "recruteur") */
  entityName: string;
  /** Plural entity name */
  entityNamePlural: string;
  /** Query key prefix for React Query invalidation */
  queryKeyPrefix: string;
};

// ── Pagination state ──

export type PaginationState = {
  pageIndex: number;
  pageSize: number;
};
