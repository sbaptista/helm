# Helm Instructions — Apr07c — Stan

## What's being built
Packing section — three new database tables, seed script for Stan's 81 items, 7 API routes, 2 UI components.

---

## Step 1: Run SQL in Supabase

Open the Supabase SQL Editor and run the SQL block from the AI instructions. It creates `packing_groups`, `packing_subgroups`, and `packing` tables with full RLS policies.

---

## Step 2: Run the seed script

Once the AI has created `seed-packing.js` at the project root:

```
node seed-packing.js
```

Confirm output shows all 5 groups, ~9 subgroups, and 81 items seeded without errors.

---

## Step 3: Git push

After the AI confirms all files are placed and version is bumped to `00.01.0053`:

```
git add . && git commit -m "Packing section: tables, seed, API routes, UI" && git push
```

---

## Step 4: Verify on Vercel

After deploy:

1. Open the trip in Helm
2. Navigate to Packing
3. Confirm Stan tab shows items grouped by category and sub-category
4. Confirm Cathy tab is empty
5. Tap owned checkbox on an item — should turn gold
6. Tap packed checkbox on an item — should turn navy, item dims
7. Tap an item row — BottomSheet opens with correct values
8. Open Manage Categories — confirm 5 categories in correct order (Clothes, Bags, Toiletries & Tech, Meds, Support)
9. Open Manage Sub-groups on Clothes — confirm 6 sub-groups (Flights, Outer, Tops, Bottoms, Underwear, Socks)
10. Confirm version shows `00.01.0053`
