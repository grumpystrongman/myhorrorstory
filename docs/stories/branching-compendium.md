# Story Branching Compendium

Generated: 2026-03-20T14:49:19.348Z

This index summarizes each shipped story package: hook, arc progression, trigger rules, branching moments, and ending outcomes.

## Black Chapel Ledger
- Story ID: `black-chapel-ledger`
- Subgenre: gothic horror
- Tone: EERIE
- Hook: A cathedral ledger records debts paid in memory instead of money.
- Session Window: 90 minutes
- Replay Hooks: 3

### Arc Map
- OPENING: **Contact and Contradiction** — The case opens with impossible evidence and uncertain allies. (rules: black-chapel-ledger-rule-first-contact, black-chapel-ledger-rule-delay-punish)
- MIDDLE: **Interference and Doubt** — Villain contact escalates while ally trust becomes volatile. (rules: black-chapel-ledger-rule-incorrect-accusation, black-chapel-ledger-rule-ally-cooperation)
- ENDGAME: **Confrontation and Reckoning** — The final branch depends on ethics, timing, and trust. (rules: black-chapel-ledger-rule-near-success, black-chapel-ledger-rule-moral-fork)

### Branching Moments
- Archive verification vs keeper confrontation
- Public disclosure vs private restitution

### Trigger Rules
- `black-chapel-ledger-rule-first-contact` (CLUE_DISCOVERED) — First Villain Contact; actions: ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `black-chapel-ledger-rule-delay-punish` (PLAYER_DELAY) — Silence Punisher; actions: SEND_MESSAGE, EMIT_EVENT
- `black-chapel-ledger-rule-incorrect-accusation` (PLAYER_ACCUSATION) — Wrong Accusation Fallout; actions: UPDATE_NPC_TRUST, ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `black-chapel-ledger-rule-ally-cooperation` (NPC_TRUST_CHANGED) — Ally Cooperation Reward; actions: REVEAL_CLUE, SET_FLAG
- `black-chapel-ledger-rule-near-success` (INVESTIGATION_PROGRESS) — Near Success Ultimatum; actions: ADVANCE_VILLAIN_STAGE, START_COUNTDOWN, SEND_MESSAGE
- `black-chapel-ledger-rule-moral-fork` (PLAYER_MESSAGE) — Corruption Offer; actions: UNLOCK_ENDING, SEND_MESSAGE

### Ending Variants
- JUSTICE: **Clean Resolution** — You expose the debt network and return stolen identities to survivors. (hook: A tagged evidence box points to the next case.)
- PYRRHIC: **Compromised Truth** — You close the cathedral operation but lose key testimony to fear. (hook: A surviving witness asks for help in a linked disappearance.)
- CORRUPTION: **Corruption Pact** — You accept selective erasures and become keeper of the ledger. (hook: Season continuity marks the player as compromised.)

### Villain Escalation
- Stage 1: Peripheral Presence — Signal surveillance without identity. (max touches/day: 2)
- Stage 2: Psychological Contact — Break trust between player and allies. (max touches/day: 3)
- Stage 3: Active Interference — Force tactical mistakes. (max touches/day: 3)
- Stage 4: Personal Confrontation — Recruit, corrupt, or break the player. (max touches/day: 4)

## Crown of Salt
- Story ID: `crown-of-salt`
- Subgenre: occult conspiracy
- Tone: CINEMATIC
- Hook: A relic-smuggling cartel launders artifacts through a city that disappears at dawn tide.
- Session Window: 100 minutes
- Replay Hooks: 3

### Arc Map
- OPENING: **Contact and Contradiction** — The case opens with impossible evidence and uncertain allies. (rules: crown-of-salt-rule-first-contact, crown-of-salt-rule-delay-punish)
- MIDDLE: **Interference and Doubt** — Villain contact escalates while ally trust becomes volatile. (rules: crown-of-salt-rule-incorrect-accusation, crown-of-salt-rule-ally-cooperation)
- ENDGAME: **Confrontation and Reckoning** — The final branch depends on ethics, timing, and trust. (rules: crown-of-salt-rule-near-success, crown-of-salt-rule-moral-fork)

