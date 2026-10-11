// Every domain's row kinds, for the rows store, its worker and the rows hook (ui-plan.md 5.4): a
// kind is Domain 1's or Domain 2's, and its domain's module says how its rows fill the fields the
// store keys on. A page of one domain names only its own kinds.

import { isRowKind, rowFields, type RowKind, type RowOf } from "@/features/d1/model/row-kinds"
import {
  d2RowFields,
  isD2RowKind,
  type D2RowKind,
  type D2RowOf,
} from "@/features/d2/model/row-kinds"

import type { RowFields } from "./row-fields"
import type { DocumentByKind } from "./schema/generated"

export type AnyRowKind = RowKind | D2RowKind

export type AnyRowOf<K extends AnyRowKind> = DocumentByKind[K]

export function isAnyRowKind(kind: string): kind is AnyRowKind {
  return isRowKind(kind) || isD2RowKind(kind)
}

export function anyRowFields(kind: AnyRowKind, row: AnyRowOf<AnyRowKind>): RowFields {
  if (isD2RowKind(kind)) return d2RowFields(kind, row as D2RowOf<D2RowKind>)
  return rowFields(kind, row as RowOf<RowKind>)
}
