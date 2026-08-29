export interface Release {
  version: string
  date: string
  changes: string[]
}

export const CHANGELOG: Release[] = [
  {
    version: 'v00.03.0006',
    date: '2026-08-26',
    changes: [
      'Added an explicit Time TBD workflow that keeps untimed Itinerary items attached to their dated day while disabling incomplete timestamp fields and Calendar inclusion.',
      'Made existing untimed, non-all-day rows automatically appear as Time TBD and corrected full-size itinerary printing to distinguish TBD from All Day.',
      'Moved the active untimed Jasper Skytram entry from Oct 9 to Oct 8 without restoring any reference-trip entries.',
      'Repaired new Itinerary-row creation so checked Calendar inclusion is persisted and queued for Update All when an exact start time exists.',
    ],
  },
  {
    version: 'v00.03.0005',
    date: '2026-08-26',
    changes: [
      'Added an at-a-glance gold Calendar Check icon to Itinerary rows marked for Google Calendar inclusion.',
      'Made the indicator follow the existing inclusion flag exactly, appearing after a checked row is saved and disappearing after it is unchecked and saved.',
      'Kept the indicator accessible and non-interactive so the existing row remains one forgiving touch target across Mac, iPad, and iPhone.',
    ],
  },
  {
    version: 'v00.03.0004',
    date: '2026-08-26',
    changes: [
      'Consolidated Vancouver and Kamloops into one Pacific timezone option so the Itinerary selector no longer resolves Kamloops to a duplicate Vancouver value.',
      'Consolidated Jasper, Lake Louise, and Banff into one Mountain timezone option to prevent the same duplicate-value selector defect.',
      'Preserved existing IANA timezone storage, timestamps, Google Calendar behavior, and 3×5 time formatting.',
    ],
  },
  {
    version: 'v00.03.0003',
    date: '2026-08-26',
    changes: [
      'Made deleted calendar-linked records remain pending until Update All removes their Google events, including flights, hotels, transportation, restaurants, itinerary rows, and checklist items.',
      'Made Calendar status and progress include dirty soft-deleted records while preventing deleted records from ever creating or updating remote events.',
      'Made Clear Calendar remove obsolete event IDs from deleted tombstones before queuing only included active records for rebuilding.',
      'Queued linked itinerary rows when deleting a whole day and repaired dirty-state handling for Itinerary edits and Checklist exclusion.',
      'Queued the previously deleted Arrive SEA itinerary event for removal during the next Update All.',
    ],
  },
  {
    version: 'v00.03.0002',
    date: '2026-08-26',
    changes: [
      'Repaired Clear Calendar for Helm\'s dedicated secondary Google calendars by deleting every paginated event while preserving the calendar itself.',
      'Preserved Add to Google Calendar selections, cleared obsolete event IDs, and queued every included active record for a complete Update All rebuild after clearing succeeds.',
      'Kept the Calendar modal open with a visible error and duplicate-submit protection when Google clearing fails.',
    ],
  },
  {
    version: 'v00.03.0001',
    date: '2026-08-26',
    changes: [
      'Added Seattle to the Itinerary start and end timezone choices.',
      'Made Itinerary entry cards display both date-correct timezone abbreviations when a timed entry crosses zones while retaining a compact single-zone format.',
      'Added end times and cross-zone abbreviations to Daily Itinerary 3×5 cards without changing the other reference-card categories.',
    ],
  },
  {
    version: 'v00.03.0000',
    date: '2026-08-25',
    changes: [
      'Completed the Canadian Rockies final-document reconciliation across Itinerary, Hotels, Transportation, Key Info, Checklist, Packing, Flights, and Restaurants while keeping each travel section independent.',
      'Corrected Overview and its API to exclude soft-deleted Packing, Checklist, and Key Info records so displayed counts and active-record totals remain aligned.',
      'Added dated Hotel attention items to Overview with direct navigation to each unresolved Kamloops accommodation record.',
    ],
  },
  {
    version: 'v00.02.0055',
    date: '2026-08-25',
    changes: [
      'Separated Itinerary from Flights, Hotels, Restaurants, and Transportation by removing their automatic read-only projections from the app.',
      'Limited Overview itinerary counts, 8.5×11 itinerary printing, and 3×5 Daily Itinerary cards to records explicitly stored in Itinerary.',
      'Removed the obsolete linked-itinerary endpoint, projection utility, and source-section refresh events while preserving each section\'s independent Calendar behavior.',
    ],
  },
  {
    version: 'v00.02.0054',
    date: '2026-08-25',
    changes: [
      'Added Copy Trip to each dashboard trip menu with an editable, responsive confirmation form and direct navigation to the new Draft.',
      'Copied active itinerary, travel sections, checklist, packing, Key Info, nearby dining, and trip memberships in one transactional database operation with all relational IDs remapped.',
      'Reset Google Calendar linkage and excluded deleted records, documents, logs, audit/import history, feedback, notifications, and generated Calendar records from copied trips.',
    ],
  },
  {
    version: 'v00.02.0053',
    date: '2026-08-25',
    changes: [
      'Repaired New Trip creation in localhost development-bypass mode by moving authentication and writes into a server endpoint.',
      'Added matching server-side required-field and date validation plus cleanup protection if advisor membership creation fails.',
      'Made creation and validation errors scroll into view in both the desktop modal and mobile bottom sheet.',
    ],
  },
  {
    version: 'v00.02.0052',
    date: '2026-08-25',
    changes: [
      'Added each itinerary day date to the front header of its 3×5 Daily Itinerary reference card.',
      'Used a compact weekday, month, and day format so the date remains legible without crowding the itinerary content.',
    ],
  },
  {
    version: 'v00.02.0051',
    date: '2026-08-24',
    changes: [
      'Added the current Helm version directly beneath the trip name and date range in the travel-data sidebar.',
      'Retained the existing version display on the dashboard and the trip-detail footer.',
    ],
  },
  {
    version: 'v00.02.0050',
    date: '2026-08-24',
    changes: [
      'Consolidated each Flight back into one Google Calendar event spanning departure through arrival, with both endpoint-local times in its responsive title.',
      'Applied one-time cleanup state for the separate arrival events created by v00.02.0048/0049 so the next Update All removes them without leaving orphan Calendar entries.',
      'Kept separate Flight departure and arrival entries in Helm Itinerary while limiting the Calendar representation to one authoritative event per Flight.',
    ],
  },
  {
    version: 'v00.02.0049',
    date: '2026-08-24',
    changes: [
      'Expanded Flight arrival Calendar titles to show the flight number, operating airline and parsed check-in instruction, departure airport and local time, and destination city and local arrival time.',
      'Used one comma-separated title so Google Calendar can wrap it across two lines when space permits while preserving the complete information in compact one-line views.',
      'Marked all four Calendar-included trip Flights for resync so Update All applies the revised arrival titles to their existing events.',
    ],
  },
  {
    version: 'v00.02.0048',
    date: '2026-08-24',
    changes: [
      'Automatically projected Flight departures and arrivals, Hotel check-ins and check-outs, Restaurant reservations, and Transportation pickups into the daily Itinerary without duplicating source records in itinerary_rows.',
      'Made projected itinerary entries read-only links to their owning source records, included them in Overview day counts and daily 3×5 cards, and added bounded mutation/focus refresh without Realtime subscriptions.',
      'Added independent All Day and Estimated timing controls for every projected occurrence and assigned each entry to the source location\'s local calendar date.',
      'Changed included Flights to create two Google Calendar events: a departure event spanning the actual flight and a 30-minute arrival marker; Hotel check-in/check-out and Restaurant events now use legible 30-minute blocks.',
      'Made Calendar unchecks remain dirty until Update All deletes the corresponding Google events and clears their stored IDs, with accurate two-event progress totals and visible activity messaging during waits.',
      'Applied the source metadata and dual Flight Calendar ID Supabase migration without a new table, new index pattern, high-frequency write path, or Realtime/WAL subscription.',
    ],
  },
  {
    version: 'v00.02.0047',
    date: '2026-08-24',
    changes: [
      'Expanded hotel Calendar event addresses to include the stored city, province/state, and postal/ZIP code for both check-in and check-out events.',
      'Centralized hotel address formatting so both event types consistently use the same complete mailing address.',
      'Marked the five active Calendar-included hotels for resync so their ten existing Google events can receive the complete addresses on the next Update All.',
    ],
  },
  {
    version: 'v00.02.0046',
    date: '2026-08-24',
    changes: [
      'Added Print Trip to the travel-data sidebar menu while retaining the same action on dashboard trip cards.',
      'Reused the repaired print modal and authenticated print route without restoring the former trip-detail data queries or removed CRUD actions.',
      'Mounted the print modal outside the sidebar and kept the action in the scrollable APP group to avoid the prior clipping and iOS fixed-footer failure modes.',
    ],
  },
  {
    version: 'v00.02.0045',
    date: '2026-08-23',
    changes: [
      'Renamed the Contacts reference-card option to Key Info and made it produce exactly one 3×5 card.',
      'Limited the Key Info card to active records explicitly included in Overview → Key Info, preserving their configured order.',
      'Excluded soft-deleted Key Info records from the Overview and print loaders so obsolete links no longer appear.',
    ],
  },
  {
    version: 'v00.02.0044',
    date: '2026-08-23',
    changes: [
      'Moved 3×5 reference-card data loading into the existing authenticated print route so cards no longer depend on silent browser-side Supabase queries.',
      'Preserved the exact-size html2canvas and jsPDF card engine, including the Epson-tested card margins, while adding visible preparation and card-by-card PDF progress.',
      'Added server-rendered flights, hotels, transportation, restaurants, contacts, and daily itinerary card modes with clear empty and error states.',
      'Fixed daily cards to load real itinerary days and include only the rows assigned to each day.',
      'Corrected both print layouts to read the canonical flight seat_number field so saved seat assignments appear instead of TBD or a dash.',
    ],
  },
  {
    version: 'v00.02.0043',
    date: '2026-07-21',
    changes: [
      'Corrected flight timezone handling so airport-local departure and arrival times are converted into real UTC instants before storage and Google Calendar sync.',
      'Updated Helm flight details and edit forms to render each stored instant in its departure or arrival airport timezone with the date-correct HST, PDT, PST, MDT, or MST abbreviation.',
      'Corrected all four Canadian Rockies flight records and marked the Calendar-included flights for resync; the Honolulu departure now represents Oct 3 at 11:30 PM HST rather than 1:30 PM HST.',
      'Applied the same airport-timezone conversion to future manual flight saves and document imports, and made cross-timezone flight validation compare actual instants.',
      'Fixed Clear Calendar so its next Update All rebuilds every Calendar-included flight, hotel, transportation, itinerary, and checklist record instead of leaving all non-flight records clean and omitted.',
      'Prevented the Calendar progress modal from hanging after a successful server-side sync by hardening SSE framing, adding a bounded inactivity timeout, and confirming completion from authoritative server status.',
    ],
  },
  {
    version: 'v00.02.0042',
    date: '2026-07-21',
    changes: [
      'Validated each trip’s stored Google Calendar before syncing so a deleted or inaccessible calendar can no longer produce a false success.',
      'Added recovery for a missing calendar by allowing a writable Google Calendar to be selected or a replacement calendar to be created, then rebuilding only Calendar-included trip items.',
      'Made Calendar status and Update All use the same strict eligibility rule: an item must be both included and dirty.',
      'Made sync progress truthful: failed Google or database operations are shown as errors, remain dirty, and prevent the last-synced timestamp and success state from being recorded.',
      'Preserved dirty state for hotel and checklist rows until every required event operation succeeds, and recreated individual events that were deleted directly in Google.',
    ],
  },
  {
    version: 'v00.02.0041',
    date: '2026-07-21',
    changes: [
      'Migrated the deprecated Next.js middleware file and function convention to proxy without changing its existing request-routing or authentication behavior.',
      'Pinned Next.js and its ESLint configuration to 16.2.5 so clean installs no longer drift to an unreviewed framework patch release.',
      'Synchronized npm package metadata with Helm\'s canonical v00.02.0041 release version.',
    ],
  },
  {
    version: 'v00.02.0037',
    date: '2026-06-03',
    changes: [
      'Bypassed the @supabase/ssr browser client singleton cache using isSingleton: false and a custom local module-level cache, resolving the experimental passkeys error warning.',
    ],
  },
  {
    version: 'v00.02.0036',
    date: '2026-06-03',
    changes: [
      'Enabled experimental passkey options on both client and server Supabase client constructors.',
    ],
  },
  {
    version: 'v00.02.0035',
    date: '2026-06-03',
    changes: [
      'Removed development bypass instructions box from the login form UI.',
    ],
  },
  {
    version: 'v00.02.0034',
    date: '2026-06-03',
    changes: [
      'Implemented global offline guard wrapping root layout children, removing redundant page-level overrides (HELM-54).',
      'Ported WebAuthn/Passkey Client utilities and setup passkey onboarding page (/auth/setup-passkey) from Orb (HELM-59).',
      'Added passkey authentication controls to the email login screen, conditionally rendered on production hostnames (HELM-59).',
      'Converted passwordless OTP validation from 8 digits to 6 digits to align with Orb standards (HELM-59).',
      'Upgraded @supabase/supabase-js and @supabase/ssr dependencies to support WebAuthn APIs (HELM-59).',
    ],
  },
  {
    version: 'v00.02.0033',
    date: '2026-06-03',
    changes: [
      'Implemented Phase 1 of ESLint remediation plan: ignored .claude/ worktrees, relaxed no-explicit-any and set-state-in-effect rules to warnings, and ran mechanical autofix.',
      'Created backlog tasks HELM-60 (Phase 2 hooks) and HELM-61 (Phase 3 TS any) and updated shared knowledge repository.',
    ],
  },
  {
    version: 'v00.02.0032',
    date: '2026-06-03',
    changes: [
      'Aligned project-specific AGENTS.md and HANDOFF.md with latest Orb workspace conventions, including environments, database health analysis, and session rules.',
    ],
  },
  {
    version: 'v00.02.0031',
    date: '2026-05-21',
    changes: [
      'Added version update system — Helm now detects new deployments and shows an update banner with a one-tap refresh.',
      'Added "What\'s New" changelog sheet accessible from the Help button.',
      'Disabled service worker caching in development to prevent stale asset issues.',
    ],
  },
  {
    version: 'v00.02.0027',
    date: '2026-05-21',
    changes: [
      'Fixed hydration mismatch on version labels by deferring render to client-side effect.',
    ],
  },
  {
    version: 'v00.02.0026',
    date: '2026-05-21',
    changes: [
      'Added scroll-to-error behavior on form validation failures.',
    ],
  },
]