### Branching Moments
- Manifest audit vs smuggler flip opening
- Expose logistics vs sever ritual command

### Trigger Rules
- `crown-of-salt-rule-first-contact` (CLUE_DISCOVERED) — First Villain Contact; actions: ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `crown-of-salt-rule-delay-punish` (PLAYER_DELAY) — Silence Punisher; actions: SEND_MESSAGE, EMIT_EVENT
- `crown-of-salt-rule-incorrect-accusation` (PLAYER_ACCUSATION) — Wrong Accusation Fallout; actions: UPDATE_NPC_TRUST, ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `crown-of-salt-rule-ally-cooperation` (NPC_TRUST_CHANGED) — Ally Cooperation Reward; actions: REVEAL_CLUE, SET_FLAG
- `crown-of-salt-rule-near-success` (INVESTIGATION_PROGRESS) — Near Success Ultimatum; actions: ADVANCE_VILLAIN_STAGE, START_COUNTDOWN, SEND_MESSAGE
- `crown-of-salt-rule-moral-fork` (PLAYER_MESSAGE) — Corruption Offer; actions: UNLOCK_ENDING, SEND_MESSAGE

### Ending Variants
- JUSTICE: **Clean Resolution** — You dismantle the smuggling lattice and preserve admissible evidence. (hook: A tagged evidence box points to the next case.)
- PYRRHIC: **Compromised Truth** — You collapse the ritual cell but lose legal leverage over sponsors. (hook: A surviving witness asks for help in a linked disappearance.)
- CORRUPTION: **Corruption Pact** — You become gatekeeper of relic flow under a private pact. (hook: Season continuity marks the player as compromised.)

### Villain Escalation
- Stage 1: Peripheral Presence — Signal surveillance without identity. (max touches/day: 2)
- Stage 2: Psychological Contact — Break trust between player and allies. (max touches/day: 3)
- Stage 3: Active Interference — Force tactical mistakes. (max touches/day: 3)
- Stage 4: Personal Confrontation — Recruit, corrupt, or break the player. (max touches/day: 4)

## Dead Channel Protocol
- Story ID: `dead-channel-protocol`
- Subgenre: techno/paranormal thriller
- Tone: GROUNDED
- Hook: A ghost app predicts outages, deaths, and your next move.
- Session Window: 88 minutes
- Replay Hooks: 3

### Arc Map
- OPENING: **Contact and Contradiction** — The case opens with impossible evidence and uncertain allies. (rules: dead-channel-protocol-rule-first-contact, dead-channel-protocol-rule-delay-punish)
- MIDDLE: **Interference and Doubt** — Villain contact escalates while ally trust becomes volatile. (rules: dead-channel-protocol-rule-incorrect-accusation, dead-channel-protocol-rule-ally-cooperation)
- ENDGAME: **Confrontation and Reckoning** — The final branch depends on ethics, timing, and trust. (rules: dead-channel-protocol-rule-near-success, dead-channel-protocol-rule-moral-fork)

### Branching Moments
- Code audit vs field response opening
- Disable network vs exploit protocol for leverage

### Trigger Rules
- `dead-channel-protocol-rule-first-contact` (CLUE_DISCOVERED) — First Villain Contact; actions: ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `dead-channel-protocol-rule-delay-punish` (PLAYER_DELAY) — Silence Punisher; actions: SEND_MESSAGE, EMIT_EVENT
- `dead-channel-protocol-rule-incorrect-accusation` (PLAYER_ACCUSATION) — Wrong Accusation Fallout; actions: UPDATE_NPC_TRUST, ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `dead-channel-protocol-rule-ally-cooperation` (NPC_TRUST_CHANGED) — Ally Cooperation Reward; actions: REVEAL_CLUE, SET_FLAG
- `dead-channel-protocol-rule-near-success` (INVESTIGATION_PROGRESS) — Near Success Ultimatum; actions: ADVANCE_VILLAIN_STAGE, START_COUNTDOWN, SEND_MESSAGE
- `dead-channel-protocol-rule-moral-fork` (PLAYER_MESSAGE) — Corruption Offer; actions: UNLOCK_ENDING, SEND_MESSAGE

