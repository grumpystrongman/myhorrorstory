# The Harvest Men - Finalized Story Playbook

- Story ID: `the-harvest-men`
- Version: `v2`
- Subgenre: folk horror
- Tone: SLOW_BURN
- Hook: A ritual mask selects a new wearer every dusk, and refusals vanish overnight.
- Location: Isolated valley communes and threshing grounds
- Target Session: 100 minutes

## Arc Map
- Contact and Contradiction (OPENING): The case opens with impossible evidence and uncertain allies.
- Interference and Doubt (MIDDLE): Villain contact escalates while ally trust becomes volatile.
- Confrontation and Reckoning (ENDGAME): The final branch depends on ethics, timing, and trust.

## Player Briefing
- Role: Contract Signal Investigator
- Call Sign: THE-HAR-MEN
- Recruitment: A ritual mask selects a new wearer every dusk, and refusals vanish overnight. Your pattern-recognition profile flagged a match with prior unresolved incidents.
- Opening Incident: Players receive synchronized SMS photos of the same ritual mask in three different houses.
- First Directive: Contact and Contradiction: The case opens with impossible evidence and uncertain allies. Maintain evidence discipline and document every ritual violence marker.

## 28-Day Campaign Plan
- Week 1 - Recruitment And Baseline: Players receive synchronized SMS photos of the same ritual mask in three different houses.
  - The case opens with impossible evidence and uncertain allies.
  - Blood-soil composition panel
- Week 2 - Contradiction Mapping: Villain contact escalates while ally trust becomes volatile.
  - Scientific analysis vs witness protection opening
  - Festival lantern route map
- Week 3 - Escalation Window: Run live interventions while antagonist pressure rises and trust fractures.
  - Break rite now vs infiltrate final rite
  - Human conspiracy preserving power
- Week 4 - Endgame And Debrief: The final branch depends on ethics, timing, and trust.
  - Ancestral entity fed through staged rituals
  - A freight invoice ties the valley rite to coastal distributors.

## Beat-by-Beat Runtime Package
### Dusk Selection (`beat-1`)
- Act: Contact
- Villain Stage: 1
- Narrative: Players receive synchronized SMS photos of the same ritual mask in three different houses.
- Incoming Message Sequence:
  - [SMS] Visiting Agronomist Dina Crowe: Players receive synchronized SMS photos of the same ritual mask in three different houses. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 32)
  - [WHATSAPP] Village Elder Rowan Pike: Cross-reference this before dawn: Blood-soil composition panel. (delay 3s, intensity 48)
  - [SMS] The Reaper Steward: The valley watched you before you arrived. (Peripheral Presence) (delay 6s, intensity 62)
- Player Response Branches:
  - Analyze soil reports linked to ritual sites -> beat-2 | intent=CURIOSITY | progress +20
  - Interrogate the runaway before the elders find them -> beat-2 | intent=CURIOSITY | progress +20
- Clue Reveals: the-harvest-men-clue-origin

### Escalation Signal (`beat-2`)
- Act: Contact
- Villain Stage: 1
- Narrative: A contradictory channel drop appears within minutes and forces risk.
- Incoming Message Sequence:
  - [WHATSAPP] Village Elder Rowan Pike: A contradictory channel drop appears within minutes and forces risk. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 32)
  - [TELEGRAM] Runaway Teen Lio Strand: Cross-reference this before dawn: Festival lantern route map. (delay 3s, intensity 48)
  - [SMS] The Reaper Steward: The valley watched you before you arrived. (Peripheral Presence) (delay 6s, intensity 62)
- Player Response Branches:
  - Preserve original evidence chain -> beat-3 | intent=CURIOSITY | progress +18
  - Pursue suspect immediately -> beat-3 | intent=CURIOSITY | progress +18
- Clue Reveals: the-harvest-men-clue-pressure

### Trust Fracture (`beat-3`)
- Act: Interference
- Villain Stage: 2
- Narrative: The villain mixes real secrets with fabricated claims to split allies.
- Incoming Message Sequence:
  - [TELEGRAM] Runaway Teen Lio Strand: The villain mixes real secrets with fabricated claims to split allies. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 44)
  - [SIGNAL] Festival Marshal Jarek Holt: Cross-reference this before dawn: Runaway voice memo. (delay 3s, intensity 61)
  - [WHATSAPP] The Reaper Steward: You keep calling this rescue. They call it theft. (Psychological Contact) (delay 6s, intensity 76)
