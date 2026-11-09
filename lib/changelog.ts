export interface Release {
  version: string
  date: string
  changes: string[]
}

export const CHANGELOG: Release[] = [
  {
    version: 'v00.04.0068',
    date: '2026-11-08',
    changes: [
      'Import review fits narrow and zoomed-in windows: the trip name shortens and the Confirm button wraps instead of slipping off the right edge.',
      'Re-importing a restaurant or hotel with no date or confirmation number (a website, or a possibility you haven\'t booked) now finds the one already on the trip by name or website and offers updates, instead of adding a duplicate.',
      'Imported hotels and restaurants get their map link and map picture straight away, without opening and saving them.',
    ],
  },
  {
    version: 'v00.04.0067',
    date: '2026-11-08',
    changes: [
      'Imports now keep Website links for hotels, restaurants and transfers when the document shows them (they used to end up in Notes, or nowhere).',
      'Importing from a web page: a hotel, restaurant or transfer the page gives no website for gets the page itself as its Website, since that page is usually its own site. The review shows it as "website (this page)". Map links still come from the address.',
      'Re-importing can update a Website, but the page address never replaces a website a booking already has.',
    ],
  },
  {
    version: 'v00.04.0066',
    date: '2026-11-08',
    changes: [
      'Import from a web page: the Import window has File and Web page. Paste a page\'s address and Helm reads it like a document, then shows the same review before anything is saved. A link straight to a PDF works too.',
      'Pages that need you to sign in, or that only show their content in a browser, can\'t be read this way; save them as PDF and import the file. Helm says which it was.',
      'For safety, Helm only opens public web addresses, never your home network or the computer it runs on.',
    ],
  },
  {
    version: 'v00.04.0065',
    date: '2026-11-08',
    changes: [
      'Dashboard header: ＋ New Trip, Help and Sign Out are all gold buttons on one row. On iPhone they sit closer together so all three fit next to Helm, and the second row is gone.',
    ],
  },
  {
    version: 'v00.04.0064',
    date: '2026-11-08',
    changes: [
      'iPhone: ＋ New Trip moves to the header, on its own line under Help and styled like it, so it stays in view while the trips scroll. The button at the bottom right is gone and the version number is back where it was.',
    ],
  },
  {
    version: 'v00.04.0063',
    date: '2026-11-08',
    changes: [
      'iPhone: New Trip is now a labelled ＋ New Trip button at the bottom right (it was a small round + that was easy to miss).',
      'Sign Out now signs out only the device you are on. Before, signing out anywhere signed you out of Helm on every device.',
      'A sign-in that ended on another device is cleared quietly before the login page, so it no longer shows "Invalid Refresh Token" in development.',
    ],
  },
  {
    version: 'v00.04.0062',
    date: '2026-11-08',
    changes: [
      'Map pictures can be turned off for a trip: a new Map pictures switch in New Trip and Edit Trip. Off hides the small maps on Hotel and Restaurant cards; the Map ↗ links stay.',
      'Existing trips keep showing map pictures. A copied trip keeps the setting of the trip it was copied from.',
      'Changing Map pictures needs a connection; offline, Edit Trip still saves the title and destination.',
    ],
  },
  {
    version: 'v00.04.0061',
    date: '2026-11-08',
    changes: [
      'Map pictures now appear for places Google pins at the centre of the building rather than at the street entrance (for example Hampton Inn & Suites Alexandria). Matches that are only a street, area or town still get no picture.',
      'DEV panel: Fill map locations also creates the automatic map link for older records that never had one, and lists each record it couldn\'t place, with the reason.',
    ],
  },
  {
    version: 'v00.04.0060',
    date: '2026-11-07',
    changes: [
      'Map pictures: Hotel and Restaurant cards show a small map with a pin under the links when Helm knows exactly where the place is. Tap it to open the map link.',
      'With "Create map link from address" on, the place is found from the street address, and the picture is shown only when Google matches that exact address. With the switch off, the pin comes from your own link (including maps.app.goo.gl short links); a link that only shows an area, with no pin, gets no picture.',
      'Offline, or if the map can\'t load, the picture is left out and the Map ↗ link still works.',
      'DEV panel: Fill map locations finds the place for existing records on your trips without saving each one again.',
    ],
  },
  {
    version: 'v00.04.0059',
    date: '2026-11-07',
    changes: [
      'Hotels and Restaurants: a new "Create map link from address" switch, on for new records. While it\'s on, Helm writes the Maps URL from the name and address (a street address and city are needed) and keeps it up to date when the address changes; the field can\'t be edited.',
      'Turn the switch off to enter your own map link; it starts from the generated one. Records that already had a Maps URL keep it, with the switch off.',
    ],
  },
  {
    version: 'v00.04.0058',
    date: '2026-11-07',
    changes: [
      'Notes with web addresses: Hotel and Transportation cards now show their notes (up to three lines), with any web address as a link, like Flights and Restaurants.',
      'In edit forms, the web addresses typed into Notes (and Itinerary descriptions, day notes and Key Info values) are listed as links just under the box, so you can open them while editing; a link can\'t be tapped inside the text box itself.',
      'Every link in content is gold and underlined (one shared style, .text-link).',
    ],
  },
  {
    version: 'v00.04.0057',
    date: '2026-11-07',
    changes: [
      'Links you can tap: Hotels now show Map and Website links on each card, Transportation shows Website, and Restaurants\' Website, Map and Booking links are larger, with room to tap. A link opens in a new tab without opening the edit form.',
      'Edit forms: every web address field (Website, Maps URL, Booking URL, Key Info URL) has an Open ↗ button beside it once the address is complete.',
      'Web addresses typed into Flight and Restaurant notes, Key Info values and Itinerary descriptions are now links.',
      'Only complete web addresses (starting with http:// or https://) become links; anything else stays plain text.',
    ],
  },
  {
    version: 'v00.04.0056',
    date: '2026-11-07',
    changes: [
      'Checklist and Packing: the offline "* Copy to Trip needs a connection." line is now orange text on the page background, instead of white text on an orange band.',
    ],
  },
  {
    version: 'v00.04.0055',
    date: '2026-11-07',
    changes: [
      'Checklist and Packing: offline, one orange line under the toolbar and selection bar reads "* Copy to Trip needs a connection." (on Packing while selecting: "* Move, Copy and Copy to Trip need a connection."), in place of the small grey notes.',
    ],
  },
  {
    version: 'v00.04.0054',
    date: '2026-11-07',
    changes: [
      'Offline, the Checklist selection bar now says "Copy to Trip needs a connection." under its buttons (it was only a hover tip, which iPad and iPhone never show). In the Actions sheet, the notes under each action are larger and darker, and the offline one reads "Copy to Trip needs a connection."',
    ],
  },
  {
    version: 'v00.04.0053',
    date: '2026-11-07',
    changes: [
      'Itinerary: Select is removed, along with its Move to Day and Copy to Trip. Selecting and Copy to Trip stay on Flights, Hotels, Restaurants, Transportation, Key Info, Checklist and Packing.',
    ],
  },
  {
    version: 'v00.04.0052',
    date: '2026-11-07',
    changes: [
      'Itinerary: Select now works on any trip with entries, not only one with entries you added. While selecting, tapping a booking (a flight, hotel, restaurant or transfer) says which page to change it on, and on a trip with only bookings the bar explains: "Only entries you added here can be selected. Bookings are changed on their own pages."',
    ],
  },
  {
    version: 'v00.04.0051',
    date: '2026-11-06',
    changes: [
      'Copy to Trip for selected records, on Flights, Hotels, Restaurants, Transportation, Itinerary, Key Info (in Actions…), Checklist and Packing (in the selection bar). Pick another of your trips; the copies keep their details, with Google Calendar off.',
      'Anything the other trip already has is skipped (for example the same flight number at the same time, or the same hotel and check-in date), and the message says how many. Groups, categories and sub-groups are matched by name and created when missing; hotels bring their nearby dining.',
      'Itinerary rows go onto the other trip\'s day with the same date, and a day is added when that date has none, as are the days copied flights, hotels, restaurants and transfers need to appear in its Itinerary. Checklist copies start Open with no due date; packing copies start unpacked.',
      'Copy to Trip needs a connection. The whole copy saves together: if anything fails, nothing is copied.',
    ],
  },
  {
    version: 'v00.04.0050',
    date: '2026-11-06',
    changes: [
      'Selection bar: a Clear button deselects everything you have picked, without having to Select All and then Deselect All. It appears whenever some (but not all) items are selected, on every page with Select, including Packing and Checklist.',
    ],
  },
  {
    version: 'v00.04.0049',
    date: '2026-11-06',
    changes: [
      'Select now works on Hotels, Restaurants, Transportation, Key Info and the Itinerary, the same way as on Flights: tap Select, pick items (or Select All), then Actions….',
      'Hotels, Restaurants and Transportation: Attention Required on or off, Show in or Remove from Itinerary, Add to or Remove from Google Calendar, and Delete. Records without the date Calendar needs are skipped, and the message says how many.',
      'Key Info: Attention Required, Show in or Remove from Overview, Move to Group…, and Delete. Each group heading has a checkbox that selects its items.',
      'Itinerary: your own rows can be selected (flights, hotels and other linked entries are changed on their own pages and are dimmed while selecting). Each day has a checkbox for its rows. Actions: Attention Required, Google Calendar, Move to Day…, and Delete. Move to Day moves All Day and Time TBD rows; a row with a time keeps its date, because the time carries the date.',
      'Checklist: the selection bar gains Calendar ✓ and Calendar ✗. Items without a due date are skipped when adding to Calendar.',
    ],
  },
  {
    version: 'v00.04.0048',
    date: '2026-11-06',
    changes: [
      'Selection bar: the "N selected" count now sits centred with space on both sides, instead of pressed against Select All.',
    ],
  },
  {
    version: 'v00.04.0047',
    date: '2026-11-06',
    changes: [
      'Flights: tap Select to pick several flights (tap a flight or its checkbox; Select All picks every flight). Actions… offers Attention Required on or off, Show in or Remove from Itinerary, Add to or Remove from Google Calendar, and Delete. Flights without both dates are skipped when adding to Calendar, and the message says how many.',
      'Bulk changes save in one request and also work offline (they wait and send when the connection returns). The same Select button and Actions sheet will follow on Hotels, Restaurants, Transportation, Key Info and Itinerary.',
    ],
  },
  {
    version: 'v00.04.0046',
    date: '2026-11-06',
    changes: [
      'Print dialog: a Clear selections button unticks every packet section, so you can tick just the ones you want.',
      'Print dialog: the section called "Todo" is now "Checklist", matching the trip\'s Checklist page.',
    ],
  },
  {
    version: 'v00.04.0045',
    date: '2026-11-06',
    changes: [
      'Printed packet: the front page no longer repeats the large Helm wheel, name and motto; it shows the trip name, destination and dates. The Helm header at the top of every page is a little larger instead.',
    ],
  },
  {
    version: 'v00.04.0044',
    date: '2026-11-06',
    changes: [
      'Fixed: the printed packet\'s Outstanding Tasks section never appeared. It was reading an old, empty list. It now prints every open checklist task under its group heading, in the same order as the Checklist page, with "No Group" last and the due date where a task has one.',
    ],
  },
  {
    version: 'v00.04.0043',
    date: '2026-11-06',
    changes: [
      'Clear Data now explains plainly that it empties the trip and keeps the trip itself. Download & discard saves a backup first; Discard data empties it without one.',
    ],
  },
  {
    version: 'v00.04.0042',
    date: '2026-11-06',
    changes: [
      'Archive is gone. It deleted a trip\'s data but left an empty trip, so it was Delete under another name, and a restored trip came back empty. Trips now go Draft → Upcoming → Active → Done, and Done keeps everything. Delete is the only way to remove a trip.',
      'A trip archived before this has no data left: its ⋯ menu offers only Delete, and its status can\'t be changed. The dashboard\'s Archived filter appears only while such a trip exists.',
      'Clear Data stays, for emptying a trip to start over (Download & discard, or Discard data).',
    ],
  },
  {
    version: 'v00.04.0041',
    date: '2026-11-06',
    changes: [
      'Fixed: on the dashboard, a trip card\'s ⋯ menu opened underneath the cards in the next row, so items like Archive couldn\'t be tapped. The open menu now stays on top.',
    ],
  },
  {
    version: 'v00.04.0040',
    date: '2026-11-06',
    changes: [
      'Fixed: Archive, Clear Data and Delete left Checklist, Packing, their groups and Key Info groups behind, and a failure part-way could leave a half-deleted trip. Each now removes everything in one step: all of it, or nothing.',
      'Archive, Clear Data and Delete now also remove the trip\'s events from Google Calendar. If Google can\'t be reached, nothing is deleted and Helm asks whether to go ahead anyway.',
      'Clear Data now offers Download & discard (a backup of all the trip\'s data as one file, then delete) and Discard data. Its "Archive trip — keep all data" option, which actually deleted everything, is gone; Archive is on the trip card menu.',
      'Archive, Clear Data and Delete say so when you\'re offline instead of failing.',
      'Behind the scenes: Checklist, Packing and several other tables are now indexed by trip, so loading those sections doesn\'t read every row in the table.',
    ],
  },
  {
    version: 'v00.04.0039',
    date: '2026-11-06',
    changes: [
      'Security: every trip route now checks that you\'re signed in and a member of that trip. Before, anyone who knew a trip\'s id could read any section\'s list (itinerary, flights, hotels, transfers, restaurants, checklist, packing, Key Info), read or change the trip, delete it or clear its data, add or delete hotels, and read or clear its Logs. Changing, deleting, archiving or clearing a trip needs an advisor on that trip. Nothing changes for you when you\'re signed in.',
      'Security: saving a hotel can no longer change which trip it belongs to or its Calendar sync details.',
    ],
  },
  {
    version: 'v00.04.0038',
    date: '2026-11-06',
    changes: [
      'Cathy is hidden, since her packing list isn\'t used: Packing shows only Stan\'s list, without the Stan / Cathy tabs, and Copy to Trip and Move / Copy no longer ask whose list. The Overview\'s Packing Items count, Print and Search leave her items out. Nothing of hers is deleted, so she can be shown again later.',
      'Fixed: Print included packing items that had been deleted.',
    ],
  },
  {
    version: 'v00.04.0037',
    date: '2026-11-05',
    changes: [
      'Re-importing a booking now picks up its changes. On the review page, flights, hotels, transfers and restaurants already on the trip appear under "Bookings already on this trip": each changed field shows old → new with Accept or Skip (plus Accept all, Skip all, and Add as a new booking instead). Bookings with no changes aren\'t added again. If a booking matches two on the trip, you choose which one it updates.',
      'Changes you don\'t accept or skip are skipped, and the Confirm button says how many. A field the document leaves empty never clears what\'s on the trip. Accepted changes are saved like an edit: the Calendar event updates on the next sync, and other devices pick up the change.',
      'An itinerary item or Key Info item that\'s already on the trip exactly (same day, title and time; same label and value) isn\'t added again.',
      'Fixed: on the review page, Fix and Edit on a flag were recorded but not applied, so the original value was saved. The fixed or edited value is now what\'s imported.',
      'Fixed: imported transfer and restaurant times were saved without their timezone, so they could show at the wrong hour. They\'re now read in the place\'s timezone, as flights already were.',
    ],
  },
  {
    version: 'v00.04.0036',
    date: '2026-11-05',
    changes: [
      'Import Document no longer asks "Re-import Document … may add to or overwrite existing trip data" after a trip has had an import. Imports only add (nothing is overwritten), so Import always opens the file picker, and you can import each booking document in turn.',
    ],
  },
  {
    version: 'v00.04.0035',
    date: '2026-11-05',
    changes: [
      'Fixed: Import Document stopped with "column section_counts of relation import_jobs does not exist" (nothing was saved). The import record now keeps its counts and flag resolutions where the table expects them. If that record ever can\'t be written, the import itself is still saved and the problem goes to Logs.',
    ],
  },
  {
    version: 'v00.04.0034',
    date: '2026-11-05',
    changes: [
      'Fixed: Import Document stopped with "column flag of relation key_info does not exist" (nothing was saved). Imported Key Info items now go into Key Info groups named after their category (matched by name, created when missing), and urgent items are marked Attention Required.',
    ],
  },
  {
    version: 'v00.04.0033',
    date: '2026-11-05',
    changes: [
      'Fixed: Import Document said "Failed to read text from this file" for every PDF. The PDF reader now runs as installed instead of being bundled into the app, so it can find the files it needs.',
    ],
  },
  {
    version: 'v00.04.0032',
    date: '2026-11-05',
    changes: [
      'Fixed: Import Document failed at Packing and Checklist, which still pointed at tables Helm no longer uses, leaving a half-imported trip. Packing items now go to Stan\'s list under matching categories and sub-groups, and checklist items go into matching groups; items already on the list are skipped.',
      'An import is now saved all at once: if anything fails, nothing is saved, and the review page keeps the preview so you can try again. Imported days on a date that already has a day reuse that day.',
      'Import Document now explains AI problems: when the AI service has run out of credits ("Add credit in the Anthropic console"), is busy, isn\'t set up, or the document is too long. Try Again is offered only when it can help, and each problem is written to Logs.',
      'If the connection drops during an import it says "Connection lost". On the review page, Confirm Import is disabled offline with "Reconnect to save this import"; the preview is kept until you\'re back online.',
      'Word (.docx) documents are now read properly, and longer documents are sent whole instead of being cut off.',
      'Import now uses Claude Sonnet 5.5 (was Sonnet 4.6), which costs less per document.',
      'Security: importing and saving an import now require you to be signed in as an advisor on that trip.',
      'Behind the scenes (development only): the DEV panel has an Import AI Error switch (Credits / Busy / No key) to test those messages without calling the AI service.',
    ],
  },
  {
    version: 'v00.04.0031',
    date: '2026-11-05',
    changes: [
      'Offline, the 🔍 Search button at the top of a trip is dimmed, like the other actions that need a connection.',
      'The offline page for pages that need a connection (Search, Print, sign-in) now says so, explains that the dashboard and saved trips still work offline, and has a Go to dashboard button. It no longer says offline editing is "on the roadmap".',
    ],
  },
  {
    version: 'v00.04.0030',
    date: '2026-11-05',
    changes: [
      'When the connection drops and Helm can\'t carry on drawing the page, it now says "Connection lost" and offers Reload, which opens the copy saved on this device, instead of "Something went wrong".',
      'Behind the scenes: details of a problem that happens offline are kept on the device and sent to Logs once Helm is back online, so its cause can be found.',
    ],
  },
  {
    version: 'v00.04.0029',
    date: '2026-11-05',
    changes: [
      'Fixed: offline, "← Helm Dashboard" in a trip showed "This page hasn\'t been saved on this device yet" even though the dashboard was saved. The link went to Helm\'s start address, which forwards to the dashboard and isn\'t saved itself; it now goes to the dashboard directly.',
    ],
  },
  {
    version: 'v00.04.0028',
    date: '2026-11-05',
    changes: [
      'Behind the scenes (development only): the DEV panel has a Simulate Offline switch, so offline editing can be tested on localhost without turning Wi-Fi off.',
    ],
  },
  {
    version: 'v00.04.0027',
    date: '2026-11-05',
    changes: [
      'Fixed: offline, a trip card\'s ⋯ menu on the dashboard hid Edit along with the actions that need a connection. Edit is now available offline; the other actions still say they need a connection.',
    ],
  },
  {
    version: 'v00.04.0026',
    date: '2026-11-05',
    changes: [
      'You can now edit a trip\'s title and destination from inside the trip: tap Edit Trip in the menu, or the pencil next to the destination. No need to go back to the dashboard.',
      'Editing a trip\'s title and destination now works offline, from the trip or the dashboard. The change shows straight away and is sent when Helm is back online. If the same detail was changed on another device meanwhile, the later edit is kept and the other value is listed under Sync conflicts on Logs.',
    ],
  },
  {
    version: 'v00.04.0025',
    date: '2026-11-05',
    changes: [
      'The packet\'s title page now says "Helm" (instead of "Helm Trip Companion"), with the motto directly under it.',
    ],
  },
  {
    version: 'v00.04.0024',
    date: '2026-11-05',
    changes: [
      'The printed 8.5×11 trip packet now has the Helm wheel and "Your trips, beautifully organized" at the top of every page, and a large Helm wheel and the motto on its title page.',
    ],
  },
  {
    version: 'v00.04.0023',
    date: '2026-11-02',
    changes: [
      'Behind the scenes: Helm now reports which timezone data its server uses, to confirm it has British Columbia\'s switch to year-round UTC−7. Older data put Vancouver, Kamloops and Whistler times an hour off from November 2026.',
    ],
  },
  {
    version: 'v00.04.0022',
    date: '2026-11-02',
    changes: [
      'Fixed: a Seattle hotel\'s check-out showed an hour late in the Itinerary. Hotels and restaurants used a short list of Rockies cities and treated every other city as Vancouver, which no longer keeps the same time as Seattle in winter.',
      'Timezones now work anywhere in the world. Helm looks up each hotel\'s, restaurant\'s, flight\'s, transfer\'s and Itinerary item\'s timezone from its address, airport or location (with Google), shows it under the time, and keeps it with the record.',
      'Change… lets you pick any timezone instead, searching by city or name (for example Tokyo or Eastern). The trip\'s own timezones are listed first. A timezone you pick is kept.',
      'Hotels and restaurants have a Country field, to find places outside the US and Canada.',
      'A record whose timezone isn\'t known shows "Time zone unknown" in the Itinerary instead of a wrong time, and Calendar sync asks for its timezone. Look up in its form finds it.',
    ],
  },
  {
    version: 'v00.04.0021',
    date: '2026-11-01',
    changes: [
      'Fixed: a Checklist group disappeared when its last item was moved out or deleted. Empty groups now stay in the list with "0 items" (with a filter on, only groups with matching items are listed).',
    ],
  },
  {
    version: 'v00.04.0020',
    date: '2026-11-01',
    changes: [
      'Checklist items can now be selected together: tap Select, then tick items or a whole group, and use Complete, Reopen, Attention ✓ / ✗, Move… (to another group) or Delete…. An "in progress" box shows while changes are saved, and they also work offline.',
      'With a filter on, Select All selects only the items shown, and the bar says when some selected items are not shown.',
      'The Checklist buttons, filters and selection bar now stay pinned at the top while the list scrolls. On iPhone, Show All / Hide All, Manage Groups and Copy to Trip are under More.',
      'Checklist groups can be renamed (✎ in Manage Groups; needs a connection). Their items move to the new name with them.',
      'Checklist groups that have items can now be deleted. Tapping × asks first, saying how many items will go, and their Calendar events are removed at the next sync. An empty group can still be deleted offline.',
      'Checklist groups can be hidden and shown with ▾ / ▸ or by tapping the name; Show All / Hide All switches them all. Each device remembers what is hidden.',
      'Copy to Trip… copies this checklist into another trip as Open items, without due dates, references, resolutions or Calendar settings. Groups with the same name are combined and items already there are skipped.',
    ],
  },
  {
    version: 'v00.04.0019',
    date: '2026-11-01',
    changes: [
      'Packing categories and sub-groups can now be hidden and shown: tap ▾ / ▸ or the name on the heading. A hidden category keeps its heading and progress; a hidden sub-group shows how many items it holds.',
      'Show All / Hide All is in the toolbar (under More on iPhone). Each device remembers what is hidden, separately for Stan and Cathy.',
      'Selecting a hidden heading still selects everything in it, and saving an item into a hidden category or sub-group shows it again.',
    ],
  },
  {
    version: 'v00.04.0018',
    date: '2026-11-01',
    changes: [
      'Packing categories that have items can now be deleted. Deleting a category also deletes its sub-groups and all their items.',
      'Tapping × in Manage Categories now asks first, saying how many sub-groups and items will go, and an "in progress" box shows while it is deleted.',
      'An empty category can still be deleted offline; deleting one with items needs a connection.',
      'Fixed: deleting a category that had sub-groups but no items left those sub-groups behind.',
    ],
  },
  {
    version: 'v00.04.0017',
    date: '2026-11-01',
    changes: [
      'Fixed: after a Move or Copy in Packing the page could no longer be scrolled or used until it was reloaded.',
    ],
  },
  {
    version: 'v00.04.0016',
    date: '2026-11-01',
    changes: [
      'Selected packing items can now be moved or copied: tap Move… or Copy… in the selection bar, then choose Stan or Cathy, a category and (optionally) a sub-group. Moved items go to the end of the chosen place in their current order.',
      'A whole sub-group can be moved or copied to another category, Stan\'s or Cathy\'s: tap ⇄ next to it in Manage Sub-groups. Its items go with it, and if that category already has a sub-group with the same name the two are combined.',
      'Copies keep Owned and start unpacked, and items already at the destination are skipped. Move and Copy need a connection.',
    ],
  },
  {
    version: 'v00.04.0015',
    date: '2026-10-31',
    changes: [
      'Packing categories and sub-groups can now be renamed: tap ✎ next to the name in Manage Categories or Manage Sub-groups, type the new name and tap Save.',
      'A category can\'t share a name with another of the same person\'s categories, and a sub-group can\'t share a name with another in the same category.',
      'Fixed: on iPhone the pinned Packing controls slipped under the trip\'s top bar when the trip name ran onto two lines. They now sit just below the bar however tall it is.',
    ],
  },
  {
    version: 'v00.04.0014',
    date: '2026-10-31',
    changes: [
      'The Packing buttons, the Stan / Cathy tabs and the selection bar now stay at the top of the screen while the list scrolls beneath them, so Add Item, Select and the selection actions are always in reach.',
      'On iPhone the buttons fit on one row: Select, More and Add Item. Reset Packed, Manage Categories and Copy to Trip are under More.',
    ],
  },
  {
    version: 'v00.04.0013',
    date: '2026-10-31',
    changes: [
      'Changing many packing items at once is now much faster: the whole selection is saved in one step instead of one item at a time.',
      'While a change to selected items, Reset Packed or Copy to Trip is being saved, an "in progress" box covers the screen so nothing else can be tapped until it finishes.',
      'Offline, selected items are still saved on the device and sent when Helm is back online; the box then counts them as they are saved.',
    ],
  },
  {
    version: 'v00.04.0012',
    date: '2026-10-31',
    changes: [
      'Packing has a new Select button for working on many items at once. Tap items to select them, or use the checkboxes on category and sub-group headings to select everything in them; Select All / Deselect All covers the whole list.',
      'With items selected, mark them Owned or not owned, Packed or unpacked, or delete them (Helm asks first). Tap Done to go back to the normal list.',
      'Selection works offline like any other change: the changes are saved on the device and sent when Helm is back online.',
    ],
  },
  {
    version: 'v00.04.0011',
    date: '2026-10-31',
    changes: [
      'Packing has a new Copy to Trip… button. Choose Stan\'s list, Cathy\'s list or both, pick one of your other trips, and the categories, sub-groups and items are added to that trip\'s packing list.',
      'Copying never overwrites: categories and sub-groups with the same name are combined, items already on the other trip are skipped, and nothing there is changed or removed. Copied items arrive unpacked; Owned is kept.',
      'Copying needs a connection, so the button is unavailable offline. Archived trips aren\'t offered as destinations.',
    ],
  },
  {
    version: 'v00.04.0010',
    date: '2026-10-30',
    changes: [
      'Edit offline, like Apple Notes. Inside a trip you can now add, change, tick off and delete items in every section (Itinerary, Checklist, Packing, Key Info, Flights, Hotels, Restaurants, Transportation) with no connection. Changes are saved on the device at once and sent, in order, when Helm is back online.',
      'The pill at the bottom shows where things stand: "Offline · 3 changes waiting", then "Syncing…", then nothing once everything is saved.',
      'If two devices change the same detail, the later edit is kept and the other value is listed under Sync conflicts at the top of Logs, where it can be put back. Changes to different details of the same record are both kept.',
      'A change the server refuses is never dropped: the pill says it couldn\'t be saved, and tapping it lists those changes to try again or discard.',
      'Waiting until you\'re online: Google Calendar updates, days added for travel records shown in the Itinerary, and the Overview counts. Print, Import, Calendar, Logs, new trips and trip actions still need a connection.',
    ],
  },
  {
    version: 'v00.04.0009',
    date: '2026-10-29',
    changes: [
      'Development only: when Helm runs on the Mac, it now counts as offline whenever the Mac can\'t reach the database, so the offline pill can be tested there by turning Wi-Fi off.',
    ],
  },
  {
    version: 'v00.04.0008',
    date: '2026-10-29',
    changes: [
      'The browser tab icon is now the Helm ship\'s wheel everywhere, replacing a leftover default icon that some browsers showed.',
    ],
  },
  {
    version: 'v00.04.0007',
    date: '2026-10-29',
    changes: [
      'The Home Screen icon is now the Helm ship\'s wheel, served as a fixed image so iPhone and iPad always find it.',
      'Fixed: turning Wi-Fi off on the Mac running Helm locally could reload the page and land on the sign-in screen. When the device reports it is offline, Helm now stays offline until the connection is back.',
    ],
  },
  {
    version: 'v00.04.0006',
    date: '2026-10-29',
    changes: [
      'Trips can now be read offline. Helm keeps a copy of each trip you open, and of every Upcoming and Active trip, on the device and refreshes it in the background while you are online, including shortly after each change you save.',
      'Losing the connection no longer replaces the whole app with the offline screen. On the dashboard and inside a trip, a small "Offline · read only" pill appears instead, and the latest data loads as soon as you are back online. Sign-in, search, import and printing still show the offline screen.',
      'While offline, Calendar, Print, Import and Logs say they need a connection instead of opening, and New Trip and trip actions are unavailable.',
      'Helm can be added to the Home Screen as an app on iPhone and iPad (Share → Add to Home Screen). Opening it from there keeps the offline copies, which Safari otherwise clears after 7 days without a visit.',
    ],
  },
  {
    version: 'v00.04.0005',
    date: '2026-10-29',
    changes: [
      'Tap a flight, hotel, restaurant or transfer in the Itinerary to open its own edit form right there, without leaving the Itinerary. Saving, deleting or unchecking Show in Itinerary updates the Itinerary straight away.',
      'A day that Helm adds for a record is now titled "[Inserted day]" with no day type, so it no longer looks like a flight day just because a flight created it. Rename it and set its type when you know what the day is.',
      'The Flights, Hotels, Restaurants and Transportation lists stay current after changes made from the Itinerary.',
    ],
  },
  {
    version: 'v00.04.0004',
    date: '2026-10-26',
    changes: [
      'Flights, hotels, restaurants and transfers can now appear in the Itinerary, so you no longer enter them twice. Each has a new Show in Itinerary checkbox, on by default for new records and off for existing ones.',
      'In the Itinerary they sit among your own items for that day, ordered by time and labelled with their section (for example "From Flights"). They are changed only through the record itself, including Action Required and Google Calendar, so they never create a second Calendar event.',
      'Flights appear at departure and at arrival, each on its local date; hotels at check-in and check-out; restaurants at the reservation; transfers at pickup.',
      'If a record falls on a date with no itinerary day, Helm adds the day for you. Placeholder days you create yourself are kept as they are.',
      'The Overview timeline, the printed packet and the 3×5 daily cards include these items. The document import now marks imported travel records for the Itinerary instead of also creating duplicate itinerary items.',
      'Fixed: the printed packet showed itinerary times in UTC instead of local time.',
    ],
  },
  {
    version: 'v00.04.0003',
    date: '2026-10-25',
    changes: [
      'Trip dates now come from the itinerary: a trip starts on its first itinerary day and ends on its last. New Trip, Copy Trip and Edit no longer ask for dates, so you can create a placeholder trip before you know when it will happen. Until it has days, it shows "No dates set".',
      'The dashboard card, trip header, Overview and printed packet always show the itinerary\'s dates, and update as you add, move or remove days.',
      'The Overview refreshes after you change the Itinerary, so deleting or moving a day no longer leaves it out of date.',
      'During a trip, the Overview\'s first card names today\'s day or the next one, worded as in the Trip Timeline (for example "Next: Mon, Oct 26 · Fun in the Sun"), and that day is outlined and tagged in the timeline. Tap the card to open it in the Itinerary.',
      'A copied trip keeps the original itinerary\'s dates. Change them by editing the days.',
    ],
  },
  {
    version: 'v00.04.0002',
    date: '2026-10-25',
    changes: [
      'The Overview\'s first card follows the itinerary: days to go before the first day, "Underway" with today\'s or the next day during the trip, and "Completed" after the last day or once the trip is marked Done. It says "No dates set" when no day has a date.',
      'A trip can have one itinerary day per date. Adding or moving a day onto a date that already has one now says so on the Date field.',
      'One-day trips are supported.',
      'Fixed: the printed packet\'s trip dates showed one day early in time zones behind UTC, such as Hawaii.',
    ],
  },
  {
    version: 'v00.04.0001',
    date: '2026-10-25',
    changes: [
      'Itinerary days are identified by their date alone. "Day 1", "Day 2" numbering and the "Pre-Trip" label are gone from the Itinerary, Overview, printed packet and 3×5 daily cards, which now head each day with its date.',
      'Fixed: days added by hand showed "Day null".',
    ],
  },
  {
    version: 'v00.04.0000',
    date: '2026-10-24',
    changes: [
      'New trip status, Done, for a trip that is over. Set it from the Status pills in the trip card menu; the dashboard has a Done filter, and the Overview shows a "Trip done" banner. Unlike Archive, Done keeps all of the trip\'s information.',
    ],
  },
  {
    version: 'v00.03.0018',
    date: '2026-10-22',
    changes: [
      'Release tooling only: added helm-release, a one-command publish for the admin account. It refuses releases without a version bump, without a changelog entry, or that are not a fast-forward, shows what will ship, and asks for the new version to be typed before publishing. No change to the app.',
    ],
  },
  {
    version: 'v00.03.0017',
    date: '2026-10-22',
    changes: [
      'Development tooling only: when npm run dev refuses to start, it now also says how to start the server before the helm-dev launcher is installed. No change to the app.',
    ],
  },
  {
    version: 'v00.03.0016',
    date: '2026-10-22',
    changes: [
      'Google Calendar now works with your normal sign-in (email code or Passkey). Before, it only worked through the development bypass.',
      'Calendar actions now check that you belong to the trip before reading or changing its calendar.',
      'Connecting Google now uses a one-time security check, so a Google account can only be attached by the person who started the connection.',
    ],
  },
  {
    version: 'v00.03.0015',
    date: '2026-10-21',
    changes: [
      'Development tooling only: added the helm-dev launcher and helm-secrets-seal / helm-secrets-set, which keep Helm\'s development secrets in a passphrase-encrypted store instead of a plaintext .env.local, plus test-helm-launcher.sh. The encryption protects the file at rest only. Once the server is unlocked, the values are in the dev-server process.',
      'npm run dev now refuses to start unless the launcher supplies its certificate paths. No change to the app.',
    ],
  },
  {
    version: 'v00.03.0014',
    date: '2026-10-21',
    changes: [
      'Development tooling only: Claude Code now refuses to read Helm\'s .env.local or the Project-secrets folder, and refuses common shell commands (cat, head, grep and similar) that name them. These are guardrails, not enforcement. No change to the app.',
    ],
  },
  {
    version: 'v00.03.0013',
    date: '2026-10-16',
    changes: [
      'The development server now accepts the Mac\'s Bonjour name (stanleys-macbook-pro.local) instead of a fixed, stale LAN IP address, so iPad and iPhone testing uses https://stanleys-macbook-pro.local:3000.',
    ],
  },
  {
    version: 'v00.03.0012',
    date: '2026-09-30',
    changes: [
      'Resolved the UpdateBanner lint error by updating its visibility callback ref in an effect instead of during render, and declared the version-check effect dependency without changing banner behavior.',
    ],
  },
  {
    version: 'v00.03.0011',
    date: '2026-09-30',
    changes: [
      'All Day and Time TBD Itinerary items can now be added to Google Calendar by ticking Add to Google Calendar.',
      'These items sync as all-day events on their Itinerary day; Time TBD events are labelled "Time TBD" in the event title.',
    ],
  },
  {
    version: 'v00.03.0010',
    date: '2026-08-30',
    changes: [
      'Moved Hotel phone numbers inline beside the check-in date on 3×5 Hotel cards instead of right-aligning them at the opposite card edge.',
    ],
  },
  {
    version: 'v00.03.0009',
    date: '2026-08-30',
    changes: [
      'Added each Hotel city beside its street address in both the 3×5 Hotel cards and 8.5×11 Accommodations print section.',
      'Kept address punctuation clean when either the street address or city is unavailable.',
    ],
  },
  {
    version: 'v00.03.0008',
    date: '2026-08-30',
    changes: [
      'Added each Hotel phone number to the 3×5 Hotel card front beside its check-in date without increasing the entry height.',
      'Added Hotel phone numbers beneath addresses in the 8.5×11 Accommodations print section.',
    ],
  },
  {
    version: 'v00.03.0007',
    date: '2026-08-29',
    changes: [
      'Completed HELM-71 by reducing the shared 3×5 card header title to the same font size as its date or subtitle, freeing vertical space consistently across every reference-card category.',
      'Preserved the existing card dimensions, padding, footer, watermark, content sizing, and Epson-tested PDF margins.',
    ],
  },
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