### Ending Variants
- JUSTICE: **Clean Resolution** — You isolate protocol command and preserve chain-of-custody for prosecution. (hook: A tagged evidence box points to the next case.)
- PYRRHIC: **Compromised Truth** — You neutralize the app but trigger cascading outages and civic panic. (hook: A surviving witness asks for help in a linked disappearance.)
- CORRUPTION: **Corruption Pact** — You keep protocol access and become curator of selective outages. (hook: Season continuity marks the player as compromised.)

### Villain Escalation
- Stage 1: Peripheral Presence — Signal surveillance without identity. (max touches/day: 2)
- Stage 2: Psychological Contact — Break trust between player and allies. (max touches/day: 3)
- Stage 3: Active Interference — Force tactical mistakes. (max touches/day: 3)
- Stage 4: Personal Confrontation — Recruit, corrupt, or break the player. (max touches/day: 4)

## Midnight Lockbox
- Story ID: `midnight-lockbox`
- Subgenre: supernatural mystery
- Tone: GROUNDED
- Hook: A self-storage unit with no renter sends voice memos predicting what your team will do next.
- Session Window: 36 minutes
- Replay Hooks: 3

### Arc Map
- OPENING: **Lockbox Contact** — An impossible voicemail starts the case at the storage facility. (rules: midnight-lockbox-rule-first-contact, midnight-lockbox-rule-delay-punish)
- MIDDLE: **Leak and Fracture** — Daylight leaks force trust decisions under public pressure. (rules: midnight-lockbox-rule-incorrect-accusation, midnight-lockbox-rule-ally-cooperation)
- ENDGAME: **Second-Night Reckoning** — A final tunnel run decides truth, compromise, or collapse. (rules: midnight-lockbox-rule-near-success, midnight-lockbox-rule-moral-fork)

### Branching Moments
- Digital audit-first versus witness-first opening
- Public reveal versus covert extraction at noon

### Trigger Rules
- `midnight-lockbox-rule-first-contact` (CLUE_DISCOVERED) — First Lockbox Contact; actions: ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `midnight-lockbox-rule-delay-punish` (PLAYER_DELAY) — Delayed Reply Exposure; actions: SEND_MESSAGE, EMIT_EVENT
- `midnight-lockbox-rule-incorrect-accusation` (PLAYER_ACCUSATION) — Wrong Accusation Fallout; actions: UPDATE_NPC_TRUST, ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `midnight-lockbox-rule-ally-cooperation` (NPC_TRUST_CHANGED) — Ally Cooperation Reward; actions: REVEAL_CLUE, SET_FLAG
- `midnight-lockbox-rule-near-success` (INVESTIGATION_PROGRESS) — Day-Two Ultimatum; actions: ADVANCE_VILLAIN_STAGE, START_COUNTDOWN, SEND_MESSAGE
- `midnight-lockbox-rule-moral-fork` (PLAYER_MESSAGE) — Corruption Offer; actions: UNLOCK_ENDING, SEND_MESSAGE

### Ending Variants
- JUSTICE: **Sealed Evidence Conviction** — You preserve the chain and expose the extortion network before the deadline. (hook: A tagged evidence box points to the next case.)
- PYRRHIC: **Witness Saved, Truth Damaged** — You save the witness but lose admissible evidence in the rush. (hook: A surviving witness asks for help in a linked disappearance.)
- CORRUPTION: **Quartermaster Pact** — You trade transparency for operational control over future lockboxes. (hook: Season continuity marks the player as compromised.)

### Villain Escalation
- Stage 1: Peripheral Presence — Signal surveillance without identity. (max touches/day: 2)
- Stage 2: Psychological Contact — Break trust between player and allies. (max touches/day: 3)
- Stage 3: Active Interference — Force tactical mistakes. (max touches/day: 3)
- Stage 4: Personal Confrontation — Recruit, corrupt, or break the player. (max touches/day: 4)

## Red Creek Winter
- Story ID: `red-creek-winter`
- Subgenre: small-town slasher mystery
- Tone: INTENSE
- Hook: Each snowfall uncovers one body and one impossible alibi.
- Session Window: 90 minutes
- Replay Hooks: 3

