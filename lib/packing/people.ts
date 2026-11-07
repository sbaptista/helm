// Whose packing lists Helm shows. Client- and server-safe.
//
// Cathy is hidden (Stan, 2026-11-06: not used). Nothing of hers is removed:
// the 'cathy' value, her rows and the APIs that accept her all stay, so she
// can come back as part of a real Users feature. To show her again, add
// 'cathy' to VISIBLE_PACKING_PEOPLE; the Packing tabs, Copy to Trip, Move /
// Copy, Overview counts, Print and Search all follow this list.

export const PACKING_PEOPLE = ['stan', 'cathy'] as const;
export type PackingPerson = (typeof PACKING_PEOPLE)[number];

export const VISIBLE_PACKING_PEOPLE: readonly PackingPerson[] = ['stan'];

export function isVisiblePackingPerson(person: unknown): person is PackingPerson {
  return typeof person === 'string' && (VISIBLE_PACKING_PEOPLE as readonly string[]).includes(person);
}
