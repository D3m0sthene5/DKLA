/* Patch notes data for patchnotes.js (owner, 12 November 2026), written from the changelog the page carries
   (dklaR18Changelog) and the v3.0 post-launch updates. Nothing before v9 was recorded. Newest first. */
window.DKLAPatchNotes = {
  'versions': [
    {
      'v': 'v3.0',
      'name': 'The Opossum Update',
      'date': '2026-11-11',
      'blurb':
        'A calmer Home, a calmer top bar, and an opossum hanging from it who will search the web for you.',
      'notes': {
        'New': [
          'Ask Dottie, the opossum research assistant, hangs from the top bar and searches the web when the Atlas has no clear answer.',
          'Dottie shows live progress, saves answers in your browser and reuses answers to identical first questions.',
          'Cold Call accounts define legal terms when you hover or tap.',
          'Atlas search shows where each result matched.',
          'A split-flap New York clock and date in the top bar.',
          'A Minecraft-style splash line beside the clock.',
          'A small Refresh notice, shown only when a newer build exists.',
        ],
        'Changed': [
          'Home map: the three courses on top, Rules & authorities and SCOTUS History below.',
          'Civil Procedure is now labelled Civ Pro.',
          'Save, Study, SCOTUS and Privacy now share one menu.',
          'New typefaces: Exo 2 and Inter.',
          'New versions now arrive quietly.',
        ],
        'Removed': ['Old offline copies are removed.'],
      },
      'updates': [
        {
          'v': 'v3.0 (12 November)',
          'date': '2026-11-12',
          'notes': {
            'New': [
              'The v3.0 label in a flashy heads-up-display style, with a gradient sweep and bracket corners.',
              'Plain-English “≈” explanations for 8,773 dense sentences across all 742 Cold Calls, keeping every legal term, name, number and date.',
            ],
            'Changed': [
              'Home: the three courses side by side above, Rules & authorities and SCOTUS History below.',
              "The top bar's row of buttons gave way to the splash text; Save a backup, Study, SCOTUS History and Privacy moved into the ☰ menu.",
              'Map text is never stretched or squeezed at any zoom; names shrink to fit their cards instead.',
              'Dottie blinks, is 20% smaller in the top bar, and hides once you zoom in or open something.',
              'Splash lines you have already seen come up less often.',
              'Cold Call hover definitions grew from 708 to 6,022 terms, with at most four links per paragraph and rarer terms preferred.',
            ],
            'Fixed': [
              'Rules & authorities boxes are no longer stretched.',
              'Text no longer spills out of tiles on zoomed map views.',
              'The splash stays in its top-bar slot when you zoom into a course or case.',
              "A case's own party names are no longer linked as other cases.",
              'The first Cold Call of a visit appears in about half a second again, down from over a second.',
            ],
            'Removed': [
              'The big DKLA “D” mark in the middle of Home.',
              'The “Atlas” label and the “Saved locally · export for backup” note.',
              'The little green light beside NYC on the clock.',
            ],
          },
        },
      ],
    },
    {
      'v': 'v2.9',
      'name': 'Ask the Atlas',
      'date': '2026-11-10',
      'blurb': 'The search box learned to answer back, with footnotes.',
      'notes': {
        'New': [
          'Ask DKLA: a question box in Atlas search.',
          'Answers draw on published case briefs, authorities, dictionary entries, timelines and Supreme Court records.',
          'Numbered citations open the sources they cite.',
          'AI answers need an internet connection and an enabled model service.',
        ],
      },
      'updates': [],
    },
    {
      'v': 'v2.8',
      'name': 'The Paper Trail',
      'date': '2026-10-28',
      'blurb': 'The original casebook pages are now a tap away, rendered page by page, even on a phone.',
      'notes': {
        'New': [
          'Original casebook and opinion sources open in a page-rendering PDF reader, on desktop and phones.',
          'Source links on map cases, supporting cases and timeline steps.',
        ],
        'Changed': [
          "The three courses' doctrine timelines include cases in every relevant reviewed line, with original-source locators and coverage checks.",
          'Walker and Ragan now appear together on both Erie branches.',
          'Saved work and old addresses remain compatible.',
        ],
      },
      'updates': [],
    },
    {
      'v': 'v2.7',
      'name': 'Multidistrict Mayhem',
      'date': '2026-10-15',
      'blurb':
        'Nine steps of multidistrict litigation, and a start-up that does less work before saying hello.',
      'notes': {
        'New': [
          'A multidistrict litigation timeline for Civil Procedure: nine steps from the 1968 statute to Rule 16.1.',
          'Stops include Korean Air Lines, Amchem, Lexecon, Gelboim, the Volkswagen and Kaiser Panel orders and the DePuy waiver rule.',
          'Each step is traced to the casebook, the supplement or the public record.',
          'Recall cards show the plain-English takeaway beside the holding.',
        ],
        'Changed': [
          'Start-up does less work, and content finishes before the atlas is shown instead of rewriting text afterwards.',
          'The slow-loading notice appears only when loading has stalled, not after a fixed twelve seconds.',
        ],
        'Fixed': ['A link to an entry now opens the entry, not just its course.'],
      },
      'updates': [],
    },
    {
      'v': 'v2.6',
      'name': 'Ice & Vapor',
      'date': '2026-10-12',
      'blurb': 'Cold Call got literally colder, and the dictionary grew a spine.',
      'notes': {
        'New': [
          'The legal dictionary has a spine in the authorities header.',
          'Cold Call gains restrained ice and vapor detail.',
        ],
        'Changed': [
          'Technical typography improves readability in the atlas and the Supreme Court view.',
          'Hosted full briefs load when opened; the complete portable copy still carries every brief.',
          'Analytics recognises a browser only by its own first-party cookie, without recovering identifiers you cleared.',
        ],
      },
      'updates': [],
    },
    {
      'v': 'v2.5',
      'name': 'Bound Volumes',
      'date': '2026-10-11',
      'blurb':
        'Two releases in one day: reading panels got simpler, and Rules & authorities got shelved as proper volumes.',
      'notes': {},
      'updates': [
        {
          'v': 'v2.5 (later)',
          'date': '2026-10-11',
          'notes': {
            'New': [
              'The authority atlas has distinct Constitution, federal-rule, U.S. Code and Contracts volumes, with populated nested contents.',
              "A large centred Constitution masthead based on the owner's We the People reference.",
            ],
            'Changed': [
              'Covers and contents fit the screen, with naturally wrapped labels and detail matched to the zoom level.',
              'Authority views show source boxes without ribbons or case grids.',
              'Long indexes page complete rows within the screen; related case and doctrine links stay in the provision reader.',
              'Curated entry positions stay fixed while the camera still pans and zooms.',
              'A geography review reorganised doctrinal neighbours on the map.',
            ],
            'Removed': ['Prompt-only practice exercises left the map; their source archives are kept.'],
          },
        },
        {
          'v': 'v2.5 (earlier)',
          'date': '2026-10-11',
          'notes': {
            'Changed': [
              'Case reading panels open with one plain-English explanation and keep their full legal analysis.',
              'Timelines are visible immediately, with one synthesis.',
              'Cold Call reads straight through as a narrative.',
              'Rules & authorities uses nested atlas rectangles and ribbons for the Constitution, Federal Rules, U.S. Code and assigned Contracts authorities.',
            ],
            'Removed': [
              'Timelines lose the repeated synopsis, the step-count caption and the expand control.',
              'Cold Call loses its practice controls and repeated introduction.',
            ],
          },
        },
      ],
    },
    {
      'v': 'v2.4',
      'name': 'Once Upon a Docket',
      'date': '2026-10-11',
      'blurb':
        'Same day as v25, the numbers stepped back to v2.4 so Cold Call accounts could step forward as real stories.',
      'notes': {},
      'updates': [
        {
          'v': 'v2.4 (later)',
          'date': '2026-10-11',
          'notes': {
            'New': [
              "Cold Call accounts are individually written narratives: people introduced, events leading into litigation, then each court's reasoning and separate opinions.",
              'Case-specific episodes for reading and oral practice.',
            ],
            'Changed': [
              'Original full briefs remain available.',
              'Only cases with a written narrative get a Cold Call button.',
            ],
            'Removed': ['The earlier fallback that built Cold Call accounts from brief sections.'],
          },
        },
        {
          'v': 'v2.4 (earlier)',
          'date': '2026-10-11',
          'notes': {
            'Changed': [
              'New numbering: the release after v25 is labelled v2.4, shown beside the DKLA logo.',
              'Cold Call keeps nested reasoning and separate-opinion headings with their parent accounts.',
              'Source limitations remain visible.',
            ],
            'Fixed': [
              'A content audit corrected errors that survived in full briefs after their compact summaries were fixed.',
            ],
          },
        },
      ],
    },
    {
      'v': 'v25',
      'name': 'Cold Call for Everyone',
      'date': '2026-10-11',
      'blurb': 'Cold Call escaped its three pilot cases; nobody on the map is safe now.',
      'notes': {
        'New': [
          'Cold Call Mode opens from every illustrated case on the map and every supporting case.',
          'Open the full source brief without leaving your place.',
        ],
        'Changed': [
          'The remaining accounts come from the full briefs: facts before proceedings, complete reasoning and separate opinions, source limitations kept.',
          'The three individually written narratives remain available.',
          'Source text is reused rather than duplicated or shortened, and coverage is checked against the entire case inventory.',
        ],
      },
      'updates': [],
    },
    {
      'v': 'v24',
      'name': 'The Cold Call Pilot',
      'date': '2026-10-11',
      'blurb': 'Three cases take the podium first: Hamer, Pennoyer and Chadha.',
      'notes': {
        'New': [
          'Cold Call Mode for Hamer, Pennoyer and Chadha, with complete sourced narratives.',
          'Case-specific section jumps that return you to your place, and searchable sections.',
          'Oral practice with revealable accounts and follow-up questions.',
          'An Open Cold call button beside each pilot case title.',
        ],
        'Changed': [
          'Practice ratings stay separate from rule recall.',
          'The existing map, briefs and your personal edits are preserved.',
        ],
      },
      'updates': [],
    },
    {
      'v': 'v23',
      'name': 'Words Mean Things',
      'date': '2026-10-11',
      'blurb':
        '“Narrows” no longer means two opposite things; all 505 timeline steps now say what they actually did.',
      'notes': {
        'Changed': [
          'Every timeline step has a plain label saying what it did and to what, such as “Overrules Chevron” or “Replaces Finley”.',
          'Each timeline states what wider and narrower mean for it.',
          'Each step is one of twelve kinds, shown as its colour and explained on hover.',
          'All 505 steps were relabelled and checked against the briefs.',
        ],
        'Fixed': [
          'The same word no longer marks opposite moves, as when Wiener and Free Enterprise Fund were both “narrows”.',
        ],
        'Removed': ['The bare one-word buckets (“Expands”, “Narrows”, “Refines”).'],
      },
      'updates': [],
    },
    {
      'v': 'v22',
      'name': 'Every Step Clicks',
      'date': '2026-10-11',
      'blurb': 'Released as r22, the last of the r-numbers; every timeline step finally opens something.',
      'notes': {
        'New': [
          'Six new rule entries, each with black-letter text from the Contracts Selections, placed with their subtopics.',
          'Each Contracts case gets an “In plain English” takeaway under the rule line, written from the audited brief.',
        ],
        'Changed': [
          'Every step of every doctrine timeline now opens something.',
          'The modification subtopic grew a row to make room.',
        ],
        'Fixed': [
          'Ten statute and rule steps, among them Restatement §§ 90, 205 and 302 and Rule 11 of 1983, can now be clicked.',
        ],
      },
      'updates': [
        {
          'v': 'v22.1',
          'date': '2026-10-11',
          'notes': {
            'Changed': [
              'Versions are now written as v-numbers, back through the whole history: r19, r20.1 and the rest became v19, v20.1 and so on.',
              'Old addresses still open the atlas.',
              "The orange foot of the L in the DKLA mark now runs to the D's bowl.",
            ],
            'Fixed': [
              'A legal accuracy pass checked every case entry and timeline step against its brief: 86 statements corrected or cut.',
              "Among them Bremen's tow company, Shamrock's Justice Stone, Dioguardi's bid, Walden's office and the West Covina and Granfinanciera dates.",
              '44 flagged statements were confirmed with a source.',
            ],
            'Removed': ['The “Why it matters” section, from every entry.'],
          },
        },
      ],
    },
    {
      'v': 'v21',
      'name': 'The Fact-Check Update',
      'date': '2026-10-10',
      'blurb':
        'Votes, judges, dates and districts were checked, and the wrong ones fixed, without touching anything the owner had edited.',
      'notes': {
        'New': [
          'Missing connections added, among them Peevyhouse and Groves, Lucia and Freytag, and Swierkiewicz and Twombly.',
          'Every subtopic has a real question.',
        ],
        'Fixed': [
          'Every entry and connection was checked; corrections skip any entry the owner has edited.',
          'Wrong votes, judges, dates, districts and citations fixed, from Szukhent 5-4 to Sun Printing 139 N.E. 470.',
          'The Byrd connection no longer inverts the rule.',
          'Connections filed under the wrong doctrine removed, such as Taylor v. Caldwell under promissory estoppel.',
          'Entries filed under the wrong subtopic moved where a slot was free.',
        ],
        'Removed': ['Sentences about how an entry was written.'],
      },
      'updates': [],
    },
    {
      'v': 'v20',
      'name': 'Two-Way Street',
      'date': '2026-10-08',
      'blurb':
        'Version 20: the dictionary and the briefs point at each other, then twelve point releases polish everything in sight.',
      'notes': {
        'New': [
          '18 interpretive canons and doctrines Wex lacks, including noscitur a sociis, expressio unius, and Skidmore and Auer deference.',
          'Every dictionary term lists the map entries and supporting cases whose briefs use it; every brief lists its terms.',
        ],
        'Changed': [
          'A course view shows only that course; the others fade out as you zoom in.',
          'Each course sits in the middle of the screen.',
          'Text too small to read fades until you zoom in.',
          'Reading-panel chips, labels and the entry icon are consistent.',
          'Save and More match the other header buttons, and a chosen Study option is plainly marked.',
        ],
        'Removed': ['Repeated source chips in the reading panel.'],
      },
      'updates': [
        {
          'v': 'v20.12',
          'date': '2026-10-10',
          'notes': {
            'Changed': [
              'Twenty-one of the weakest case icons redrawn, each checked blind at card size.',
              "Among them the Cosby sweater, a bull for Gustafson's stock sale and the Leaning Tower for LASA's Italian marble.",
              'Also lemonade for Arnett, a struck-through jury for Jarkesy and a high-stepping horse in chains for American Horse Protection.',
              'Captions are unchanged.',
            ],
          },
        },
        {
          'v': 'v20.11',
          'date': '2026-10-10',
          'notes': {
            'Fixed': [
              'The DKLA mark is whole on the three-course view from the first load, not only after zooming.',
            ],
          },
        },
        {
          'v': 'v20.10',
          'date': '2026-10-10',
          'notes': {
            'Changed': [
              "The L in the DKLA mark has its own stem: the lower part of the D's left bar is orange.",
            ],
            'Fixed': [
              'The three-course view shows the whole DKLA mark; its top had been cut off under the header.',
            ],
          },
        },
        {
          'v': 'v20.9',
          'date': '2026-10-10',
          'notes': {
            'New': [
              'Doctrine timelines rebuilt: from 22 timelines with 164 steps to 66 with 505.',
              '376 of the 392 cases now sit in at least one timeline, up from 161.',
              'New timelines cover removal, venue and transfer, forum clauses, joinder, presidential power, guidance documents and more.',
              'Each timeline ends with where the doctrine stands now.',
              'Doctrine timelines in the More menu lists them all by course; search finds them by name, question or case.',
            ],
            'Changed': [
              'Each step says what it did to the doctrine and, where a later case undid it, by whom.',
              'A step can also be a supporting case or a statute or rule change.',
              'Timelines that ran two doctrines together are split, such as personal jurisdiction, standing and damages.',
            ],
            'Fixed': ['Order errors fixed: Mead before Brand X; Matsushita before Anderson and Celotex.'],
          },
        },
        {
          'v': 'v20.8',
          'date': '2026-10-08',
          'notes': {
            'Changed': [
              "Exxon Mobil v. Allapattah's icon is now just the bold, solid interlocking double X, replacing the old sign with lettering.",
            ],
          },
        },
        {
          'v': 'v20.7',
          'date': '2026-10-08',
          'notes': {
            'Changed': [
              'The A in the DKLA mark is a proper A, turned a quarter turn counter-clockwise and inscribed in the D.',
              'Map, header and tab icon match.',
            ],
          },
        },
        {
          'v': 'v20.6',
          'date': '2026-10-08',
          'notes': {
            'Changed': [
              "The DKLA mark's A is turned on its side so the letters read as one figure; the tab icon matches.",
              "Greenfield's portrait is cropped to the head, so the face fills the icon.",
              'The first-visit note is one line; the guide is shorter, with numbered steps and a key table.',
            ],
            'Fixed': [
              'The old atlas no longer shows for the first half-second of loading; the page stays dark with a small DKLA label.',
            ],
          },
        },
        {
          'v': 'v20.5',
          'date': '2026-10-08',
          'notes': {
            'New': [
              'A six-step guide to the atlas, listed in the More menu as Guided walkthrough.',
              'A note on the three-course view points to it the first time the atlas opens.',
              "Greenfield v. Philles Records carries Ronnie Spector's portrait, traced from the owner's drawing.",
            ],
            'Changed': ['The DKLA mark on the three-course view is larger, and its letters have room.'],
            'Fixed': [
              'The old Contracts welcome block and older marks no longer flash during the first half-second of loading.',
            ],
          },
        },
        {
          'v': 'v20.4',
          'date': '2026-10-08',
          'notes': {
            'Changed': [
              'Every dictionary term now lists the cases that use it, checked against every brief.',
              '2,868 terms list their cases, heaviest users first; a term used by more than 40 shows the 40 and the total.',
              'A term no brief uses says so.',
            ],
            'Fixed': [
              'Most Wex entries showed no cases, because each case linked only its 14 most distinctive terms.',
            ],
          },
        },
        {
          'v': 'v20.3',
          'date': '2026-10-08',
          'notes': {
            'Changed': [
              'SCOTUS History now stands well clear of the courses.',
              'A subtopic too small to list its entries shows its name and a count, like “3 cases · 2 concepts”.',
              'Text is never set below 88% of its size or under 8 px on screen.',
            ],
            'Fixed': [
              'No more specks of text, stray bars or empty boxes between the course view and the card view.',
              'Entry rows no longer go missing one by one, and names stay inside their cards.',
              'The Supporting cases label is readable from the atlas view, and count lines no longer list zeros.',
              "A subject's title can no longer slide under the breadcrumb.",
            ],
          },
        },
        {
          'v': 'v20.2',
          'date': '2026-10-08',
          'notes': {
            'Changed': [
              'On a wide window the three courses stand in a row instead of a triangle.',
              'A course opens to the full window height; a subject opens larger with thinner margins.',
              'Subject names sit centred in their blocks at one size.',
              'Entries are cards with icons at every size; a long name wraps to a second line instead of shrinking.',
            ],
            'Removed': ['The plain lines of text that stood in for cards on small subjects.'],
          },
        },
        {
          'v': 'v20.1',
          'date': '2026-10-08',
          'notes': {
            'Fixed': [
              'Subject titles at in-between zoom levels are even again and stay inside their blocks.',
              "A v19.15 change had shrunk and wrapped long titles; a title that does not fit now uses the subject's short name.",
            ],
          },
        },
      ],
    },
    {
      'v': 'v19',
      'name': 'The Briefs Update',
      'date': '2026-10-05',
      'blurb':
        'Audited briefs move in, supporting cases get their own shelf, and then nineteen point releases, a good many of them about icons.',
      'notes': {
        'New': [
          'Audited briefs arrive: 1,467 so far, each checked against the full opinion.',
          '391 of 392 map cases take their six sections, Parties to Reasoning, and rule line from an audited brief.',
          'The one case without a brief is the Swiss contractual-penalty decision.',
          'The complete audited brief sits under each case as a collapsed Full brief, with its review status.',
          'Supporting cases: 1,076 cases the readings mention without assigning, in one searchable list per course.',
          'Supporting cases also appear in search and the More menu; they do not have custom icons.',
        ],
        'Changed': [
          'Cases you edited in your browser keep your text, with a “Use the audited brief” button on offer.',
          'Review status is visible: 79 briefs awaiting independent review and 44 passed with a source limitation are marked.',
        ],
        'Fixed': [
          'A second, sentence-by-sentence check of the converted cases made 79 corrections across 70 entries.',
        ],
      },
      'updates': [
        {
          'v': 'v19.19',
          'date': '2026-10-08',
          'notes': {
            'Changed': [
              '130 more case icons redrawn as bold solid drawings, for the cases an audit scored lowest.',
              'Clearer subjects: a crocodile for Lujan, a slot machine for Patchak, a broken heart for Lacks, a steam locomotive for Erie.',
              'Captions are unchanged.',
            ],
          },
        },
        {
          'v': 'v19.18',
          'date': '2026-10-08',
          'notes': {
            'Fixed': [
              'Opening “Semester source and reading records” in Contracts, or its subtopics, stays in Contracts instead of jumping to the Study workbench.',
            ],
          },
        },
        {
          'v': 'v19.17',
          'date': '2026-10-08',
          'notes': {
            'Changed': [
              'About 660 sentences that talked about the brief or the excerpt now state the fact directly.',
              '411 boilerplate connection explanations now say what the connection is.',
              'The reading panel still warns about missing or partial sources and flags briefs awaiting review.',
            ],
            'Removed': [
              'Labels about how an entry was written, such as “Passed independent review”.',
              'Disclaimers such as “not legal authority or independent proof”.',
            ],
          },
        },
        {
          'v': 'v19.16',
          'date': '2026-10-07',
          'notes': {
            'Changed': [
              '39 case icons redrawn from scratch, including the Greyhound running dog, the Goodyear wingfoot, the B-2, a Piper Cub and Borat for Psenicska.',
              'Also the hairy hand, and clearer subjects for Sniadach, Standard Fire, Gray v. Powell, Loper Bright and Swierkiewicz.',
              'Captions are unchanged.',
            ],
          },
        },
        {
          'v': 'v19.15',
          'date': '2026-10-07',
          'notes': {
            'Fixed': [
              'No more cut-off map labels: titles that ended in an ellipsis now show in full, slightly smaller or on another line.',
              'Nineteen entry labels that had been stored already cut have their full titles back.',
            ],
          },
        },
        {
          'v': 'v19.14',
          'date': '2026-10-07',
          'notes': {
            'New': [
              'Hurn v. Oursler (1933) joins the Civil Procedure supporting cases, with six sections and a full brief written from the opinion.',
              'It is marked as awaiting independent review.',
            ],
          },
        },
        {
          'v': 'v19.13',
          'date': '2026-10-06',
          'notes': {
            'Changed': [
              'A visual tune-up across the atlas, with nothing removed or moved.',
              'Matching header buttons, a cleaner search box and one style for menus and search results.',
              'Crisper subject blocks and subtopic panels, a steadier timeline rail, and one shell for the Study, Supporting cases and file dialogs.',
              'A tidier Supreme Court view.',
            ],
            'Fixed': [
              'On phones, search results stay on screen, tap targets are larger and the breadcrumb no longer overlaps.',
            ],
          },
        },
        {
          'v': 'v19.12',
          'date': '2026-10-06',
          'notes': {
            'Changed': [
              '61 more case icons redrawn as bold emblems, among them the GE monogram, Mack bulldog, Mobil Pegasus and Wells Fargo stagecoach.',
              "A wolf for Morrison v. Olson, and International Shoe's shoe back in place of the Washington outline.",
              'Hill v. Gateway returns to its cardboard box.',
              'Captions are unchanged.',
            ],
          },
        },
        {
          'v': 'v19.11',
          'date': '2026-10-06',
          'notes': {
            'Changed': [
              'Burger King v. Rudzewicz uses the classic round mark: tilted buns with BK inside a crescent swoosh.',
            ],
          },
        },
        {
          'v': 'v19.10',
          'date': '2026-10-06',
          'notes': {
            'New': ['New brand icons for Gateway, Goodyear and Home Depot.'],
            'Changed': [
              'Brand icons redrawn as bold solid marks, from Chevron and Ford to Binance, HSBC and Phillips 66.',
              'CBS is now a solid disc with the eye cut out.',
              'Captions are unchanged.',
            ],
          },
        },
        {
          'v': 'v19.9',
          'date': '2026-10-06',
          'notes': {
            'Changed': [
              'Burger King v. Rudzewicz shows BK lettering between the two bun halves instead of a plain bar.',
            ],
          },
        },
        {
          'v': 'v19.8',
          'date': '2026-10-06',
          'notes': {
            'New': [
              'Cases named for a well-known company carry an icon drawn after its mark: Chevron, Ford, Burger King, PepsiCo, Exxon Mobil and others.',
            ],
            'Changed': ['Ford takes the badge in place of the Montana outline.', 'Captions are unchanged.'],
          },
        },
        {
          'v': 'v19.7',
          'date': '2026-10-06',
          'notes': {
            'Fixed': [
              'The 19 state-outline cases have their own captions back; v19.6 had replaced them with “<State>, named in the case”.',
              'Biden v. Nebraska, for one, again reads “$430 billion in student debt not waived”.',
            ],
          },
        },
        {
          'v': 'v19.6',
          'date': '2026-10-06',
          'notes': {
            'New': [
              "Cases named for a state carry that state's outline as their icon: 19 states, from Alabama to West Virginia.",
              'One case per state, so every icon is still unique.',
            ],
          },
        },
        {
          'v': 'v19.5',
          'date': '2026-10-06',
          'notes': {
            'New': [
              'Rule entries show the text of the provision itself, at the top of the entry.',
              '28 U.S.C. sections, the Federal Rules, the APA and other statutes carry current text from the Legal Information Institute.',
              'Restatement, UCC and Consumer Contracts sections carry black letter from the supplements; constitutional clauses come from the Constitution on file.',
              '59 of 69 rule entries have text.',
            ],
          },
        },
        {
          'v': 'v19.4',
          'date': '2026-10-06',
          'notes': {
            'New': [
              'The Restatement of Consumer Contracts joins the Contracts map.',
              'RLCC §§ 4, 6, 8 and 9 get their own rule entries, each opening the official 2024 text at its page.',
            ],
            'Changed': [
              'The old study-note entry is now a §§ 1–10 hub, with § 2 and § 3 summarised.',
              'Assignments 6, 9, 11, 13, 16, 17 and 18 link to their sections.',
            ],
          },
        },
        {
          'v': 'v19.3',
          'date': '2026-10-06',
          'notes': {
            'Fixed': [
              'Search results open over the Supreme Court view instead of hiding behind it; choosing one returns to the map.',
              'Zooming out from a course always returns to the full atlas, even from a slightly zoomed-out course view.',
            ],
          },
        },
        {
          'v': 'v19.2',
          'date': '2026-10-06',
          'notes': {
            'New': [
              'The combined PDF of all 1,467 briefs, with every case linked to its own pages in it.',
              'A source chip beside the casebook chip on map cases, and a button on each supporting case.',
            ],
          },
        },
        {
          'v': 'v19.1',
          'date': '2026-10-05',
          'notes': {
            'New': [
              'Supporting cases get the six sections too: 1,072 of 1,076; four that are not decisions stay as full briefs.',
              'Audited briefs show a second status chip and an audit section listing what was checked and every change.',
            ],
            'Fixed': [
              'The 79 briefs not yet independently reviewed were audited: 19 needed nothing, 60 were corrected.',
              '138 corrections, mostly pinpoint pages and casebook page numbers, plus a smaller number of factual and attribution fixes.',
            ],
          },
        },
      ],
    },
    {
      'v': 'v18',
      'name': 'Study Hall',
      'date': '2026-10-03',
      'blurb': "The atlas learned to quiz you back, without changing a word of v17's content.",
      'notes': {
        'New': [
          'A Study layer, opened from the Study button or Shift + D, with Drill, Pairs, Sheets and Progress tabs.',
          'Drill: say the answer aloud, reveal it in stages, and rate it Clean, Patchy or Blank.',
          'Drill sessions can target what needs work or is unrated, cap at 10, 20 or 30, or run as cram to mastery.',
          'A whole drill session runs from the keyboard.',
          'Pairs: confusable cases and doctrines, distinguishing line first, drawn from your own connections.',
          'Sheets: every rule line in reading order, pairs as a comparison chart, and a Print / Save PDF button.',
          'Progress: ratings by course and subject, sync, install, version and changelog.',
          'Ratings show on the map: a bar on each subject tile, a dot on each rated card.',
          'Install the atlas as an app that loads without a connection; ratings sync across devices by a code.',
        ],
        'Changed': [
          'Course names and the centre mark keep the same proportions on every screen.',
          'The course view always holds the whole course.',
          'Subjects open as subtopic tiles listing their entries, instead of a bulleted list.',
          'Without sync storage set up, the Progress tab says so and ratings stay in the browser.',
        ],
      },
      'updates': [
        {
          'v': 'v18.1',
          'date': '2026-10-03',
          'notes': {
            'New': [
              'Every case has its own icon: 392 hand-drawn glyphs, one per case, each a concrete object from the facts.',
              'No two alike, each in its course colour.',
            ],
            'Fixed': [
              'Fixes from an independent review of v18: keyboard start, More menu, phone titles and sync merging.',
            ],
          },
        },
      ],
    },
    {
      'v': 'v17',
      'name': 'Pinpoint',
      'date': '2026-09-27',
      'blurb': 'Source links now land on the cited page.',
      'notes': {
        'New': [
          'Source links open the original PDFs at the cited page.',
          'Supreme Court cases link to their vote breakdown in SCOTUS History.',
          'An interlocking DKLA mark in the header and at the centre of the map.',
        ],
      },
      'updates': [],
    },
    {
      'v': 'v16',
      'name': 'The Bench Update',
      'date': '2026-09-27',
      'blurb': 'Who sat on the Court, when, and how they voted.',
      'notes': {
        'New': [
          'SCOTUS History: Court membership by date.',
          'Seat lineages.',
          'Case votes for the Supreme Court decisions in the atlas.',
        ],
      },
      'updates': [],
    },
    {
      'v': 'v15',
      'name': 'Colour by Course',
      'date': '2026-09-27',
      'blurb': "Each course got its own colours, and the owner's briefs joined the party.",
      'notes': {
        'New': ["The owner's case briefs merged into 53 cases.", 'Named floor tiles.'],
        'Changed': [
          'One colour family per course.',
          'A single sans type stack.',
          'Denser subtopics.',
          'Dictionary links are sense-tested.',
        ],
      },
      'updates': [],
    },
    {
      'v': 'v14',
      'name': 'Fit or Hide',
      'date': '2026-09-27',
      'blurb': 'Map labels stopped elbowing each other.',
      'notes': {
        'Changed': [
          'Map text rewritten around one label engine: fit or hide, no overlaps.',
          'Stepped zoom through four levels.',
          'The legal dictionary is now Wex-only.',
        ],
      },
      'updates': [],
    },
    {
      'v': 'v13',
      'name': 'Did You Mean',
      'date': '2026-09-26',
      'blurb': 'Search learned to forgive your typos.',
      'notes': {
        'New': [
          'Ranked, typo-tolerant search.',
          'Reporter citations are links.',
          'A print layout for the open entry.',
        ],
      },
      'updates': [],
    },
    {
      'v': 'v12',
      'name': 'Doctrine First',
      'date': '2026-09-26',
      'blurb': 'The syllabus lost the seating chart; doctrine took over.',
      'notes': {
        'New': ['The legal dictionary.'],
        'Changed': [
          'Course layouts designed by doctrine rather than syllabus order.',
          'Every source claim checked against the files on hand.',
        ],
      },
      'updates': [],
    },
    {
      'v': 'v11',
      'name': 'The Atlas Update',
      'date': '2026-09-26',
      'blurb': 'The map became the atlas.',
      'notes': {
        'New': ['Three course clusters with smooth zoom-and-pan.', 'An in-app viewer for source files.'],
        'Changed': ['Briefs rewritten from full opinions.'],
      },
      'updates': [],
    },
    {
      'v': 'v10',
      'name': 'Ribbons That Stay Put',
      'date': '2026-09-24',
      'blurb': 'Thirteen new briefs, and connection ribbons that survive panning.',
      'notes': {
        'New': ['Missing readings added.', 'Thirteen new briefs.', 'A hand-picked icon for every case.'],
        'Fixed': ['Connection ribbons survive panning.'],
      },
      'updates': [],
    },
    {
      'v': 'v9',
      'name': 'The Oldest Scroll',
      'date': '2026-09',
      'blurb': 'The oldest surviving record; whatever came before v9 was never written down.',
      'notes': {
        'New': ['Doctrine timelines.', 'Tapered connection ribbons.'],
        'Changed': ['Plain-language interface copy.'],
        'Fixed': ['Audit corrections.'],
      },
      'updates': [],
    },
  ],
};