### Arc Map
- OPENING: **Contact and Contradiction** — The case opens with impossible evidence and uncertain allies. (rules: red-creek-winter-rule-first-contact, red-creek-winter-rule-delay-punish)
- MIDDLE: **Interference and Doubt** — Villain contact escalates while ally trust becomes volatile. (rules: red-creek-winter-rule-incorrect-accusation, red-creek-winter-rule-ally-cooperation)
- ENDGAME: **Confrontation and Reckoning** — The final branch depends on ethics, timing, and trust. (rules: red-creek-winter-rule-near-success, red-creek-winter-rule-moral-fork)

### Branching Moments
- Forensics-first vs interrogation-first opening
- Protect survivor vs bait killer with false lead

### Trigger Rules
- `red-creek-winter-rule-first-contact` (CLUE_DISCOVERED) — First Villain Contact; actions: ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `red-creek-winter-rule-delay-punish` (PLAYER_DELAY) — Silence Punisher; actions: SEND_MESSAGE, EMIT_EVENT
- `red-creek-winter-rule-incorrect-accusation` (PLAYER_ACCUSATION) — Wrong Accusation Fallout; actions: UPDATE_NPC_TRUST, ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `red-creek-winter-rule-ally-cooperation` (NPC_TRUST_CHANGED) — Ally Cooperation Reward; actions: REVEAL_CLUE, SET_FLAG
- `red-creek-winter-rule-near-success` (INVESTIGATION_PROGRESS) — Near Success Ultimatum; actions: ADVANCE_VILLAIN_STAGE, START_COUNTDOWN, SEND_MESSAGE
- `red-creek-winter-rule-moral-fork` (PLAYER_MESSAGE) — Corruption Offer; actions: UNLOCK_ENDING, SEND_MESSAGE

### Ending Variants
- JUSTICE: **Clean Resolution** — You secure both culprit and corroborated chain before storm lift. (hook: A tagged evidence box points to the next case.)
- PYRRHIC: **Compromised Truth** — You stop killings but ignite permanent distrust in local institutions. (hook: A surviving witness asks for help in a linked disappearance.)
- CORRUPTION: **Corruption Pact** — You accept staged closure to keep panic and tourism revenue controlled. (hook: Season continuity marks the player as compromised.)

### Villain Escalation
- Stage 1: Peripheral Presence — Signal surveillance without identity. (max touches/day: 2)
- Stage 2: Psychological Contact — Break trust between player and allies. (max touches/day: 3)
- Stage 3: Active Interference — Force tactical mistakes. (max touches/day: 3)
- Stage 4: Personal Confrontation — Recruit, corrupt, or break the player. (max touches/day: 4)

## Signal From Kharon-9
- Story ID: `signal-from-kharon-9`
- Subgenre: cosmic horror
- Tone: INTENSE
- Hook: Telemetry returns from a decommissioned orbital array and predicts player replies.
- Session Window: 100 minutes
- Replay Hooks: 3

### Arc Map
- OPENING: **Contact and Contradiction** — The case opens with impossible evidence and uncertain allies. (rules: signal-from-kharon-9-rule-first-contact, signal-from-kharon-9-rule-delay-punish)
- MIDDLE: **Interference and Doubt** — Villain contact escalates while ally trust becomes volatile. (rules: signal-from-kharon-9-rule-incorrect-accusation, signal-from-kharon-9-rule-ally-cooperation)
- ENDGAME: **Confrontation and Reckoning** — The final branch depends on ethics, timing, and trust. (rules: signal-from-kharon-9-rule-near-success, signal-from-kharon-9-rule-moral-fork)

### Branching Moments
- Sandbox isolate vs immediate decode
- Seal transmission vs weaponize prediction

