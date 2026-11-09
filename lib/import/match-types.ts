// Re-import: bookings already on the trip (docs/reimport-updates-plan.md).
// Shared by the matches route, the confirm route and the review page.
// Client-safe: types and constants only.

export type BookingSection = 'flights' | 'hotels' | 'transportation' | 'restaurants';

export const BOOKING_SECTIONS: readonly BookingSection[] = ['flights', 'hotels', 'transportation', 'restaurants'];

// Each imported record carries this key on the review page, so matches and
// decisions survive flag deletions that shift array positions.
export const IMPORT_KEY = '__import_key';

// Web page imports (docs/import-from-web-page-plan.md, Website links): a
// hotel, restaurant or transfer whose website is the imported page itself,
// because the page gave none. Such an address never replaces a website a
// booking already has.
export const WEBSITE_FROM_PAGE = '__website_from_page';
export const WEBSITE_SECTIONS = ['hotels', 'transportation', 'restaurants'] as const;

export interface FieldChange {
  field:   string;
  label:   string;
  oldText: string;
  newText: string;
}

export interface MatchCandidate {
  id:      string;
  label:   string;
  changes: FieldChange[];
}

export interface BookingMatch {
  key:        string;
  section:    BookingSection;
  title:      string;
  // same: one booking, nothing changed; changes: one booking, fields differ;
  // ambiguous: more than one booking matches (Stan chooses, D4).
  status:     'same' | 'changes' | 'ambiguous';
  candidates: MatchCandidate[];
}

// What the review page sends with Confirm for each matched booking.
export interface BookingDecision {
  key:     string;
  section: BookingSection;
  action:  'update' | 'skip' | 'add';
  id?:     string;
  fields?: string[];
}
