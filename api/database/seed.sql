-- PROG2002 Assessment 2 - realistic sample data
USE charityevents_db;

INSERT INTO organisations
  (organisation_id, name, slug, tagline, mission, description, contact_email, contact_phone, website_url, logo_key)
VALUES
  (1, 'Common Ground Collective', 'common-ground-collective', 'Small acts. Shared city.', 'Connect everyday generosity with practical, local solutions.', 'Common Ground Collective is a Sydney-based non-profit that brings volunteers, local businesses and community groups together around food security, safe housing, youth opportunity and coastal care.', 'hello@commonground.org.au', '+61 2 5550 0142', 'https://commonground.example.org', '/assets/common-ground-mark.svg'),
  (2, 'Coastline Care Alliance', 'coastline-care-alliance', 'A cleaner coast starts with us.', 'Protect urban coastlines through education, restoration and community action.', 'Coastline Care Alliance coordinates practical conservation projects across Sydney beaches and waterways.', 'team@coastlinecare.org.au', '+61 2 5550 0188', 'https://coastlinecare.example.org', '/assets/coastline-mark.svg'),
  (3, 'Youth Futures Works', 'youth-futures-works', 'Ready today. Included tomorrow.', 'Help young people access mentoring, training and their first meaningful work.', 'Youth Futures Works partners with schools and employers to remove barriers to employment for young people aged 15 to 24.', 'connect@youthfutures.org.au', '+61 2 5550 0164', 'https://youthfutures.example.org', '/assets/youth-futures-mark.svg'),
  (4, 'Meals Across Sydney', 'meals-across-sydney', 'Good food belongs to everyone.', 'Turn surplus food into reliable meals for local families.', 'Meals Across Sydney works with food businesses and volunteers to prepare and deliver nutritious meals where they are needed most.', 'support@mealsacrosssydney.org.au', '+61 2 5550 0131', 'https://mealsacrosssydney.example.org', '/assets/meals-mark.svg');

INSERT INTO categories
  (category_id, name, slug, description, accent_colour, icon_key)
VALUES
  (1, 'Fun Run', 'fun-run', 'Walks, runs and rides that turn movement into impact.', '#FF5A36', 'run'),
  (2, 'Gala Dinner', 'gala-dinner', 'A shared meal and formal program supporting a local cause.', '#D9A441', 'gala'),
  (3, 'Silent Auction', 'silent-auction', 'Bid on experiences, art and services donated by the community.', '#7B61A8', 'auction'),
  (4, 'Live Music', 'live-music', 'Concerts and performances where every ticket creates change.', '#E84A7F', 'music'),
  (5, 'Community', 'community', 'Open, welcoming events built around local participation.', '#17B7A5', 'community'),
  (6, 'Trivia Night', 'trivia-night', 'A social night of friendly competition for a serious cause.', '#2E7D68', 'trivia'),
  (7, 'Wellness', 'wellness', 'Movement, mindfulness and care in support of others.', '#4C8EDA', 'wellness'),
  (8, 'Food Drive', 'food-drive', 'Hands-on food collection, packing and community support.', '#EE7F2D', 'food');

INSERT INTO venues
  (venue_id, name, address_line_1, suburb, state_code, postcode, latitude, longitude)
VALUES
  (1, 'Barangaroo Reserve', 'Hickson Road', 'Barangaroo', 'NSW', '2000', -33.855100, 151.201600),
  (2, 'Sydney Town Hall', '483 George Street', 'Sydney', 'NSW', '2000', -33.873100, 151.206500),
  (3, 'Carriageworks', '245 Wilson Street', 'Eveleigh', 'NSW', '2015', -33.896500, 151.194400),
  (4, 'Enmore Theatre', '118-132 Enmore Road', 'Newtown', 'NSW', '2042', -33.898900, 151.175300),
  (5, 'Manly Beach North Steyne', 'North Steyne', 'Manly', 'NSW', '2095', -33.796200, 151.289400),
  (6, 'Paddington RSL Club', '220-232 Oxford Street', 'Paddington', 'NSW', '2021', -33.885000, 151.226900),
  (7, 'Bondi Pavilion', 'Queen Elizabeth Drive', 'Bondi Beach', 'NSW', '2026', -33.891100, 151.274300),
  (8, 'White Bay Power Station', 'Robert Street', 'Rozelle', 'NSW', '2039', -33.865800, 151.185900),
  (9, 'Centennial Park Pavilion', 'Grand Drive', 'Centennial Park', 'NSW', '2021', -33.898600, 151.233500),
  (10, 'Riverwood Community Centre', '151 Belmore Road North', 'Riverwood', 'NSW', '2210', -33.946100, 151.054200);