### Trigger Rules
- `signal-from-kharon-9-rule-first-contact` (CLUE_DISCOVERED) — First Villain Contact; actions: ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `signal-from-kharon-9-rule-delay-punish` (PLAYER_DELAY) — Silence Punisher; actions: SEND_MESSAGE, EMIT_EVENT
- `signal-from-kharon-9-rule-incorrect-accusation` (PLAYER_ACCUSATION) — Wrong Accusation Fallout; actions: UPDATE_NPC_TRUST, ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `signal-from-kharon-9-rule-ally-cooperation` (NPC_TRUST_CHANGED) — Ally Cooperation Reward; actions: REVEAL_CLUE, SET_FLAG
- `signal-from-kharon-9-rule-near-success` (INVESTIGATION_PROGRESS) — Near Success Ultimatum; actions: ADVANCE_VILLAIN_STAGE, START_COUNTDOWN, SEND_MESSAGE
- `signal-from-kharon-9-rule-moral-fork` (PLAYER_MESSAGE) — Corruption Offer; actions: UNLOCK_ENDING, SEND_MESSAGE

### Ending Variants
- JUSTICE: **Clean Resolution** — You isolate the hostile signal and preserve proof without total blackout. (hook: A tagged evidence box points to the next case.)
- PYRRHIC: **Compromised Truth** — You stop the broadcast but lose the array team in shutdown. (hook: A surviving witness asks for help in a linked disappearance.)
- CORRUPTION: **Corruption Pact** — You feed selected data to the signal for strategic advantage. (hook: Season continuity marks the player as compromised.)

### Villain Escalation
- Stage 1: Peripheral Presence — Signal surveillance without identity. (max touches/day: 2)
- Stage 2: Psychological Contact — Break trust between player and allies. (max touches/day: 3)
- Stage 3: Active Interference — Force tactical mistakes. (max touches/day: 3)
- Stage 4: Personal Confrontation — Recruit, corrupt, or break the player. (max touches/day: 4)

## Static Between Stations
- Story ID: `static-between-stations`
- Subgenre: psychological horror
- Tone: CINEMATIC
- Hook: A dead rail line broadcasts private confessions in the players' own voices.
- Session Window: 95 minutes
- Replay Hooks: 3

### Arc Map
- OPENING: **Contact and Contradiction** — The case opens with impossible evidence and uncertain allies. (rules: static-between-stations-rule-first-contact, static-between-stations-rule-delay-punish)
- MIDDLE: **Interference and Doubt** — Villain contact escalates while ally trust becomes volatile. (rules: static-between-stations-rule-incorrect-accusation, static-between-stations-rule-ally-cooperation)
- ENDGAME: **Confrontation and Reckoning** — The final branch depends on ethics, timing, and trust. (rules: static-between-stations-rule-near-success, static-between-stations-rule-moral-fork)

### Branching Moments
- Telecom trace vs witness-first opening
- Rescue route vs forensic route under ultimatum

### Trigger Rules
- `static-between-stations-rule-first-contact` (CLUE_DISCOVERED) — First Villain Contact; actions: ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `static-between-stations-rule-delay-punish` (PLAYER_DELAY) — Silence Punisher; actions: SEND_MESSAGE, EMIT_EVENT
- `static-between-stations-rule-incorrect-accusation` (PLAYER_ACCUSATION) — Wrong Accusation Fallout; actions: UPDATE_NPC_TRUST, ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `static-between-stations-rule-ally-cooperation` (NPC_TRUST_CHANGED) — Ally Cooperation Reward; actions: REVEAL_CLUE, SET_FLAG
- `static-between-stations-rule-near-success` (INVESTIGATION_PROGRESS) — Near Success Ultimatum; actions: ADVANCE_VILLAIN_STAGE, START_COUNTDOWN, SEND_MESSAGE
- `static-between-stations-rule-moral-fork` (PLAYER_MESSAGE) — Corruption Offer; actions: UNLOCK_ENDING, SEND_MESSAGE

### Ending Variants
- JUSTICE: **Clean Resolution** — You expose the broadcast architecture and keep the last witness alive. (hook: A tagged evidence box points to the next case.)
- PYRRHIC: **Compromised Truth** — You identify the culprit but lose the witness chain and public confidence. (hook: A surviving witness asks for help in a linked disappearance.)
- CORRUPTION: **Corruption Pact** — You accept the Curator's private channel and bury the official case. (hook: Season continuity marks the player as compromised.)

