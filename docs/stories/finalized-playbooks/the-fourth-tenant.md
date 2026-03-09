# The Fourth Tenant - Finalized Story Playbook

- Story ID: `the-fourth-tenant`
- Version: `v2`
- Subgenre: supernatural mystery
- Tone: EERIE
- Hook: Rent is collected from an apartment that appears on no official map.
- Location: Flood-district prewar apartment block
- Target Session: 85 minutes

## Arc Map
- Contact and Contradiction (OPENING): The case opens with impossible evidence and uncertain allies.
- Interference and Doubt (MIDDLE): Villain contact escalates while ally trust becomes volatile.
- Confrontation and Reckoning (ENDGAME): The final branch depends on ethics, timing, and trust.

## Beat-by-Beat Runtime Package
### Unlisted Unit (`beat-1`)
- Act: Contact
- Villain Stage: 1
- Narrative: An email receipt references Unit 4 despite floor plans showing only three apartments.
- Incoming Message Sequence:
  - [SMS] Building Superintendent Leda Price: An email receipt references Unit 4 despite floor plans showing only three apartments. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 32)
  - [WHATSAPP] Lease Broker Owen Pike: Cross-reference this before dawn: Lease chain checksum. (delay 3s, intensity 48)
  - [SMS] The Landlord of Rooms That Move: You checked every floor except the one you carry inside. (Peripheral Presence) (delay 6s, intensity 62)
- Player Response Branches:
  - Audit property records and insurance filings -> beat-2 | intent=CURIOSITY | progress +20
  - Follow the night tenant's movement logs immediately -> beat-2 | intent=CURIOSITY | progress +20
- Clue Reveals: the-fourth-tenant-clue-origin

### Escalation Signal (`beat-2`)
- Act: Contact
- Villain Stage: 1
- Narrative: A contradictory channel drop appears within minutes and forces risk.
- Incoming Message Sequence:
  - [WHATSAPP] Lease Broker Owen Pike: A contradictory channel drop appears within minutes and forces risk. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 32)
  - [TELEGRAM] Night Tenant Maris Holt: Cross-reference this before dawn: Hallway thermal still. (delay 3s, intensity 48)
  - [SMS] The Landlord of Rooms That Move: You checked every floor except the one you carry inside. (Peripheral Presence) (delay 6s, intensity 62)
- Player Response Branches:
  - Preserve original evidence chain -> beat-3 | intent=CURIOSITY | progress +18
  - Pursue suspect immediately -> beat-3 | intent=CURIOSITY | progress +18
- Clue Reveals: the-fourth-tenant-clue-pressure

### Trust Fracture (`beat-3`)
- Act: Interference
- Villain Stage: 2
- Narrative: The villain mixes real secrets with fabricated claims to split allies.
- Incoming Message Sequence:
  - [TELEGRAM] Night Tenant Maris Holt: The villain mixes real secrets with fabricated claims to split allies. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 44)
  - [EMAIL] Claims Adjuster Felix Noor: Cross-reference this before dawn: Water-damage restoration invoice. (delay 3s, intensity 61)
  - [WHATSAPP] The Landlord of Rooms That Move: Don't trust the woman in red by the stairwell. (Psychological Contact) (delay 6s, intensity 76)
- Player Response Branches:
  - Trust Building Superintendent Leda Price and secure witness -> beat-4 | intent=COMPLIANCE | progress +26
  - Trust Lease Broker Owen Pike and expose internal leak -> beat-4 | intent=COMPLIANCE | progress +26
- Clue Reveals: the-fourth-tenant-clue-contradiction

### Ultimatum Window (`beat-4`)
- Act: Interference
- Villain Stage: 3
- Narrative: A timed message threatens collateral harm unless the party diverts.
- Incoming Message Sequence:
  - [EMAIL] Claims Adjuster Felix Noor: A timed message threatens collateral harm unless the party diverts. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 56)
  - [VOICE_MESSAGE] Building Superintendent Leda Price: Cross-reference this before dawn: Night entry key hash. (delay 3s, intensity 74)
  - [SMS] The Landlord of Rooms That Move: Tell the police and she loses the door forever. (Active Interference) (delay 6s, intensity 90)
- Player Response Branches:
  - Divert to save threatened NPC -> beat-5 | intent=THREAT | progress +30
  - Continue forensic pursuit under threat -> beat-5 | intent=THREAT | progress +30
- Clue Reveals: the-fourth-tenant-clue-timed-warning

### Confrontation Protocol (`beat-5`)
- Act: Reckoning
- Villain Stage: 4
- Narrative: Players reconstruct motive and false trails before collapse.
- Incoming Message Sequence:
  - [VOICE_MESSAGE] Building Superintendent Leda Price: Players reconstruct motive and false trails before collapse. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 68)
  - [DOCUMENT_DROP] Lease Broker Owen Pike: Cross-reference this before dawn: Lease chain checksum. (delay 3s, intensity 87)
  - [EMAIL] The Landlord of Rooms That Move: Confess one lie and I return one life. (Personal Confrontation) (delay 6s, intensity 100)
- Player Response Branches:
  - Commit to formal accusation and expose evidence chain -> beat-6 | intent=ACCUSATION | progress +34
  - Take private contact route for hidden confession -> beat-6 | intent=BARGAIN | progress +34
- Clue Reveals: the-fourth-tenant-clue-reveal

### Case Debrief (`beat-6`)
- Act: Reckoning
- Villain Stage: 4
- Narrative: Final scoring resolves ending branch and season continuity flags.
- Incoming Message Sequence:
  - [DOCUMENT_DROP] Lease Broker Owen Pike: Final scoring resolves ending branch and season continuity flags. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 68)
  - [SIMULATED_SITE] Night Tenant Maris Holt: Cross-reference this before dawn: Hallway thermal still. (delay 3s, intensity 87)
  - [EMAIL] The Landlord of Rooms That Move: Confess one lie and I return one life. (Personal Confrontation) (delay 6s, intensity 100)
- Player Response Branches:
  - Proceed with controlled pressure -> ending | intent=CURIOSITY | progress +30
- Clue Reveals: the-fourth-tenant-clue-epilogue

## Ending Variants
- Clean Resolution [JUSTICE]
  - Summary: You prove the tenant scheme and secure testimony before records vanish.
  - Epilogue: Truth lands publicly with evidence that survives scrutiny.
  - Sequel Hook: A tagged evidence box points to the next case.
- Compromised Truth [PYRRHIC]
  - Summary: You expose fraud, but a key tenant disappears from all records.
  - Epilogue: The culprit is exposed, but allies and witnesses are fractured.
  - Sequel Hook: A surviving witness asks for help in a linked disappearance.
- Corruption Pact [CORRUPTION]
  - Summary: You accept ownership of Unit 4 and rewrite occupancy history.
  - Epilogue: You keep control of the case, and the villain keeps control of you.
  - Sequel Hook: Season continuity marks the player as compromised.

## Replay Hooks
- Timeline offsets by response speed.
- Forgery branch implicates different suspects.
- High-trust path unlocks hidden lease archive ending.

