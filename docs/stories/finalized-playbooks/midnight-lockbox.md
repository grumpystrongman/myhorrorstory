# Midnight Lockbox - Finalized Story Playbook

- Story ID: `midnight-lockbox`
- Version: `v2`
- Subgenre: supernatural mystery
- Tone: GROUNDED
- Hook: A self-storage unit with no renter sends voice memos predicting what your team will do next.
- Location: Gallowglass 24-hour storage facility and storm-drain service tunnels
- Target Session: 36 minutes

## Arc Map
- Lockbox Contact (OPENING): An impossible voicemail starts the case at the storage facility.
- Leak and Fracture (MIDDLE): Daylight leaks force trust decisions under public pressure.
- Second-Night Reckoning (ENDGAME): A final tunnel run decides truth, compromise, or collapse.

## Beat-by-Beat Runtime Package
### Unit 331 pings alive (`beat-1`)
- Act: Night One: Breach
- Villain Stage: 1
- Narrative: At 11:47 p.m., a voicemail from unit 331 predicts your next text message word for word.
- Incoming Message Sequence:
  - [SMS] Case Lead Veda Cross: At 11:47 p.m., a voicemail from unit 331 predicts your next text message word for word. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 32)
  - [WHATSAPP] Night Manager Eli Mercer: Cross-reference this before dawn: Voicemail waveform anomaly. (delay 3s, intensity 48)
  - [SMS] The Quartermaster: Unit 331 has your fingerprints now, not mine. (Peripheral Presence) (delay 6s, intensity 62)
- Player Response Branches:
  - Audit keypad logs and access events before sunrise -> beat-2 | intent=CURIOSITY | progress +20
  - Interview the night manager before he leaves shift -> beat-2 | intent=QUESTION | progress +20
- Clue Reveals: midnight-lockbox-clue-origin

### Lock Cylinder Swap (`beat-2`)
- Act: Night One: Breach
- Villain Stage: 1
- Narrative: You find a fresh lock core with a key that should not exist in facility inventory.
- Incoming Message Sequence:
  - [WHATSAPP] Night Manager Eli Mercer: You find a fresh lock core with a key that should not exist in facility inventory. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 32)
  - [TELEGRAM] Courier Witness Sia Rowan: Cross-reference this before dawn: Keypad access hash export. (delay 3s, intensity 48)
  - [SMS] The Quartermaster: Unit 331 has your fingerprints now, not mine. (Peripheral Presence) (delay 6s, intensity 62)
- Player Response Branches:
  - Preserve original evidence chain -> beat-3 | intent=CURIOSITY | progress +18
  - Pursue suspect immediately -> beat-3 | intent=CURIOSITY | progress +18
- Clue Reveals: midnight-lockbox-clue-pressure

### Morning Leak (`beat-3`)
- Act: Day Two: Pressure
- Villain Stage: 2
- Narrative: By morning, cropped footage of your team appears online before your own upload completes.
- Incoming Message Sequence:
  - [TELEGRAM] Courier Witness Sia Rowan: By morning, cropped footage of your team appears online before your own upload completes. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 44)
  - [EMAIL] Locksmith Omar Hale: Cross-reference this before dawn: Freight elevator camera still. (delay 3s, intensity 61)
  - [WHATSAPP] The Quartermaster: You keep protecting the wrong employee. (Psychological Contact) (delay 6s, intensity 76)
- Player Response Branches:
  - Trust Case Lead Veda Cross and seal internal channels -> beat-4 | intent=COMPLIANCE | progress +26
  - Trust Night Manager Eli Mercer and follow his blind spot map -> beat-4 | intent=COMPLIANCE | progress +26
- Clue Reveals: midnight-lockbox-clue-contradiction

### Noon Ultimatum (`beat-4`)
- Act: Day Two: Pressure
- Villain Stage: 3
- Narrative: The antagonist sends a noon deadline: open the lockbox publicly or lose your only witness.
- Incoming Message Sequence:
  - [EMAIL] Locksmith Omar Hale: The antagonist sends a noon deadline: open the lockbox publicly or lose your only witness. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 56)
  - [VOICE_MESSAGE] Case Lead Veda Cross: Cross-reference this before dawn: Drain tunnel pressure map. (delay 3s, intensity 74)
  - [SMS] The Quartermaster: If you open the box before noon, your witness walks. If not, count the sirens. (Active Interference) (delay 6s, intensity 90)
- Player Response Branches:
  - Divert to save threatened NPC -> beat-5 | intent=THREAT | progress +30
  - Continue forensic pursuit under threat -> beat-5 | intent=THREAT | progress +30
- Clue Reveals: midnight-lockbox-clue-timed-warning

### Drain Tunnel Run (`beat-5`)
- Act: Night Two: Resolution
- Villain Stage: 4
- Narrative: Twelve hours later, the tunnel route opens and you must choose recovery or confrontation.
- Incoming Message Sequence:
  - [VOICE_MESSAGE] Case Lead Veda Cross: Twelve hours later, the tunnel route opens and you must choose recovery or confrontation. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 68)
  - [DOCUMENT_DROP] Night Manager Eli Mercer: Cross-reference this before dawn: Voicemail waveform anomaly. (delay 3s, intensity 87)
  - [EMAIL] The Quartermaster: Hand me the access list and I return everyone alive. (Personal Confrontation) (delay 6s, intensity 100)
- Player Response Branches:
  - Commit to formal accusation and expose evidence chain -> beat-6 | intent=ACCUSATION | progress +34
  - Take private contact route for hidden confession -> beat-6 | intent=BARGAIN | progress +34
- Clue Reveals: midnight-lockbox-clue-reveal

### Lockbox Debrief (`beat-6`)
- Act: Night Two: Resolution
- Villain Stage: 4
- Narrative: A final memo reveals whether your team solved the case or joined the cover-up.
- Incoming Message Sequence:
  - [DOCUMENT_DROP] Night Manager Eli Mercer: A final memo reveals whether your team solved the case or joined the cover-up. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 68)
  - [SIMULATED_SITE] Courier Witness Sia Rowan: Cross-reference this before dawn: Keypad access hash export. (delay 3s, intensity 87)
  - [EMAIL] The Quartermaster: Hand me the access list and I return everyone alive. (Personal Confrontation) (delay 6s, intensity 100)
- Player Response Branches:
  - Proceed with controlled pressure -> ending | intent=CURIOSITY | progress +30
- Clue Reveals: midnight-lockbox-clue-epilogue

## Ending Variants
- Sealed Evidence Conviction [JUSTICE]
  - Summary: You preserve the chain and expose the extortion network before the deadline.
  - Epilogue: Unit 331 is seized with intact evidence, and the witness enters protection.
  - Sequel Hook: A tagged evidence box points to the next case.
- Witness Saved, Truth Damaged [PYRRHIC]
  - Summary: You save the witness but lose admissible evidence in the rush.
  - Epilogue: The team survives, but the case closes with permanent doubt.
  - Sequel Hook: A surviving witness asks for help in a linked disappearance.
- Quartermaster Pact [CORRUPTION]
  - Summary: You trade transparency for operational control over future lockboxes.
  - Epilogue: You receive master access and the next target list at dawn.
  - Sequel Hook: Season continuity marks the player as compromised.

## Replay Hooks
- Fast-response runs uncover hidden keypad metadata.
- Different ally trust choices change witness survival odds.
- Low-morality runs unlock a compromised operator epilogue.

