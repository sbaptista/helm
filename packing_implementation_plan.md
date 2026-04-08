# Implement Packing Section

This plan covers the end-to-end implementation of the new Packing feature as described in `Helm_Instructions_Apr07c_AI.md`.

## User Review Required

### Step 5: Register the Section — Answers to Your Pre-computation Query
You asked to identify how `ChecklistSection` and `TransportationSection` are imported and rendered. I have found the files:

1. **Top-Level Page** (`app/advisor/trips/[id]/page.tsx`):
   - **Import**: `import { ChecklistSection } from '@/components/sections/ChecklistSection';`
   - **Prop Passing**: `checklistContent={<ChecklistSection tripId={id} />}` 
   - *(Note: `PackingSection` is actually already imported here and passed as `packingContent` in the codebase exactly alongside the others.)*

2. **Tab Navigation Component** (`components/advisor/TripDetailView.tsx`):
   - **Tab List**:
     ```tsx
     const TABS = [
       'Itinerary', 'Flights', 'Hotels', 'Transportation', 
       'Restaurants', 'Checklist', 'Packing', 'Key Info',
     ] as const;
     ```
   - **Conditional Rending Block**:
     ```tsx
     const tabContents: Partial<Record<Tab, React.ReactNode>> = {
       Itinerary:      itineraryContent,
       Flights:        flightsContent,
       Hotels:         hotelsContent,
       Transportation: transportationContent,
       Restaurants:    restaurantsContent,
       Checklist:      checklistContent,
       Packing:        packingContent, // Already exists!
       'Key Info':     keyInfoContent,
     };
     ```
**Conclusion:** `PackingSection` is beautifully already fully integrated into the tabs and layout architecture. We will simply satisfy the `<PackingSection tripId={id} />` render requirement by creating the file `components/sections/PackingSection.tsx`.

## Proposed Changes

### Database Setup
- Execute the provided SQL via `run_command` and Supabase CLI (or manually instruct you to run it through the Supabase Editor). This will create `packing_groups`, `packing_subgroups`, and `packing` tables, along with Row Level Security (RLS) policies.
- Run the requested verification SQL block to ensure column names are exactly as expected.

### Seed Script
#### [NEW] seed-packing.js
- Create a script that initializes a Supabase client using `@supabase/supabase-js`.
- Provide the structured 81 items for `stan` and write them to the new tables via looping logic and tracking `sort_order` incrementation.
- NOTE: The instructions say to reference `seed-from-can26.js`, but this file doesn't seem to exist in the repository on disk. I will use standard process.env checks or expect standard CLI arguments for the trip ID.

### API Routes
Create 7 new API routes handling robust CRUD and hierarchical grouping:

#### [NEW] app/api/trips/[id]/packing/route.ts
#### [NEW] app/api/packing/[id]/route.ts
- Implement dynamic GET, POST, PATCH, DELETE operations verifying permissions with `trip_members` checks.

#### [NEW] app/api/trips/[id]/packing-groups/route.ts
#### [NEW] app/api/packing-groups/[id]/route.ts
- Routes for the top-level grouping system per person on a trip.

#### [NEW] app/api/trips/[id]/packing-subgroups/route.ts
#### [NEW] app/api/packing-subgroups/[id]/route.ts
- Provide the nested subgroup layer logic.

#### [NEW] app/api/trips/[id]/packing-reset/route.ts
- Add the `POST` route to toggle `packed = false` for all a person's entries.

### User Interface Components
Following the exact structures of `TransportationClient.tsx`:

#### [NEW] components/sections/PackingSection.tsx
- A server side skeleton performing concurrent Supabase fetches for items, groups, and subgroups then flowing down `initialItems` etc to the Client.

#### [NEW] components/sections/PackingClient.tsx
- Add local React state corresponding to three BottomSheets (Item, Categories, Subcategories).
- Fully implement `toggleOwned`, `togglePacked`, drag-sort simulations with `moveCategoryUp`/`Down`.
- Implement `renderItem` providing Gold Standard aesthetic parity with `globals.css` color vars (`--gold`, `--navy`).

### Globals Update
#### [MODIFY] app/globals.css
- Inject `.pack-tabs`, `.pack-group`, `.pack-subgroup`, and custom interactive checkbox (`.pack-cb`) styling into the global stylesheet.

### Version Management
#### [MODIFY] lib/version.ts
- Bump `VERSION` from `00.01.0052` to `00.01.0053`.

## Open Questions
- You indicated to run the SQL in the "Supabase SQL Editor". I do not have direct access to your Supabase web dashboard. Should I just assume the schema has been successfully run, or do you want me to attempt running the migrations locally over API if you provide connection strings?
- `seed-from-can26.js` wasn't found in the workspace root. Can I just write the seed script expecting `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to be in `.env.local` and for the `trip_id` to be passed as an argument (`node seed-packing.js <trip_uuid>`)?

## Verification Plan
### Automated Tests
- Validate TypeScript compilation of the new robust UI elements.

### Manual Verification
- Ask the user to verify by creating a new `Packing` list item on a trip view and ensuring the hierarchy stores to the database correctly.
