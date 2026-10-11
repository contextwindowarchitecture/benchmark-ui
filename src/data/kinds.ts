// The kinds every domain's producer writes in the same frame (a run's index, manifest, findings,
// drift report, blob index): each domain keys its own (`manifest`, `d2/manifest`), and a page
// shared by the domains asks for the kind in the domain it is showing. A kind name that a domain
// does not write is a type error, not a request that fails.

import type { DocumentByKind, SchemaDomain, SchemaKind } from "./schema/generated"

/** A domain's key for a kind its producer writes under that name. */
export type KindIn<D extends SchemaDomain, K extends string> = Extract<
  D extends "d1" ? K : `${D}/${K}`,
  SchemaKind
>

/** The documents of one kind name across every domain that writes it. */
export type DocumentIn<K extends string> = DocumentByKind[KindIn<SchemaDomain, K>]

export function kindIn<D extends SchemaDomain, K extends string>(domain: D, kind: K): KindIn<D, K> {
  return (domain === "d1" ? kind : `${domain}/${kind}`) as KindIn<D, K>
}