- Player Response Branches:
  - Trust Visiting Agronomist Dina Crowe and secure witness -> beat-4 | intent=COMPLIANCE | progress +26
  - Trust Village Elder Rowan Pike and expose internal leak -> beat-4 | intent=COMPLIANCE | progress +26
- Clue Reveals: the-harvest-men-clue-contradiction

### Ultimatum Window (`beat-4`)
- Act: Interference
- Villain Stage: 3
- Narrative: A timed message threatens collateral harm unless the party diverts.
- Incoming Message Sequence:
  - [SIGNAL] Festival Marshal Jarek Holt: A timed message threatens collateral harm unless the party diverts. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 56)
  - [EMAIL] Visiting Agronomist Dina Crowe: Cross-reference this before dawn: Mask stitch microscopy. (delay 3s, intensity 74)
  - [SMS] The Reaper Steward: Miss the dusk bell and the boy is chosen next. (Active Interference) (delay 6s, intensity 90)
- Player Response Branches:
  - Divert to save threatened NPC -> beat-5 | intent=THREAT | progress +30
  - Continue forensic pursuit under threat -> beat-5 | intent=THREAT | progress +30
- Clue Reveals: the-harvest-men-clue-timed-warning

### Confrontation Protocol (`beat-5`)
- Act: Reckoning
- Villain Stage: 4
- Narrative: Players reconstruct motive and false trails before collapse.
- Incoming Message Sequence:
  - [EMAIL] Visiting Agronomist Dina Crowe: Players reconstruct motive and false trails before collapse. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 68)
  - [VOICE_MESSAGE] Village Elder Rowan Pike: Cross-reference this before dawn: Blood-soil composition panel. (delay 3s, intensity 87)
  - [EMAIL] The Reaper Steward: Confess one lie and I return one life. (Personal Confrontation) (delay 6s, intensity 100)
- Player Response Branches:
  - Commit to formal accusation and expose evidence chain -> beat-6 | intent=ACCUSATION | progress +34
  - Take private contact route for hidden confession -> beat-6 | intent=BARGAIN | progress +34
- Clue Reveals: the-harvest-men-clue-reveal

### Case Debrief (`beat-6`)
- Act: Reckoning
- Villain Stage: 4
- Narrative: Final scoring resolves ending branch and season continuity flags.
- Incoming Message Sequence:
  - [VOICE_MESSAGE] Village Elder Rowan Pike: Final scoring resolves ending branch and season continuity flags. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 68)
  - [DOCUMENT_DROP] Runaway Teen Lio Strand: Cross-reference this before dawn: Festival lantern route map. (delay 3s, intensity 87)
  - [EMAIL] The Reaper Steward: Confess one lie and I return one life. (Personal Confrontation) (delay 6s, intensity 100)
- Player Response Branches:
  - Proceed with controlled pressure -> ending | intent=CURIOSITY | progress +30
- Clue Reveals: the-harvest-men-clue-epilogue

## Ending Variants
- Clean Resolution [JUSTICE]
  - Summary: You dismantle the selection machine and evacuate vulnerable targets alive.
  - Epilogue: Truth lands publicly with evidence that survives scrutiny.
  - Sequel Hook: A tagged evidence box points to the next case.
- Compromised Truth [PYRRHIC]
  - Summary: You halt tonight's rite but trigger retaliatory disappearances.
  - Epilogue: The culprit is exposed, but allies and witnesses are fractured.
  - Sequel Hook: A surviving witness asks for help in a linked disappearance.
- Corruption Pact [CORRUPTION]
  - Summary: You preserve the rite in exchange for selective immunity.
  - Epilogue: You keep control of the case, and the villain keeps control of you.
  - Sequel Hook: Season continuity marks the player as compromised.

## Replay Hooks
- Ritual order randomizes by date and latency.
- Community puzzle can unlock nonviolent break path.
- Villain style shifts by choices.

## Community Puzzle Hooks
- Lantern Route Triangulation: Merge three lantern route fragments to locate the hidden threshing pit.
  - Reward clue: the-harvest-men-clue-origin
  - Failure: The villain captures your partial decode and reroutes the final branch.

