# Tape 17: Pinewatch - Finalized Story Playbook

- Story ID: `tape-17-pinewatch`
- Version: `v2`
- Subgenre: found-footage investigation
- Tone: GROUNDED
- Hook: A recovered camcorder tape rewrites itself every midnight.
- Location: Closed wilderness watch station and ranger tunnels
- Target Session: 80 minutes

## Arc Map
- Contact and Contradiction (OPENING): The case opens with impossible evidence and uncertain allies.
- Interference and Doubt (MIDDLE): Villain contact escalates while ally trust becomes volatile.
- Confrontation and Reckoning (ENDGAME): The final branch depends on ethics, timing, and trust.

## Player Briefing
- Role: Contract Signal Investigator
- Call Sign: TAP-17-PIN
- Recruitment: A recovered camcorder tape rewrites itself every midnight. Your pattern-recognition profile flagged a match with prior unresolved incidents.
- Opening Incident: The same footage frame arrives through Telegram with different timestamps for each player.
- First Directive: Contact and Contradiction: The case opens with impossible evidence and uncertain allies. Maintain evidence discipline and document every missing persons marker.

## 28-Day Campaign Plan
- Week 1 - Recruitment And Baseline: The same footage frame arrives through Telegram with different timestamps for each player.
  - The case opens with impossible evidence and uncertain allies.
  - Frame glitch cluster
- Week 2 - Contradiction Mapping: Villain contact escalates while ally trust becomes volatile.
  - Forensics-first vs witness-first opening
  - Ranger dispatch excerpt
- Week 3 - Escalation Window: Run live interventions while antagonist pressure rises and trust fractures.
  - Field reenactment vs archive triangulation
  - Manufactured hoax with lethal intent
- Week 4 - Endgame And Debrief: The final branch depends on ethics, timing, and trust.
  - Predatory anomaly exploiting camera feedback
  - Recovered metadata references an unlogged Tape 18.

## Beat-by-Beat Runtime Package
### Tape Reset (`beat-1`)
- Act: Contact
- Villain Stage: 1
- Narrative: The same footage frame arrives through Telegram with different timestamps for each player.
- Incoming Message Sequence:
  - [SMS] Ranger Juno Hale: The same footage frame arrives through Telegram with different timestamps for each player. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 32)
  - [WHATSAPP] Media Forensics Analyst Priya Sen: Cross-reference this before dawn: Frame glitch cluster. (delay 3s, intensity 48)
  - [SMS] The Editor: You watched the wrong frame twice. (Peripheral Presence) (delay 6s, intensity 62)
- Player Response Branches:
  - Extract frame-level artifacts before midnight overwrite -> beat-2 | intent=CURIOSITY | progress +20
  - Interview the survivor while memory is still coherent -> beat-2 | intent=QUESTION | progress +20
- Clue Reveals: tape-17-pinewatch-clue-origin

### Escalation Signal (`beat-2`)
- Act: Contact
- Villain Stage: 1
- Narrative: A contradictory channel drop appears within minutes and forces risk.
- Incoming Message Sequence:
  - [WHATSAPP] Media Forensics Analyst Priya Sen: A contradictory channel drop appears within minutes and forces risk. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 32)
  - [TELEGRAM] Survivor Cade Rowan: Cross-reference this before dawn: Ranger dispatch excerpt. (delay 3s, intensity 48)
  - [SMS] The Editor: You watched the wrong frame twice. (Peripheral Presence) (delay 6s, intensity 62)
- Player Response Branches:
  - Preserve original evidence chain -> beat-3 | intent=CURIOSITY | progress +18
  - Pursue suspect immediately -> beat-3 | intent=CURIOSITY | progress +18
- Clue Reveals: tape-17-pinewatch-clue-pressure

### Trust Fracture (`beat-3`)
- Act: Interference
- Villain Stage: 2
- Narrative: The villain mixes real secrets with fabricated claims to split allies.
- Incoming Message Sequence:
  - [TELEGRAM] Survivor Cade Rowan: The villain mixes real secrets with fabricated claims to split allies. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 44)
  - [SIGNAL] Volunteer Search Lead Ellis Vann: Cross-reference this before dawn: Weather siren file. (delay 3s, intensity 61)
  - [WHATSAPP] The Editor: You keep chasing ghosts because people are harder to blame. (Psychological Contact) (delay 6s, intensity 76)
