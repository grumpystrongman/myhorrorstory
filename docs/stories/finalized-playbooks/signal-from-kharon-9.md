# Signal From Kharon-9 - Finalized Story Playbook

- Story ID: `signal-from-kharon-9`
- Version: `v2`
- Subgenre: cosmic horror
- Tone: INTENSE
- Hook: Telemetry returns from a decommissioned orbital array and predicts player replies.
- Location: Mountain observatory and subterranean receiver array
- Target Session: 100 minutes

## Arc Map
- Contact and Contradiction (OPENING): The case opens with impossible evidence and uncertain allies.
- Interference and Doubt (MIDDLE): Villain contact escalates while ally trust becomes volatile.
- Confrontation and Reckoning (ENDGAME): The final branch depends on ethics, timing, and trust.

## Beat-by-Beat Runtime Package
### Dormant Array Wake (`beat-1`)
- Act: Contact
- Villain Stage: 1
- Narrative: A telemetry packet arrives in Telegram with tomorrow's timestamp and your exact opening message.
- Incoming Message Sequence:
  - [SMS] Systems Engineer Ari Vance: A telemetry packet arrives in Telegram with tomorrow's timestamp and your exact opening message. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 32)
  - [WHATSAPP] Astrophysicist Dr. Helene Oru: Cross-reference this before dawn: Telemetry checksum drift. (delay 3s, intensity 48)
  - [SMS] The Quiet Orbit: I know what you type next. Change it if you can. (Peripheral Presence) (delay 6s, intensity 62)
- Player Response Branches:
  - Sandbox the signal in a quarantined parser -> beat-2 | intent=CURIOSITY | progress +20
  - Decode live before packet drift corrupts it -> beat-2 | intent=CURIOSITY | progress +20
- Clue Reveals: signal-from-kharon-9-clue-origin

### Escalation Signal (`beat-2`)
- Act: Contact
- Villain Stage: 1
- Narrative: A contradictory channel drop appears within minutes and forces risk.
- Incoming Message Sequence:
  - [WHATSAPP] Astrophysicist Dr. Helene Oru: A contradictory channel drop appears within minutes and forces risk. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 32)
  - [TELEGRAM] Array Operator Micah Trent: Cross-reference this before dawn: Starfield deviation map. (delay 3s, intensity 48)
  - [SMS] The Quiet Orbit: I know what you type next. Change it if you can. (Peripheral Presence) (delay 6s, intensity 62)
- Player Response Branches:
  - Preserve original evidence chain -> beat-3 | intent=CURIOSITY | progress +18
  - Pursue suspect immediately -> beat-3 | intent=CURIOSITY | progress +18
- Clue Reveals: signal-from-kharon-9-clue-pressure

### Trust Fracture (`beat-3`)
- Act: Interference
- Villain Stage: 2
- Narrative: The villain mixes real secrets with fabricated claims to split allies.
- Incoming Message Sequence:
  - [TELEGRAM] Array Operator Micah Trent: The villain mixes real secrets with fabricated claims to split allies. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 44)
  - [SIGNAL] Telemetry Broker Vale-9: Cross-reference this before dawn: Array maintenance gap log. (delay 3s, intensity 61)
  - [WHATSAPP] The Quiet Orbit: You trusted the wrong constant, detective. (Psychological Contact) (delay 6s, intensity 76)
- Player Response Branches:
  - Trust Systems Engineer Ari Vance and secure witness -> beat-4 | intent=COMPLIANCE | progress +26
  - Trust Astrophysicist Dr. Helene Oru and expose internal leak -> beat-4 | intent=COMPLIANCE | progress +26
- Clue Reveals: signal-from-kharon-9-clue-contradiction

### Ultimatum Window (`beat-4`)
- Act: Interference
- Villain Stage: 3
- Narrative: A timed message threatens collateral harm unless the party diverts.
- Incoming Message Sequence:
  - [SIGNAL] Telemetry Broker Vale-9: A timed message threatens collateral harm unless the party diverts. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 56)
  - [EMAIL] Systems Engineer Ari Vance: Cross-reference this before dawn: Operator biometric mismatch. (delay 3s, intensity 74)
  - [SMS] The Quiet Orbit: Shut down the array and your operator dies in the dark. (Active Interference) (delay 6s, intensity 90)
- Player Response Branches:
  - Divert to save threatened NPC -> beat-5 | intent=THREAT | progress +30
  - Continue forensic pursuit under threat -> beat-5 | intent=THREAT | progress +30
- Clue Reveals: signal-from-kharon-9-clue-timed-warning

### Confrontation Protocol (`beat-5`)
- Act: Reckoning
- Villain Stage: 4
- Narrative: Players reconstruct motive and false trails before collapse.
- Incoming Message Sequence:
  - [EMAIL] Systems Engineer Ari Vance: Players reconstruct motive and false trails before collapse. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 68)
  - [VOICE_MESSAGE] Astrophysicist Dr. Helene Oru: Cross-reference this before dawn: Telemetry checksum drift. (delay 3s, intensity 87)
  - [EMAIL] The Quiet Orbit: Confess one lie and I return one life. (Personal Confrontation) (delay 6s, intensity 100)
- Player Response Branches:
  - Commit to formal accusation and expose evidence chain -> beat-6 | intent=ACCUSATION | progress +34
  - Take private contact route for hidden confession -> beat-6 | intent=BARGAIN | progress +34
- Clue Reveals: signal-from-kharon-9-clue-reveal

### Case Debrief (`beat-6`)
- Act: Reckoning
- Villain Stage: 4
- Narrative: Final scoring resolves ending branch and season continuity flags.
- Incoming Message Sequence:
  - [VOICE_MESSAGE] Astrophysicist Dr. Helene Oru: Final scoring resolves ending branch and season continuity flags. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 68)
  - [DOCUMENT_DROP] Array Operator Micah Trent: Cross-reference this before dawn: Starfield deviation map. (delay 3s, intensity 87)
  - [EMAIL] The Quiet Orbit: Confess one lie and I return one life. (Personal Confrontation) (delay 6s, intensity 100)
- Player Response Branches:
  - Proceed with controlled pressure -> ending | intent=CURIOSITY | progress +30
- Clue Reveals: signal-from-kharon-9-clue-epilogue

## Ending Variants
- Clean Resolution [JUSTICE]
  - Summary: You isolate the hostile signal and preserve proof without total blackout.
  - Epilogue: Truth lands publicly with evidence that survives scrutiny.
  - Sequel Hook: A tagged evidence box points to the next case.
- Compromised Truth [PYRRHIC]
  - Summary: You stop the broadcast but lose the array team in shutdown.
  - Epilogue: The culprit is exposed, but allies and witnesses are fractured.
  - Sequel Hook: A surviving witness asks for help in a linked disappearance.
- Corruption Pact [CORRUPTION]
  - Summary: You feed selected data to the signal for strategic advantage.
  - Epilogue: You keep control of the case, and the villain keeps control of you.
  - Sequel Hook: Season continuity marks the player as compromised.

## Replay Hooks
- Signal packet ordering mutates by prior endings.
- Curiosity alters villain pacing.
- Secret ending for perfect countdown run.