### Villain Escalation
- Stage 1: Peripheral Presence — Signal surveillance without identity. (max touches/day: 2)
- Stage 2: Psychological Contact — Break trust between player and allies. (max touches/day: 3)
- Stage 3: Active Interference — Force tactical mistakes. (max touches/day: 3)
- Stage 4: Personal Confrontation — Recruit, corrupt, or break the player. (max touches/day: 4)

## Tape 17: Pinewatch
- Story ID: `tape-17-pinewatch`
- Subgenre: found-footage investigation
- Tone: GROUNDED
- Hook: A recovered camcorder tape rewrites itself every midnight.
- Session Window: 80 minutes
- Replay Hooks: 3

### Arc Map
- OPENING: **Contact and Contradiction** — The case opens with impossible evidence and uncertain allies. (rules: tape-17-pinewatch-rule-first-contact, tape-17-pinewatch-rule-delay-punish)
- MIDDLE: **Interference and Doubt** — Villain contact escalates while ally trust becomes volatile. (rules: tape-17-pinewatch-rule-incorrect-accusation, tape-17-pinewatch-rule-ally-cooperation)
- ENDGAME: **Confrontation and Reckoning** — The final branch depends on ethics, timing, and trust. (rules: tape-17-pinewatch-rule-near-success, tape-17-pinewatch-rule-moral-fork)

### Branching Moments
- Forensics-first vs witness-first opening
- Field reenactment vs archive triangulation

### Trigger Rules
- `tape-17-pinewatch-rule-first-contact` (CLUE_DISCOVERED) — First Villain Contact; actions: ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `tape-17-pinewatch-rule-delay-punish` (PLAYER_DELAY) — Silence Punisher; actions: SEND_MESSAGE, EMIT_EVENT
- `tape-17-pinewatch-rule-incorrect-accusation` (PLAYER_ACCUSATION) — Wrong Accusation Fallout; actions: UPDATE_NPC_TRUST, ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `tape-17-pinewatch-rule-ally-cooperation` (NPC_TRUST_CHANGED) — Ally Cooperation Reward; actions: REVEAL_CLUE, SET_FLAG
- `tape-17-pinewatch-rule-near-success` (INVESTIGATION_PROGRESS) — Near Success Ultimatum; actions: ADVANCE_VILLAIN_STAGE, START_COUNTDOWN, SEND_MESSAGE
- `tape-17-pinewatch-rule-moral-fork` (PLAYER_MESSAGE) — Corruption Offer; actions: UNLOCK_ENDING, SEND_MESSAGE

### Ending Variants
- JUSTICE: **Clean Resolution** — You preserve the authentic footage chain and rescue the final survivor. (hook: A tagged evidence box points to the next case.)
- PYRRHIC: **Compromised Truth** — You identify the editor but lose crucial footage and one victim contact. (hook: A surviving witness asks for help in a linked disappearance.)
- CORRUPTION: **Corruption Pact** — You trade the original tape for influence over what the public sees. (hook: Season continuity marks the player as compromised.)

### Villain Escalation
- Stage 1: Peripheral Presence — Signal surveillance without identity. (max touches/day: 2)
- Stage 2: Psychological Contact — Break trust between player and allies. (max touches/day: 3)
- Stage 3: Active Interference — Force tactical mistakes. (max touches/day: 3)
- Stage 4: Personal Confrontation — Recruit, corrupt, or break the player. (max touches/day: 4)

## The Fourth Tenant
- Story ID: `the-fourth-tenant`
- Subgenre: supernatural mystery
- Tone: EERIE
- Hook: Rent is collected from an apartment that appears on no official map.
- Session Window: 85 minutes
- Replay Hooks: 3

### Arc Map
- OPENING: **Contact and Contradiction** — The case opens with impossible evidence and uncertain allies. (rules: the-fourth-tenant-rule-first-contact, the-fourth-tenant-rule-delay-punish)
- MIDDLE: **Interference and Doubt** — Villain contact escalates while ally trust becomes volatile. (rules: the-fourth-tenant-rule-incorrect-accusation, the-fourth-tenant-rule-ally-cooperation)
- ENDGAME: **Confrontation and Reckoning** — The final branch depends on ethics, timing, and trust. (rules: the-fourth-tenant-rule-near-success, the-fourth-tenant-rule-moral-fork)