- Player Response Branches:
  - Trust Ranger Juno Hale and secure witness -> beat-4 | intent=COMPLIANCE | progress +26
  - Trust Media Forensics Analyst Priya Sen and expose internal leak -> beat-4 | intent=COMPLIANCE | progress +26
- Clue Reveals: tape-17-pinewatch-clue-contradiction

### Ultimatum Window (`beat-4`)
- Act: Interference
- Villain Stage: 3
- Narrative: A timed message threatens collateral harm unless the party diverts.
- Incoming Message Sequence:
  - [SIGNAL] Volunteer Search Lead Ellis Vann: A timed message threatens collateral harm unless the party diverts. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 56)
  - [EMAIL] Ranger Juno Hale: Cross-reference this before dawn: Tripod footprint cast. (delay 3s, intensity 74)
  - [SMS] The Editor: If you scrub the footage again, he dies in real time. (Active Interference) (delay 6s, intensity 90)
- Player Response Branches:
  - Divert to save threatened NPC -> beat-5 | intent=THREAT | progress +30
  - Continue forensic pursuit under threat -> beat-5 | intent=THREAT | progress +30
- Clue Reveals: tape-17-pinewatch-clue-timed-warning

### Confrontation Protocol (`beat-5`)
- Act: Reckoning
- Villain Stage: 4
- Narrative: Players reconstruct motive and false trails before collapse.
- Incoming Message Sequence:
  - [EMAIL] Ranger Juno Hale: Players reconstruct motive and false trails before collapse. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 68)
  - [VOICE_MESSAGE] Media Forensics Analyst Priya Sen: Cross-reference this before dawn: Frame glitch cluster. (delay 3s, intensity 87)
  - [EMAIL] The Editor: Confess one lie and I return one life. (Personal Confrontation) (delay 6s, intensity 100)
- Player Response Branches:
  - Commit to formal accusation and expose evidence chain -> beat-6 | intent=ACCUSATION | progress +34
  - Take private contact route for hidden confession -> beat-6 | intent=BARGAIN | progress +34
- Clue Reveals: tape-17-pinewatch-clue-reveal

### Case Debrief (`beat-6`)
- Act: Reckoning
- Villain Stage: 4
- Narrative: Final scoring resolves ending branch and season continuity flags.
- Incoming Message Sequence:
  - [VOICE_MESSAGE] Media Forensics Analyst Priya Sen: Final scoring resolves ending branch and season continuity flags. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 68)
  - [DOCUMENT_DROP] Survivor Cade Rowan: Cross-reference this before dawn: Ranger dispatch excerpt. (delay 3s, intensity 87)
  - [EMAIL] The Editor: Confess one lie and I return one life. (Personal Confrontation) (delay 6s, intensity 100)
- Player Response Branches:
  - Proceed with controlled pressure -> ending | intent=CURIOSITY | progress +30
- Clue Reveals: tape-17-pinewatch-clue-epilogue

## Ending Variants
- Clean Resolution [JUSTICE]
  - Summary: You preserve the authentic footage chain and rescue the final survivor.
  - Epilogue: Truth lands publicly with evidence that survives scrutiny.
  - Sequel Hook: A tagged evidence box points to the next case.
- Compromised Truth [PYRRHIC]
  - Summary: You identify the editor but lose crucial footage and one victim contact.
  - Epilogue: The culprit is exposed, but allies and witnesses are fractured.
  - Sequel Hook: A surviving witness asks for help in a linked disappearance.
- Corruption Pact [CORRUPTION]
  - Summary: You trade the original tape for influence over what the public sees.
  - Epilogue: You keep control of the case, and the villain keeps control of you.
  - Sequel Hook: Season continuity marks the player as compromised.

## Replay Hooks
- Branch reveals different perpetrators each run.
- Voice cadence shifts with aggression.
- Puzzle outcome changes final route access.

## Community Puzzle Hooks
- Timecode Relay: Merge three timecode fragments to reconstruct the missing minute.
  - Reward clue: tape-17-pinewatch-clue-origin
  - Failure: The villain captures your partial decode and reroutes the final branch.

