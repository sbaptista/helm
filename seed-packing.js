const fs = require('fs');
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  });
} catch (e) {
  console.log("Could not read .env.local, assuming environment variables are set.");
}
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

const tripId = process.argv[2];
if (!tripId) {
  console.error("Error: Missing trip_id argument. Usage: node seed-packing.js <trip_uuid>");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ── DATA ──────────────────────────────────────────────────────────────────────

// Category order from CAN26 stanCatOrder
const STAN_GROUPS = [
  { name: 'Clothes',           sort_order: 1 },
  { name: 'Bags',              sort_order: 2 },
  { name: 'Toiletries & Tech', sort_order: 3 },
  { name: 'Meds',              sort_order: 4 },
  { name: 'Support',           sort_order: 5 },
]

// Subgroup order from CAN26 stanSubOrder
// Only groups that have subgroups are listed here
const STAN_SUBGROUPS = {
  'Clothes': [
    { name: 'Flights',    sort_order: 1 },
    { name: 'Outer',      sort_order: 2 },
    { name: 'Tops',       sort_order: 3 },
    { name: 'Bottoms',    sort_order: 4 },
    { name: 'Underwear',  sort_order: 5 },
    { name: 'Socks',      sort_order: 6 },
  ],
  'Toiletries & Tech': [
    { name: 'Backpack',          sort_order: 1 },
    { name: 'Personal Carryon',  sort_order: 2 },
    { name: 'Always Available',  sort_order: 3 },
  ],
}

// Items: [group_name, subgroup_name | null, text, owned, packed]
// sort_order is assigned by position within each group+subgroup
const STAN_ITEMS = [
  // ── Bags (no subgroups) ──────────────────────────────────────────────────
  ['Bags', null, 'Patagonia Black Hole 30L',  true,  false],
  ['Bags', null, 'Peak Design backpack?',     false, false],

  // ── Clothes / Flights ────────────────────────────────────────────────────
  ['Clothes', 'Flights', 'Short sleeve merino',                  true, false],
  ['Clothes', 'Flights', 'Black tech pants',                     true, false],
  ['Clothes', 'Flights', 'Merino hoodie — lashed to Patagonia', true, false],
  ['Clothes', 'Flights', 'Black belt',                           true, false],
  ['Clothes', 'Flights', 'Compression socks',                    true, false],
  ['Clothes', 'Flights', 'Skechers',                             true, false],

  // ── Clothes / Outer ──────────────────────────────────────────────────────
  ['Clothes', 'Outer', 'Green belt (packed)',                    false, false],
  ['Clothes', 'Outer', 'Winter cap — Alpaca',              true,  false],
  ['Clothes', 'Outer', 'Scarf — Alpaca',                   true,  false],
  ['Clothes', 'Outer', 'Packable winter jacket — Uniqlo',  true,  false],
  ['Clothes', 'Outer', 'Raincoat',                              true,  false],
  ['Clothes', 'Outer', 'Packable travel cap',                   true,  false],
  ['Clothes', 'Outer', 'House slippers',                        true,  false],

  // ── Clothes / Tops ───────────────────────────────────────────────────────
  ['Clothes', 'Tops', 'Merino wool T-shirts (2)',                         false, false],
  ['Clothes', 'Tops', 'Merino wool long sleeve (2)',                      true,  false],
  ['Clothes', 'Tops', 'T-shirts for hotel room (1 or 2)',                 true,  false],
  ['Clothes', 'Tops', 'Long sleeve shirt — suitable for dining (white)', true, false],
  ['Clothes', 'Tops', 'Grey sweater',                                     true,  false],

  // ── Clothes / Bottoms ────────────────────────────────────────────────────
  ['Clothes', 'Bottoms', 'Green pants',   true,  false],
  ['Clothes', 'Bottoms', 'Sweat pants',   false, false],

  // ── Clothes / Underwear ──────────────────────────────────────────────────
  ['Clothes', 'Underwear', 'Underwear (9 pair)', true, false],

  // ── Clothes / Socks ──────────────────────────────────────────────────────
  ['Clothes', 'Socks', 'Darn Tough socks', true, false],
  ['Clothes', 'Socks', 'Alpaca socks',     true, false],
  ['Clothes', 'Socks', 'Black socks',      true, false],
  ['Clothes', 'Socks', 'Red socks',        true, false],
  ['Clothes', 'Socks', 'Purple socks',     true, false],

  // ── Meds (no subgroups) ──────────────────────────────────────────────────
  ['Meds', null, 'Check w/ Cathy', true, false],

  // ── Toiletries & Tech / Backpack ─────────────────────────────────────────
  ['Toiletries & Tech', 'Backpack', 'Nail clippers',               true, false],
  ['Toiletries & Tech', 'Backpack', 'Deodorant (Nature, unscented)', true, false],
  ['Toiletries & Tech', 'Backpack', '1-Drop',                       true, false],
  ['Toiletries & Tech', 'Backpack', 'Comb',                         true, false],
  ['Toiletries & Tech', 'Backpack', 'Q-tips',                       true, false],
  ['Toiletries & Tech', 'Backpack', 'Hand sanitizer',               true, false],
  ['Toiletries & Tech', 'Backpack', 'Toothbrush',                   true, false],
  ['Toiletries & Tech', 'Backpack', 'Toothpaste',                   true, false],
  ['Toiletries & Tech', 'Backpack', 'Mouthwash',                    true, false],
  ['Toiletries & Tech', 'Backpack', 'Mouth guard',                  true, false],
  ['Toiletries & Tech', 'Backpack', 'Mask',                         true, false],
  ['Toiletries & Tech', 'Backpack', 'Small tissue packet',          true, false],
  ['Toiletries & Tech', 'Backpack', 'Band-aids',                    true, false],
  ['Toiletries & Tech', 'Backpack', 'Shaver',                       true, false],
  ['Toiletries & Tech', 'Backpack', 'Blades',                       true, false],
  ['Toiletries & Tech', 'Backpack', 'Shaving soap',                 true, false],
  ['Toiletries & Tech', 'Backpack', 'Wet Ones',                     true, false],
  ['Toiletries & Tech', 'Backpack', 'Floss',                        true, false],
  ['Toiletries & Tech', 'Backpack', 'Blistex',                      true, false],
  ['Toiletries & Tech', 'Backpack', 'Device wipes',                 true, false],

  // ── Toiletries & Tech / Personal Carryon ────────────────────────────────
  ['Toiletries & Tech', 'Personal Carryon', '1-Drop',         true, false],
  ['Toiletries & Tech', 'Personal Carryon', 'Hand sanitizer', true, false],
  ['Toiletries & Tech', 'Personal Carryon', 'Masks (2)?',     true, false],
  ['Toiletries & Tech', 'Personal Carryon', 'Blistex',        true, false],
  ['Toiletries & Tech', 'Personal Carryon', 'Mouthwash',      true, false],

  // ── Toiletries & Tech / Always Available ─────────────────────────────────
  ['Toiletries & Tech', 'Always Available', 'Magsafe iPhone battery',          false, false],
  ['Toiletries & Tech', 'Always Available', '3 ft C-to-C cable',               false, false],
  ['Toiletries & Tech', 'Always Available', 'USB-C outlet plug (iPhone)',       false, false],
  ['Toiletries & Tech', 'Always Available', 'Watch Magsafe charger',           false, false],
  ['Toiletries & Tech', 'Always Available', 'USB-A outlet plug (Watch)',        false, false],
  ['Toiletries & Tech', 'Always Available', 'Microfiber glasses-cleaning cloth', false, false],

  // ── Support (no subgroups) ───────────────────────────────────────────────
  ['Support', null, 'FOLDER WITH PRINTED DOCUMENTS',                     false, false],
  ['Support', null, "Canada currency ($40 in 5's and 10's)",              false, false],
  ['Support', null, 'Microfiber glasses-cleaning cloth',                  false, false],
  ['Support', null, 'AirPod Pro strap',                                   false, false],
  ['Support', null, 'Car key (not needed if cab to/from airport)',         false, false],
  ['Support', null, 'Condo key as backup (only one needs to bring)',       false, false],
  ['Support', null, 'Do NOT bring car FOB',                               false, false],
  ['Support', null, 'Contigo mug (water)',                                false, false],
  ['Support', null, 'Wet wipes',                                          false, false],
  ['Support', null, 'Detergent strips',                                   false, false],
  ['Support', null, 'Light waterproof bags',                              false, true],
  ['Support', null, 'Bags for dirty clothes',                             false, false],
  ['Support', null, 'Band-aids (in EB bag)',                              false, false],
  ['Support', null, 'AirTags + holders',                                  false, false],
  ['Support', null, 'Dry/wet pouches (waterproof bags)',                  false, false],
  ['Support', null, 'Travel wash cloths',                                 false, false],
  ['Support', null, 'Covid test kits',                                    false, false],
  ['Support', null, 'ID cards for luggage',                               false, false],
  ['Support', null, 'Downloaded movies for flights',                      false, false],
  ['Support', null, 'Wall outlet multiplug (flat profile)',                false, false],
  ['Support', null, 'Passport',                                           false, false],
]

// ── SEED ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('Seeding packing groups...')
  const groupIdMap = {} // group_name => uuid

  for (const g of STAN_GROUPS) {
    const { data, error } = await supabase
      .from('packing_groups')
      .insert({ trip_id: tripId, person: 'stan', name: g.name, sort_order: g.sort_order })
      .select('id')
      .single()
    if (error) {
      console.error(error);
      throw error;
    }
    groupIdMap[g.name] = data.id
    console.log(`  Group: ${g.name} → ${data.id}`)
  }

  console.log('Seeding packing subgroups...')
  const subgroupIdMap = {} // `${group_name}::${sub_name}` => uuid

  for (const [groupName, subs] of Object.entries(STAN_SUBGROUPS)) {
    for (const s of subs) {
      const { data, error } = await supabase
        .from('packing_subgroups')
        .insert({
          trip_id: tripId,
          group_id: groupIdMap[groupName],
          person: 'stan',
          name: s.name,
          sort_order: s.sort_order,
        })
        .select('id')
        .single()
      if (error) {
        console.error(error);
        throw error;
      }
      subgroupIdMap[`${groupName}::${s.name}`] = data.id
      console.log(`  Subgroup: ${groupName} / ${s.name} → ${data.id}`)
    }
  }

  console.log('Seeding packing items...')
  // Track sort_order per group+subgroup bucket
  const sortCounters = {}

  for (const [groupName, subName, text, owned, packed] of STAN_ITEMS) {
    const bucketKey = `${groupName}::${subName ?? '__none__'}`
    if (!sortCounters[bucketKey]) sortCounters[bucketKey] = 1
    const sort_order = sortCounters[bucketKey]++

    const group_id = groupIdMap[groupName]
    const subgroup_id = subName ? (subgroupIdMap[`${groupName}::${subName}`] ?? null) : null

    const { error } = await supabase
      .from('packing')
      .insert({ trip_id: tripId, person: 'stan', group_id, subgroup_id, text, owned, packed, sort_order })
    if (error) {
      console.error(error);
      throw error;
    }
    console.log(`  Item: ${text}`)
  }

  console.log('Done. Seeded Stan packing data successfully.')
}

seed().catch(err => { console.error(err); process.exit(1) })