INSERT INTO events
  (event_id, organisation_id, category_id, venue_id, title, slug, summary, purpose, description, start_datetime, end_datetime, timezone, ticket_price, currency, is_free, goal_amount, raised_amount, capacity, hero_image_key, status, is_featured, published_at)
VALUES
  (1, 1, 1, 1, 'Twilight Harbour 10K', 'twilight-harbour-10k', 'Run the harbour at golden hour and fund 4,000 fresh meals for Sydney families.', 'Food security and emergency meal support.', 'Twilight Harbour 10K is a timed 10 km run and 5 km community walk along one of Sydney''s most iconic waterfront routes. The event welcomes first-time runners, experienced athletes, teams and families. Every entry funds fresh food packs prepared by Meals Across Sydney, while the event village features local food, music and a live impact wall.', '2026-10-18 16:30:00', '2026-10-18 20:30:00', 'Australia/Sydney', 65.00, 'AUD', 0, 80000.00, 51500.00, 1200, '/assets/covers/twilight-harbour.svg', 'published', 1, '2026-08-18 09:00:00'),
  (2, 1, 2, 2, 'Table of One Hundred Gala', 'table-of-one-hundred-gala', 'A landmark dinner where one room, one hundred guests and one night create lasting housing support.', 'Safe and stable housing for women and children.', 'Table of One Hundred Gala brings together civic leaders, community partners and supporters for a three-course dinner in the heart of Sydney. Guests hear directly from people with lived experience, enjoy a curated performance program and can pledge to fund practical housing outcomes. The evening includes a live appeal, accessible seating and a detailed impact report after the event.', '2026-11-07 18:30:00', '2026-11-07 23:00:00', 'Australia/Sydney', 260.00, 'AUD', 0, 150000.00, 86200.00, 100, '/assets/covers/table-of-one-hundred.svg', 'published', 1, '2026-08-25 10:00:00'),
  (3, 1, 3, 3, 'Art with Heart Silent Auction', 'art-with-heart-silent-auction', 'Discover work by emerging Sydney artists while funding creative programs for young people.', 'Creative mentoring and youth opportunity.', 'Art with Heart is an in-person silent auction featuring painting, photography, ceramics, textiles and limited-edition prints donated by artists and collectors. Guests can preview works online before the event, place digital bids and meet the artists. Funds support paid creative mentorships for young people facing barriers to employment.', '2026-10-03 18:00:00', '2026-10-03 22:00:00', 'Australia/Sydney', 45.00, 'AUD', 0, 50000.00, 41000.00, 420, '/assets/covers/art-with-heart.svg', 'published', 0, '2026-08-12 12:00:00'),
  (4, 1, 4, 4, 'Beats for Belonging', 'beats-for-belonging', 'A high-energy live concert raising funds for youth mentoring and creative workshops.', 'Youth belonging and creative participation.', 'Beats for Belonging brings together emerging and established Australian artists for a night of live music. The program celebrates the role creativity plays in helping young people feel connected, represented and supported. All net ticket revenue funds free after-school studio sessions, instruments and transport for participants.', '2026-12-04 19:00:00', '2026-12-04 23:30:00', 'Australia/Sydney', 58.00, 'AUD', 0, 65000.00, 23300.00, 850, '/assets/covers/beats-for-belonging.svg', 'published', 1, '2026-09-01 09:00:00'),
  (5, 2, 5, 5, 'Coastline Community Walk', 'coastline-community-walk', 'Walk from Manly to Freshwater with neighbours, volunteers and local conservationists.', 'Coastal habitat restoration and education.', 'Coastline Community Walk is a relaxed, accessible 6 km walk along the beach and headland. Participants can choose a shorter route and take part in family-friendly conservation activities at checkpoints. Funds support dune restoration, wildlife-safe clean-ups and school education programs.', '2026-10-25 08:00:00', '2026-10-25 12:00:00', 'Australia/Sydney', 0.00, 'AUD', 1, 30000.00, 17800.00, 700, '/assets/covers/coastline-walk.svg', 'published', 0, '2026-08-28 15:00:00'),
  (6, 3, 6, 6, 'Trivia for Tomorrow', 'trivia-for-tomorrow', 'Bring a team, test your knowledge and fund paid internship places for young people.', 'Youth training and first-job pathways.', 'Trivia for Tomorrow is a lively eight-round quiz hosted by local comedian Maddy Chen. Teams can bring their own snacks, purchase raffle tickets and take part in bonus challenges. The event is designed for workplaces, friendship groups and families, with accessible tables and a junior round.', '2026-11-19 18:30:00', '2026-11-19 22:00:00', 'Australia/Sydney', 35.00, 'AUD', 0, 45000.00, 12650.00, 260, '/assets/covers/trivia-tomorrow.svg', 'published', 0, '2026-09-02 11:00:00'),
  (7, 1, 7, 7, 'Sunrise Yoga for Shelter', 'sunrise-yoga-for-shelter', 'Start the day by the ocean with a guided practice supporting emergency accommodation.', 'Safe accommodation and practical support.', 'Sunrise Yoga for Shelter is a 60-minute, all-levels practice led by teacher Aisha Rahman. The session finishes with tea, fruit and a short conversation with a local housing partner. Bring a mat or towel; accessible seated options are available and a limited number of mats can be borrowed.', '2026-10-11 06:30:00', '2026-10-11 08:30:00', 'Australia/Sydney', 30.00, 'AUD', 0, 25000.00, 19400.00, 180, '/assets/covers/sunrise-yoga.svg', 'published', 0, '2026-08-22 08:00:00'),
  (8, 4, 8, 9, 'Long Lunch for Local Kids', 'long-lunch-for-local-kids', 'Share a long-table lunch made by local chefs and fund school holiday food packs.', 'School holiday food security.', 'Long Lunch for Local Kids is a relaxed outdoor lunch featuring produce donated by NSW growers and menus created by volunteer chefs. Guests share long tables, enjoy acoustic music and pack a food box as part of the program. Every ticket funds five school holiday food packs for local families.', '2026-11-29 12:00:00', '2026-11-29 16:00:00', 'Australia/Sydney', 95.00, 'AUD', 0, 60000.00, 21800.00, 350, '/assets/covers/long-lunch.svg', 'published', 0, '2026-09-05 10:00:00'),
  (9, 2, 5, 10, 'River Clean-Up and Community BBQ', 'river-clean-up-community-bbq', 'A hands-on morning removing litter from the Georges River followed by a free community BBQ.', 'Clean waterways and stronger local connections.', 'Volunteers work in supervised teams to remove litter from selected riverbank areas. Gloves, bags and safety equipment are provided. The morning closes with a free BBQ, live acoustic music and a short talk from local wildlife carers. Children are welcome with a supervising adult.', '2026-09-20 08:00:00', '2026-09-20 13:00:00', 'Australia/Sydney', 0.00, 'AUD', 1, 20000.00, 16750.00, 240, '/assets/covers/river-cleanup.svg', 'published', 0, '2026-07-20 09:00:00'),
  (10, 1, 2, 8, 'Winter Sleepout Fundraiser', 'winter-sleepout-fundraiser', 'A powerful overnight experience and fundraising challenge supporting local housing services.', 'Emergency housing and homelessness prevention.', 'Winter Sleepout Fundraiser invited participants to spend one night outdoors in a safe, facilitated environment. The program included lived-experience speakers, a simple shared meal, team fundraising and practical workshops about housing insecurity. This event has now concluded; its impact report remains available through the organiser.', '2026-08-15 18:00:00', '2026-08-16 07:00:00', 'Australia/Sydney', 40.00, 'AUD', 0, 90000.00, 93420.00, 300, '/assets/covers/winter-sleepout.svg', 'published', 0, '2026-06-15 09:00:00'),
  (11, 3, 6, 8, 'Fundraising Fundamentals Masterclass', 'fundraising-fundamentals-masterclass', 'An evening workshop for community fundraisers, paused while venue safety checks are completed.', 'Community fundraising capability.', 'This workshop was designed to help small community groups plan ethical campaigns, communicate impact and build sustainable supporter relationships. The listing is suspended from public results while the organiser completes venue checks.', '2026-10-30 18:00:00', '2026-10-30 21:00:00', 'Australia/Sydney', 25.00, 'AUD', 0, 15000.00, 4500.00, 120, '/assets/covers/fundraising-masterclass.svg', 'suspended', 0, NULL),
  (12, 4, 8, 9, 'Spring Pantry Packing Day', 'spring-pantry-packing-day', 'Help pack 10,000 family meals in one joyful, high-impact community session.', 'Reliable food relief for local families.', 'Spring Pantry Packing Day is a structured volunteer session where community members pack shelf-stable meal kits for distribution across Sydney. Volunteers rotate through simple stations with clear instructions, accessible tasks and regular breaks. All funds raised cover ingredients, packaging and delivery.', '2026-12-12 09:00:00', '2026-12-12 15:00:00', 'Australia/Sydney', 20.00, 'AUD', 0, 40000.00, 8900.00, 300, '/assets/covers/spring-pantry.svg', 'published', 0, '2026-09-08 14:00:00');