### Branching Moments
- Records-first vs pursuit-first opening
- Expose fraud publicly vs close case quietly

### Trigger Rules
- `the-fourth-tenant-rule-first-contact` (CLUE_DISCOVERED) — First Villain Contact; actions: ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `the-fourth-tenant-rule-delay-punish` (PLAYER_DELAY) — Silence Punisher; actions: SEND_MESSAGE, EMIT_EVENT
- `the-fourth-tenant-rule-incorrect-accusation` (PLAYER_ACCUSATION) — Wrong Accusation Fallout; actions: UPDATE_NPC_TRUST, ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `the-fourth-tenant-rule-ally-cooperation` (NPC_TRUST_CHANGED) — Ally Cooperation Reward; actions: REVEAL_CLUE, SET_FLAG
- `the-fourth-tenant-rule-near-success` (INVESTIGATION_PROGRESS) — Near Success Ultimatum; actions: ADVANCE_VILLAIN_STAGE, START_COUNTDOWN, SEND_MESSAGE
- `the-fourth-tenant-rule-moral-fork` (PLAYER_MESSAGE) — Corruption Offer; actions: UNLOCK_ENDING, SEND_MESSAGE

### Ending Variants
- JUSTICE: **Clean Resolution** — You prove the tenant scheme and secure testimony before records vanish. (hook: A tagged evidence box points to the next case.)
- PYRRHIC: **Compromised Truth** — You expose fraud, but a key tenant disappears from all records. (hook: A surviving witness asks for help in a linked disappearance.)
- CORRUPTION: **Corruption Pact** — You accept ownership of Unit 4 and rewrite occupancy history. (hook: Season continuity marks the player as compromised.)

### Villain Escalation
- Stage 1: Peripheral Presence — Signal surveillance without identity. (max touches/day: 2)
- Stage 2: Psychological Contact — Break trust between player and allies. (max touches/day: 3)
- Stage 3: Active Interference — Force tactical mistakes. (max touches/day: 3)
- Stage 4: Personal Confrontation — Recruit, corrupt, or break the player. (max touches/day: 4)

## The Harvest Men
- Story ID: `the-harvest-men`
- Subgenre: folk horror
- Tone: SLOW_BURN
- Hook: A ritual mask selects a new wearer every dusk, and refusals vanish overnight.
- Session Window: 100 minutes
- Replay Hooks: 3

### Arc Map
- OPENING: **Contact and Contradiction** — The case opens with impossible evidence and uncertain allies. (rules: the-harvest-men-rule-first-contact, the-harvest-men-rule-delay-punish)
- MIDDLE: **Interference and Doubt** — Villain contact escalates while ally trust becomes volatile. (rules: the-harvest-men-rule-incorrect-accusation, the-harvest-men-rule-ally-cooperation)
- ENDGAME: **Confrontation and Reckoning** — The final branch depends on ethics, timing, and trust. (rules: the-harvest-men-rule-near-success, the-harvest-men-rule-moral-fork)

### Branching Moments
- Scientific analysis vs witness protection opening
- Break rite now vs infiltrate final rite

### Trigger Rules
- `the-harvest-men-rule-first-contact` (CLUE_DISCOVERED) — First Villain Contact; actions: ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `the-harvest-men-rule-delay-punish` (PLAYER_DELAY) — Silence Punisher; actions: SEND_MESSAGE, EMIT_EVENT
- `the-harvest-men-rule-incorrect-accusation` (PLAYER_ACCUSATION) — Wrong Accusation Fallout; actions: UPDATE_NPC_TRUST, ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `the-harvest-men-rule-ally-cooperation` (NPC_TRUST_CHANGED) — Ally Cooperation Reward; actions: REVEAL_CLUE, SET_FLAG
- `the-harvest-men-rule-near-success` (INVESTIGATION_PROGRESS) — Near Success Ultimatum; actions: ADVANCE_VILLAIN_STAGE, START_COUNTDOWN, SEND_MESSAGE
- `the-harvest-men-rule-moral-fork` (PLAYER_MESSAGE) — Corruption Offer; actions: UNLOCK_ENDING, SEND_MESSAGE

