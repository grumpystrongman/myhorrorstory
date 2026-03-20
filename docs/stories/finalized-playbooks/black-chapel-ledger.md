# Black Chapel Ledger - Finalized Story Playbook

- Story ID: `black-chapel-ledger`
- Version: `v2`
- Subgenre: gothic horror
- Tone: EERIE
- Hook: A cathedral ledger records debts paid in memory instead of money.
- Location: Cliffside cathedral archive district
- Target Session: 90 minutes

## Arc Map
- Contact and Contradiction (OPENING): The case opens with impossible evidence and uncertain allies.
- Interference and Doubt (MIDDLE): Villain contact escalates while ally trust becomes volatile.
- Confrontation and Reckoning (ENDGAME): The final branch depends on ethics, timing, and trust.

## Beat-by-Beat Runtime Package
### Ledger Breach (`beat-1`)
- Act: Contact
- Villain Stage: 1
- Narrative: A scanned ledger page appears in WhatsApp showing one player's childhood home as collateral.
- Incoming Message Sequence:
  - [SMS] Canon Archivist Elara Voss: A scanned ledger page appears in WhatsApp showing one player's childhood home as collateral. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 32)
  - [WHATSAPP] Bell Keeper Tomas Grell: Cross-reference this before dawn: Burned vellum fragment. (delay 3s, intensity 48)
  - [SMS] The Creditor: You opened the ledger; now it records you too. (Peripheral Presence) (delay 6s, intensity 62)
- Player Response Branches:
  - Authenticate the ledger seals with archival metadata -> beat-2 | intent=CURIOSITY | progress +20
  - Confront the bell keeper about missing pages -> beat-2 | intent=CURIOSITY | progress +20
- Clue Reveals: black-chapel-ledger-clue-origin

### Escalation Signal (`beat-2`)
- Act: Contact
- Villain Stage: 1
- Narrative: A contradictory channel drop appears within minutes and forces risk.
- Incoming Message Sequence:
  - [WHATSAPP] Bell Keeper Tomas Grell: A contradictory channel drop appears within minutes and forces risk. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 32)
  - [TELEGRAM] Choir Witness Sera March: Cross-reference this before dawn: Choir rehearsal wax recording. (delay 3s, intensity 48)
  - [SMS] The Creditor: You opened the ledger; now it records you too. (Peripheral Presence) (delay 6s, intensity 62)
- Player Response Branches:
  - Preserve original evidence chain -> beat-3 | intent=CURIOSITY | progress +18
  - Pursue suspect immediately -> beat-3 | intent=CURIOSITY | progress +18
- Clue Reveals: black-chapel-ledger-clue-pressure

### Trust Fracture (`beat-3`)
- Act: Interference
- Villain Stage: 2
- Narrative: The villain mixes real secrets with fabricated claims to split allies.
- Incoming Message Sequence:
  - [TELEGRAM] Choir Witness Sera March: The villain mixes real secrets with fabricated claims to split allies. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 44)
  - [SIGNAL] Debt Broker Cal Dorn: Cross-reference this before dawn: Crypt key inventory. (delay 3s, intensity 61)
  - [WHATSAPP] The Creditor: Don't trust the one who rings the bell after midnight. (Psychological Contact) (delay 6s, intensity 76)
- Player Response Branches:
  - Trust Canon Archivist Elara Voss and secure witness -> beat-4 | intent=COMPLIANCE | progress +26
  - Trust Bell Keeper Tomas Grell and expose internal leak -> beat-4 | intent=COMPLIANCE | progress +26
- Clue Reveals: black-chapel-ledger-clue-contradiction

### Ultimatum Window (`beat-4`)
- Act: Interference
- Villain Stage: 3
- Narrative: A timed message threatens collateral harm unless the party diverts.
- Incoming Message Sequence:
  - [SIGNAL] Debt Broker Cal Dorn: A timed message threatens collateral harm unless the party diverts. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 56)
  - [EMAIL] Canon Archivist Elara Voss: Cross-reference this before dawn: Ledger watermark scan. (delay 3s, intensity 74)
  - [SMS] The Creditor: Confess publicly, or the choir girl pays your debt first. (Active Interference) (delay 6s, intensity 90)
- Player Response Branches:
  - Divert to save threatened NPC -> beat-5 | intent=THREAT | progress +30
  - Continue forensic pursuit under threat -> beat-5 | intent=THREAT | progress +30
- Clue Reveals: black-chapel-ledger-clue-timed-warning

### Confrontation Protocol (`beat-5`)
- Act: Reckoning
- Villain Stage: 4
- Narrative: Players reconstruct motive and false trails before collapse.
- Incoming Message Sequence:
  - [EMAIL] Canon Archivist Elara Voss: Players reconstruct motive and false trails before collapse. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 68)
  - [VOICE_MESSAGE] Bell Keeper Tomas Grell: Cross-reference this before dawn: Burned vellum fragment. (delay 3s, intensity 87)
  - [EMAIL] The Creditor: Confess one lie and I return one life. (Personal Confrontation) (delay 6s, intensity 100)
- Player Response Branches:
  - Commit to formal accusation and expose evidence chain -> beat-6 | intent=ACCUSATION | progress +34
  - Take private contact route for hidden confession -> beat-6 | intent=BARGAIN | progress +34
- Clue Reveals: black-chapel-ledger-clue-reveal

### Case Debrief (`beat-6`)
- Act: Reckoning
- Villain Stage: 4
- Narrative: Final scoring resolves ending branch and season continuity flags.
- Incoming Message Sequence:
  - [VOICE_MESSAGE] Bell Keeper Tomas Grell: Final scoring resolves ending branch and season continuity flags. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 68)
  - [DOCUMENT_DROP] Choir Witness Sera March: Cross-reference this before dawn: Choir rehearsal wax recording. (delay 3s, intensity 87)
  - [EMAIL] The Creditor: Confess one lie and I return one life. (Personal Confrontation) (delay 6s, intensity 100)
- Player Response Branches:
  - Proceed with controlled pressure -> ending | intent=CURIOSITY | progress +30
- Clue Reveals: black-chapel-ledger-clue-epilogue

## Ending Variants
- Clean Resolution [JUSTICE]
  - Summary: You expose the debt network and return stolen identities to survivors.
  - Epilogue: Truth lands publicly with evidence that survives scrutiny.
  - Sequel Hook: A tagged evidence box points to the next case.
- Compromised Truth [PYRRHIC]
  - Summary: You close the cathedral operation but lose key testimony to fear.
  - Epilogue: The culprit is exposed, but allies and witnesses are fractured.
  - Sequel Hook: A surviving witness asks for help in a linked disappearance.
- Corruption Pact [CORRUPTION]
  - Summary: You accept selective erasures and become keeper of the ledger.
  - Epilogue: You keep control of the case, and the villain keeps control of you.
  - Sequel Hook: Season continuity marks the player as compromised.

## Replay Hooks
- Debtor names rotate each run.
- Culprit can shift from broker to archivist.
- Confession route unlocks secret ending data.