INSERT INTO event_highlights (event_id, display_order, title, detail)
VALUES
  (1, 1, 'Choose your distance', 'A chip-timed 10K or a relaxed 5K walk, both starting at Barangaroo Reserve.'),
  (1, 2, 'Fund meals directly', 'Every adult entry funds at least 12 fresh meal packs for local families.'),
  (1, 3, 'Stay for the village', 'Local food, live music and an impact wall from 4:30 pm.'),
  (2, 1, 'A meal with meaning', 'Three courses, a curated program and direct stories from the community.'),
  (2, 2, 'Pledge with confidence', 'A post-event report explains where every donation was directed.'),
  (2, 3, 'Accessible by design', 'Step-free access, dietary options and support attendants are available.'),
  (3, 1, 'Preview and bid', 'Explore donated works before the event and continue bidding on your phone.'),
  (3, 2, 'Meet the makers', 'Artists will be present across the gallery from 6:30 pm.'),
  (3, 3, 'Fund paid mentorships', 'Auction proceeds create paid creative mentor roles for young people.'),
  (4, 1, 'Four live acts', 'A cross-genre line-up selected with young local musicians.'),
  (4, 2, 'Accessible ticketing', 'Companion cards accepted and accessible seating can be reserved.'),
  (4, 3, 'Support the studio', 'Net ticket revenue funds free after-school sessions.'),
  (5, 1, 'Walk your way', 'Choose the 6 km coastal route or the accessible 2 km foreshore loop.'),
  (5, 2, 'Make a difference on the day', 'Volunteer-led stations include dune care and a micro-plastics survey.'),
  (5, 3, 'Free to join', 'Registration is free; fundraising is encouraged but optional.'),
  (6, 1, 'Eight rounds', 'Questions cover music, sport, Sydney history and general knowledge.'),
  (6, 2, 'Teams of six', 'Book a table or join a mixed community team.'),
  (6, 3, 'Raffle and bonus rounds', 'Extra challenges can be added without leaving your seat.'),
  (7, 1, 'All levels welcome', 'Guided options are offered for beginners, experienced practitioners and seated participants.'),
  (7, 2, 'A calm start', 'Arrive from 6:15 am for a quiet stretch and ocean-side welcome.'),
  (7, 3, 'Breakfast included', 'Tea, fruit and a community conversation follow the practice.'),
  (8, 1, 'Chef-led long lunch', 'A seasonal menu prepared by volunteer chefs and NSW producers.'),
  (8, 2, 'Pack a box', 'Every guest helps assemble a school holiday food pack.'),
  (8, 3, 'Family friendly', 'Children under 12 attend free when accompanied by an adult.'),
  (9, 1, 'All equipment supplied', 'Gloves, bags, pickers and safety briefings are provided.'),
  (9, 2, 'Supervised teams', 'Volunteers work in small groups with trained site leaders.'),
  (9, 3, 'Free community BBQ', 'Stay for lunch, music and a talk from local wildlife carers.'),
  (10, 1, 'One night, shared purpose', 'A facilitated overnight experience in a safe, supervised setting.'),
  (10, 2, 'Hear lived experience', 'Community speakers share practical perspectives on housing insecurity.'),
  (10, 3, 'Fund long-term support', 'Donations support case management, food and emergency accommodation.'),
  (12, 1, 'Simple, accessible tasks', 'No experience is needed; seated packing roles are available.'),
  (12, 2, 'Clear impact target', 'The team will pack 10,000 shelf-stable family meals.'),
  (12, 3, 'Take home the story', 'Volunteers receive a post-event impact update and thank-you pack.');

