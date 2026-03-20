# Static Between Stations - Finalized Story Playbook

- Story ID: `static-between-stations`
- Version: `v2`
- Subgenre: psychological horror
- Tone: CINEMATIC
- Hook: A dead rail line broadcasts private confessions in the players' own voices.
- Location: Abandoned commuter rail control annex
- Target Session: 95 minutes

## Arc Map
- Contact and Contradiction (OPENING): The case opens with impossible evidence and uncertain allies.
- Interference and Doubt (MIDDLE): Villain contact escalates while ally trust becomes volatile.
- Confrontation and Reckoning (ENDGAME): The final branch depends on ethics, timing, and trust.

## Beat-by-Beat Runtime Package
### Signal One (`beat-1`)
- Act: Contact
- Villain Stage: 1
- Narrative: A timestamped dispatch from a dead line arrives through SMS, email, and Telegram at once.
- Incoming Message Sequence:
  - [SMS] Lead Investigator Mara Quinn: A timestamped dispatch from a dead line arrives through SMS, email, and Telegram at once. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 32)
  - [WHATSAPP] Dispatch Handler Ilya Ross: Cross-reference this before dawn: Spectrogram of confession burst. (delay 3s, intensity 48)
  - [SMS] The Curator of Static: You catalogued every signal except the one that was yours. (Peripheral Presence) (delay 6s, intensity 62)
- Player Response Branches:
  - Trace the source frequency through telecom logs -> beat-2 | intent=CURIOSITY | progress +20
  - Interview the witness before the line goes dead again -> beat-2 | intent=QUESTION | progress +20
- Clue Reveals: static-between-stations-clue-origin

### Escalation Signal (`beat-2`)
- Act: Contact
- Villain Stage: 1
- Narrative: A contradictory channel drop appears within minutes and forces risk.
- Incoming Message Sequence:
  - [WHATSAPP] Dispatch Handler Ilya Ross: A contradictory channel drop appears within minutes and forces risk. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 32)
  - [TELEGRAM] Commuter Witness Nia Vale: Cross-reference this before dawn: Maintenance ledger anomaly. (delay 3s, intensity 48)
  - [SMS] The Curator of Static: You catalogued every signal except the one that was yours. (Peripheral Presence) (delay 6s, intensity 62)
- Player Response Branches:
  - Preserve original evidence chain -> beat-3 | intent=CURIOSITY | progress +18
  - Pursue suspect immediately -> beat-3 | intent=CURIOSITY | progress +18
- Clue Reveals: static-between-stations-clue-pressure

### Trust Fracture (`beat-3`)
- Act: Interference
- Villain Stage: 2
- Narrative: The villain mixes real secrets with fabricated claims to split allies.
- Incoming Message Sequence:
  - [TELEGRAM] Commuter Witness Nia Vale: The villain mixes real secrets with fabricated claims to split allies. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 44)
  - [SIGNAL] Transit Auditor Bram Keene: Cross-reference this before dawn: Turnstile camera still. (delay 3s, intensity 61)
  - [WHATSAPP] The Curator of Static: You were sharper before you trusted the wrong voice. (Psychological Contact) (delay 6s, intensity 76)
- Player Response Branches:
  - Trust Lead Investigator Mara Quinn and secure witness -> beat-4 | intent=COMPLIANCE | progress +26
  - Trust Dispatch Handler Ilya Ross and expose internal leak -> beat-4 | intent=COMPLIANCE | progress +26
- Clue Reveals: static-between-stations-clue-contradiction

### Ultimatum Window (`beat-4`)
- Act: Interference
- Villain Stage: 3
- Narrative: A timed message threatens collateral harm unless the party diverts.
- Incoming Message Sequence:
  - [SIGNAL] Transit Auditor Bram Keene: A timed message threatens collateral harm unless the party diverts. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 56)
  - [EMAIL] Lead Investigator Mara Quinn: Cross-reference this before dawn: Relay room access hash. (delay 3s, intensity 74)
  - [SMS] The Curator of Static: If you call dispatch, she disappears before dawn. (Active Interference) (delay 6s, intensity 90)
- Player Response Branches:
  - Divert to save threatened NPC -> beat-5 | intent=THREAT | progress +30
  - Continue forensic pursuit under threat -> beat-5 | intent=THREAT | progress +30
- Clue Reveals: static-between-stations-clue-timed-warning

### Confrontation Protocol (`beat-5`)
- Act: Reckoning
- Villain Stage: 4
- Narrative: Players reconstruct motive and false trails before collapse.
- Incoming Message Sequence:
  - [EMAIL] Lead Investigator Mara Quinn: Players reconstruct motive and false trails before collapse. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 68)
  - [VOICE_MESSAGE] Dispatch Handler Ilya Ross: Cross-reference this before dawn: Spectrogram of confession burst. (delay 3s, intensity 87)
  - [EMAIL] The Curator of Static: Confess one lie and I return one life. (Personal Confrontation) (delay 6s, intensity 100)
- Player Response Branches:
  - Commit to formal accusation and expose evidence chain -> beat-6 | intent=ACCUSATION | progress +34
  - Take private contact route for hidden confession -> beat-6 | intent=BARGAIN | progress +34
- Clue Reveals: static-between-stations-clue-reveal

### Case Debrief (`beat-6`)
- Act: Reckoning
- Villain Stage: 4
- Narrative: Final scoring resolves ending branch and season continuity flags.
- Incoming Message Sequence:
  - [VOICE_MESSAGE] Dispatch Handler Ilya Ross: Final scoring resolves ending branch and season continuity flags. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 68)
  - [DOCUMENT_DROP] Commuter Witness Nia Vale: Cross-reference this before dawn: Maintenance ledger anomaly. (delay 3s, intensity 87)
  - [EMAIL] The Curator of Static: Confess one lie and I return one life. (Personal Confrontation) (delay 6s, intensity 100)
- Player Response Branches:
  - Proceed with controlled pressure -> ending | intent=CURIOSITY | progress +30
- Clue Reveals: static-between-stations-clue-epilogue

## Ending Variants
- Clean Resolution [JUSTICE]
  - Summary: You expose the broadcast architecture and keep the last witness alive.
  - Epilogue: Truth lands publicly with evidence that survives scrutiny.
  - Sequel Hook: A tagged evidence box points to the next case.
- Compromised Truth [PYRRHIC]
  - Summary: You identify the culprit but lose the witness chain and public confidence.
  - Epilogue: The culprit is exposed, but allies and witnesses are fractured.
  - Sequel Hook: A surviving witness asks for help in a linked disappearance.
- Corruption Pact [CORRUPTION]
  - Summary: You accept the Curator's private channel and bury the official case.
  - Epilogue: You keep control of the case, and the villain keeps control of you.
  - Sequel Hook: Season continuity marks the player as compromised.

## Replay Hooks
- Variable witness reliability based on trust.
- Dynamic villain timing windows.
- Secret corruption ending on moral failures.

