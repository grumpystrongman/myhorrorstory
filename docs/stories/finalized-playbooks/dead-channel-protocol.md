# Dead Channel Protocol - Finalized Story Playbook

- Story ID: `dead-channel-protocol`
- Version: `v2`
- Subgenre: techno/paranormal thriller
- Tone: GROUNDED
- Hook: A ghost app predicts outages, deaths, and your next move.
- Location: Smart-city control grid and abandoned transit nodes
- Target Session: 88 minutes

## Arc Map
- Contact and Contradiction (OPENING): The case opens with impossible evidence and uncertain allies.
- Interference and Doubt (MIDDLE): Villain contact escalates while ally trust becomes volatile.
- Confrontation and Reckoning (ENDGAME): The final branch depends on ethics, timing, and trust.

## Beat-by-Beat Runtime Package
### Protocol Wake (`beat-1`)
- Act: Contact
- Villain Stage: 1
- Narrative: An app push notification predicts a substation failure and names your trusted ally.
- Incoming Message Sequence:
  - [SMS] Security Engineer Talia Ren: An app push notification predicts a substation failure and names your trusted ally. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 32)
  - [WHATSAPP] Streamer Bo Finch: Cross-reference this before dawn: Protocol signed payload. (delay 3s, intensity 48)
  - [SMS] Root Administrator: I predicted this reply seven minutes ago. (Peripheral Presence) (delay 6s, intensity 62)
- Player Response Branches:
  - Audit protocol source code and signing keys -> beat-2 | intent=CURIOSITY | progress +20
  - Follow outage predictions to prevent civilian harm -> beat-2 | intent=CURIOSITY | progress +20
- Clue Reveals: dead-channel-protocol-clue-origin

### Escalation Signal (`beat-2`)
- Act: Contact
- Villain Stage: 1
- Narrative: A contradictory channel drop appears within minutes and forces risk.
- Incoming Message Sequence:
  - [WHATSAPP] Streamer Bo Finch: A contradictory channel drop appears within minutes and forces risk. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 32)
  - [TELEGRAM] Grid Operator Niko Saye: Cross-reference this before dawn: Substation outage trace. (delay 3s, intensity 48)
  - [SMS] Root Administrator: I predicted this reply seven minutes ago. (Peripheral Presence) (delay 6s, intensity 62)
- Player Response Branches:
  - Preserve original evidence chain -> beat-3 | intent=CURIOSITY | progress +18
  - Pursue suspect immediately -> beat-3 | intent=CURIOSITY | progress +18
- Clue Reveals: dead-channel-protocol-clue-pressure

### Trust Fracture (`beat-3`)
- Act: Interference
- Villain Stage: 2
- Narrative: The villain mixes real secrets with fabricated claims to split allies.
- Incoming Message Sequence:
  - [TELEGRAM] Grid Operator Niko Saye: The villain mixes real secrets with fabricated claims to split allies. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 44)
  - [EMAIL] Incident Bot Liaison K-12: Cross-reference this before dawn: Intercepted bot transcript. (delay 3s, intensity 61)
  - [WHATSAPP] Root Administrator: Don't trust the operator in red status. (Psychological Contact) (delay 6s, intensity 76)
- Player Response Branches:
  - Trust Security Engineer Talia Ren and secure witness -> beat-4 | intent=COMPLIANCE | progress +26
  - Trust Streamer Bo Finch and expose internal leak -> beat-4 | intent=COMPLIANCE | progress +26
- Clue Reveals: dead-channel-protocol-clue-contradiction

### Ultimatum Window (`beat-4`)
- Act: Interference
- Villain Stage: 3
- Narrative: A timed message threatens collateral harm unless the party diverts.
- Incoming Message Sequence:
  - [EMAIL] Incident Bot Liaison K-12: A timed message threatens collateral harm unless the party diverts. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 56)
  - [VOICE_MESSAGE] Security Engineer Talia Ren: Cross-reference this before dawn: Abandoned node scan. (delay 3s, intensity 74)
  - [SMS] Root Administrator: Report me, and district three goes dark first. (Active Interference) (delay 6s, intensity 90)
- Player Response Branches:
  - Divert to save threatened NPC -> beat-5 | intent=THREAT | progress +30
  - Continue forensic pursuit under threat -> beat-5 | intent=THREAT | progress +30
- Clue Reveals: dead-channel-protocol-clue-timed-warning

### Confrontation Protocol (`beat-5`)
- Act: Reckoning
- Villain Stage: 4
- Narrative: Players reconstruct motive and false trails before collapse.
- Incoming Message Sequence:
  - [VOICE_MESSAGE] Security Engineer Talia Ren: Players reconstruct motive and false trails before collapse. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 68)
  - [DOCUMENT_DROP] Streamer Bo Finch: Cross-reference this before dawn: Protocol signed payload. (delay 3s, intensity 87)
  - [EMAIL] Root Administrator: Confess one lie and I return one life. (Personal Confrontation) (delay 6s, intensity 100)
- Player Response Branches:
  - Commit to formal accusation and expose evidence chain -> beat-6 | intent=ACCUSATION | progress +34
  - Take private contact route for hidden confession -> beat-6 | intent=BARGAIN | progress +34
- Clue Reveals: dead-channel-protocol-clue-reveal

### Case Debrief (`beat-6`)
- Act: Reckoning
- Villain Stage: 4
- Narrative: Final scoring resolves ending branch and season continuity flags.
- Incoming Message Sequence:
  - [DOCUMENT_DROP] Streamer Bo Finch: Final scoring resolves ending branch and season continuity flags. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 68)
  - [SIMULATED_SITE] Grid Operator Niko Saye: Cross-reference this before dawn: Substation outage trace. (delay 3s, intensity 87)
  - [EMAIL] Root Administrator: Confess one lie and I return one life. (Personal Confrontation) (delay 6s, intensity 100)
- Player Response Branches:
  - Proceed with controlled pressure -> ending | intent=CURIOSITY | progress +30
- Clue Reveals: dead-channel-protocol-clue-epilogue

## Ending Variants
- Clean Resolution [JUSTICE]
  - Summary: You isolate protocol command and preserve chain-of-custody for prosecution.
  - Epilogue: Truth lands publicly with evidence that survives scrutiny.
  - Sequel Hook: A tagged evidence box points to the next case.
- Compromised Truth [PYRRHIC]
  - Summary: You neutralize the app but trigger cascading outages and civic panic.
  - Epilogue: The culprit is exposed, but allies and witnesses are fractured.
  - Sequel Hook: A surviving witness asks for help in a linked disappearance.
- Corruption Pact [CORRUPTION]
  - Summary: You keep protocol access and become curator of selective outages.
  - Epilogue: You keep control of the case, and the villain keeps control of you.
  - Sequel Hook: Season continuity marks the player as compromised.

## Replay Hooks
- Prediction feed mutates by prior endings.
- Fast-response players get shorter silence windows.
- Hidden branch if all ultimatums are answered in time.