-- ---------------------------------------------------------------------------
-- NEW IN ASSESSMENT 3: event registrations
-- ---------------------------------------------------------------------------
-- 16 registrations spread across nine events. The set deliberately covers:
--   * several events with more than one registration, so the event detail page
--     has a real list to sort by "latest ticket purchased first";
--   * one registration on the suspended event (event 11) and several on past
--     events, so the admin list has to show every status;
--   * two events (4 and 9) with no registrations at all, so the admin Delete
--     button can be demonstrated successfully as well as blocked.
-- Every email address is unique inside its event, which satisfies the
-- uq_registrations_event_email unique key.
INSERT INTO registrations
  (registration_id, event_id, reference_code, attendee_first_name, attendee_last_name, attendee_email, attendee_phone, ticket_quantity, registration_date, notes, status)
VALUES
  (1,  1,  'REG-2026-000101', 'Amelia',     'Nguyen',       'amelia.nguyen@example.com',     '0402 118 774', 2, '2026-08-20 09:14:00', 'Two tickets for the 10 km run.',        'confirmed'),
  (2,  1,  'REG-2026-000102', 'Daniel',     'Okafor',       'daniel.okafor@example.com',     '0411 552 908', 1, '2026-08-21 17:02:00', NULL,                                    'confirmed'),
  (3,  1,  'REG-2026-000103', 'Priya',      'Raman',        'priya.raman@example.com',       '0433 907 221', 4, '2026-09-02 12:45:00', 'Family team entry.',                    'confirmed'),
  (4,  2,  'REG-2026-000104', 'Marcus',     'Lee',          'marcus.lee@example.com',        '0421 664 330', 2, '2026-08-27 19:30:00', 'Accessible seating required.',          'confirmed'),
  (5,  2,  'REG-2026-000105', 'Helen',      'Papadopoulos', 'helen.papa@example.com',        '0407 231 886', 6, '2026-09-10 08:55:00', 'Table of six for the gala dinner.',     'confirmed'),
  (6,  3,  'REG-2026-000106', 'Sofia',      'Marchetti',    'sofia.marchetti@example.com',   '0412 774 019', 1, '2026-09-05 15:20:00', NULL,                                    'confirmed'),
  (7,  3,  'REG-2026-000107', 'Toby',       'Williams',     'toby.williams@example.com',     '0455 018 662', 3, '2026-09-18 11:05:00', 'Interested in the ceramics lots.',      'confirmed'),
  (8,  5,  'REG-2026-000108', 'Grace',      'Chen',         'grace.chen@example.com',        '0413 220 550', 2, '2026-09-12 07:40:00', NULL,                                    'confirmed'),
  (9,  6,  'REG-2026-000109', 'Isaac',      'Kowalski',     'isaac.kowalski@example.com',    '0466 341 209', 1, '2026-09-14 20:10:00', NULL,                                    'confirmed'),
  (10, 6,  'REG-2026-000110', 'Nora',       'Haddad',       'nora.haddad@example.com',       '0434 556 771', 8, '2026-09-25 13:25:00', 'Whole quiz team booking.',              'confirmed'),
  (11, 7,  'REG-2026-000111', 'Liam',       "O'Sullivan",   'liam.osullivan@example.com',    '0401 998 336', 2, '2026-09-26 06:15:00', 'Bringing a yoga mat each.',             'confirmed'),
  (12, 8,  'REG-2026-000112', 'Yuki',       'Tanaka',       'yuki.tanaka@example.com',       '0422 117 480', 4, '2026-09-21 10:35:00', 'Two vegetarian meals requested.',       'confirmed'),
  (13, 10, 'REG-2026-000113', 'Charlotte',  'Brown',        'charlotte.brown@example.com',   '0448 662 019', 2, '2026-07-28 21:50:00', 'Sleepout registration for two adults.', 'confirmed'),
  (14, 10, 'REG-2026-000114', 'Ahmed',      'Farah',        'ahmed.farah@example.com',       '0419 335 240', 5, '2026-08-05 09:05:00', 'Community group booking.',              'confirmed'),
  (15, 12, 'REG-2026-000115', 'Rebecca',    'Nowak',        'rebecca.nowak@example.com',     '0427 884 613', 3, '2026-10-01 14:30:00', NULL,                                    'confirmed'),
  (16, 11, 'REG-2026-000116', 'Thomas',     'Reid',         'thomas.reid@example.com',       '0416 273 908', 1, '2026-09-24 16:45:00', 'Registration kept after the suspension.', 'confirmed');