### Ending Variants
- JUSTICE: **Clean Resolution** — You dismantle the selection machine and evacuate vulnerable targets alive. (hook: A tagged evidence box points to the next case.)
- PYRRHIC: **Compromised Truth** — You halt tonight's rite but trigger retaliatory disappearances. (hook: A surviving witness asks for help in a linked disappearance.)
- CORRUPTION: **Corruption Pact** — You preserve the rite in exchange for selective immunity. (hook: Season continuity marks the player as compromised.)

### Villain Escalation
- Stage 1: Peripheral Presence — Signal surveillance without identity. (max touches/day: 2)
- Stage 2: Psychological Contact — Break trust between player and allies. (max touches/day: 3)
- Stage 3: Active Interference — Force tactical mistakes. (max touches/day: 3)
- Stage 4: Personal Confrontation — Recruit, corrupt, or break the player. (max touches/day: 4)

## Ward 1908
- Story ID: `ward-1908`
- Subgenre: haunted institution
- Tone: SLOW_BURN
- Hook: A closed psychiatric hospital updates patient files every night at 1:08 a.m.
- Session Window: 95 minutes
- Replay Hooks: 3

### Arc Map
- OPENING: **Contact and Contradiction** — The case opens with impossible evidence and uncertain allies. (rules: ward-1908-rule-first-contact, ward-1908-rule-delay-punish)
- MIDDLE: **Interference and Doubt** — Villain contact escalates while ally trust becomes volatile. (rules: ward-1908-rule-incorrect-accusation, ward-1908-rule-ally-cooperation)
- ENDGAME: **Confrontation and Reckoning** — The final branch depends on ethics, timing, and trust. (rules: ward-1908-rule-near-success, ward-1908-rule-moral-fork)

### Branching Moments
- Archive-first vs nurse-first opening
- Restore names publicly vs protect descendants privately

### Trigger Rules
- `ward-1908-rule-first-contact` (CLUE_DISCOVERED) — First Villain Contact; actions: ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `ward-1908-rule-delay-punish` (PLAYER_DELAY) — Silence Punisher; actions: SEND_MESSAGE, EMIT_EVENT
- `ward-1908-rule-incorrect-accusation` (PLAYER_ACCUSATION) — Wrong Accusation Fallout; actions: UPDATE_NPC_TRUST, ADVANCE_VILLAIN_STAGE, SEND_MESSAGE
- `ward-1908-rule-ally-cooperation` (NPC_TRUST_CHANGED) — Ally Cooperation Reward; actions: REVEAL_CLUE, SET_FLAG
- `ward-1908-rule-near-success` (INVESTIGATION_PROGRESS) — Near Success Ultimatum; actions: ADVANCE_VILLAIN_STAGE, START_COUNTDOWN, SEND_MESSAGE
- `ward-1908-rule-moral-fork` (PLAYER_MESSAGE) — Corruption Offer; actions: UNLOCK_ENDING, SEND_MESSAGE

### Ending Variants
- JUSTICE: **Clean Resolution** — You restore patient truth and secure legal action against surviving conspirators. (hook: A tagged evidence box points to the next case.)
- PYRRHIC: **Compromised Truth** — You reveal the abuse but trigger backlash against survivors' families. (hook: A surviving witness asks for help in a linked disappearance.)
- CORRUPTION: **Corruption Pact** — You seal records permanently in exchange for temporary peace. (hook: Season continuity marks the player as compromised.)

### Villain Escalation
- Stage 1: Peripheral Presence — Signal surveillance without identity. (max touches/day: 2)
- Stage 2: Psychological Contact — Break trust between player and allies. (max touches/day: 3)
- Stage 3: Active Interference — Force tactical mistakes. (max touches/day: 3)
- Stage 4: Personal Confrontation — Recruit, corrupt, or break the player. (max touches/day: 4)

