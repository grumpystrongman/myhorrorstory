# Red Creek Winter - Finalized Story Playbook

- Story ID: `red-creek-winter`
- Version: `v2`
- Subgenre: small-town slasher mystery
- Tone: INTENSE
- Hook: Each snowfall uncovers one body and one impossible alibi.
- Location: Mountain logging town under blizzard lockdown
- Target Session: 90 minutes

## Arc Map
- Contact and Contradiction (OPENING): The case opens with impossible evidence and uncertain allies.
- Interference and Doubt (MIDDLE): Villain contact escalates while ally trust becomes volatile.
- Confrontation and Reckoning (ENDGAME): The final branch depends on ethics, timing, and trust.

## Beat-by-Beat Runtime Package
### First Snow Body (`beat-1`)
- Act: Contact
- Villain Stage: 1
- Narrative: Dispatch pushes a crime scene map to SMS while social channels spread contradictory alibis.
- Incoming Message Sequence:
  - [SMS] Sheriff Dana Holt: Dispatch pushes a crime scene map to SMS while social channels spread contradictory alibis. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 32)
  - [WHATSAPP] Deputy Nico Vale: Cross-reference this before dawn: Dispatch freeze frame. (delay 3s, intensity 48)
  - [SMS] The White Knife: You found the body. You missed the pattern. (Peripheral Presence) (delay 6s, intensity 62)
- Player Response Branches:
  - Run forensic timeline from dispatch logs -> beat-2 | intent=CURIOSITY | progress +20
  - Break alibis in rapid witness interrogations -> beat-2 | intent=CURIOSITY | progress +20
- Clue Reveals: red-creek-winter-clue-origin

### Escalation Signal (`beat-2`)
- Act: Contact
- Villain Stage: 1
- Narrative: A contradictory channel drop appears within minutes and forces risk.
- Incoming Message Sequence:
  - [WHATSAPP] Deputy Nico Vale: A contradictory channel drop appears within minutes and forces risk. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 32)
  - [TELEGRAM] Journalist Mara Finch: Cross-reference this before dawn: Snow-depth forensic note. (delay 3s, intensity 48)
  - [SMS] The White Knife: You found the body. You missed the pattern. (Peripheral Presence) (delay 6s, intensity 62)
- Player Response Branches:
  - Preserve original evidence chain -> beat-3 | intent=CURIOSITY | progress +18
  - Pursue suspect immediately -> beat-3 | intent=CURIOSITY | progress +18
- Clue Reveals: red-creek-winter-clue-pressure

### Trust Fracture (`beat-3`)
- Act: Interference
- Villain Stage: 2
- Narrative: The villain mixes real secrets with fabricated claims to split allies.
- Incoming Message Sequence:
  - [TELEGRAM] Journalist Mara Finch: The villain mixes real secrets with fabricated claims to split allies. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 44)
  - [SIGNAL] Survivor Owen Pike: Cross-reference this before dawn: Ski lodge camera still. (delay 3s, intensity 61)
  - [WHATSAPP] The White Knife: Don't trust the deputy if you like breathing. (Psychological Contact) (delay 6s, intensity 76)
- Player Response Branches:
  - Trust Sheriff Dana Holt and secure witness -> beat-4 | intent=COMPLIANCE | progress +26
  - Trust Deputy Nico Vale and expose internal leak -> beat-4 | intent=COMPLIANCE | progress +26
- Clue Reveals: red-creek-winter-clue-contradiction

### Ultimatum Window (`beat-4`)
- Act: Interference
- Villain Stage: 3
- Narrative: A timed message threatens collateral harm unless the party diverts.
- Incoming Message Sequence:
  - [SIGNAL] Survivor Owen Pike: A timed message threatens collateral harm unless the party diverts. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 56)
  - [EMAIL] Sheriff Dana Holt: Cross-reference this before dawn: Anonymous tip voicemail. (delay 3s, intensity 74)
  - [SMS] The White Knife: Tell the state police and she dies before sunrise. (Active Interference) (delay 6s, intensity 90)
- Player Response Branches:
  - Divert to save threatened NPC -> beat-5 | intent=THREAT | progress +30
  - Continue forensic pursuit under threat -> beat-5 | intent=THREAT | progress +30
- Clue Reveals: red-creek-winter-clue-timed-warning

### Confrontation Protocol (`beat-5`)
- Act: Reckoning
- Villain Stage: 4
- Narrative: Players reconstruct motive and false trails before collapse.
- Incoming Message Sequence:
  - [EMAIL] Sheriff Dana Holt: Players reconstruct motive and false trails before collapse. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 68)
  - [VOICE_MESSAGE] Deputy Nico Vale: Cross-reference this before dawn: Dispatch freeze frame. (delay 3s, intensity 87)
  - [EMAIL] The White Knife: Confess one lie and I return one life. (Personal Confrontation) (delay 6s, intensity 100)
- Player Response Branches:
  - Commit to formal accusation and expose evidence chain -> beat-6 | intent=ACCUSATION | progress +34
  - Take private contact route for hidden confession -> beat-6 | intent=BARGAIN | progress +34
- Clue Reveals: red-creek-winter-clue-reveal

### Case Debrief (`beat-6`)
- Act: Reckoning
- Villain Stage: 4
- Narrative: Final scoring resolves ending branch and season continuity flags.
- Incoming Message Sequence:
  - [VOICE_MESSAGE] Deputy Nico Vale: Final scoring resolves ending branch and season continuity flags. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 68)
  - [DOCUMENT_DROP] Journalist Mara Finch: Cross-reference this before dawn: Snow-depth forensic note. (delay 3s, intensity 87)
  - [EMAIL] The White Knife: Confess one lie and I return one life. (Personal Confrontation) (delay 6s, intensity 100)
- Player Response Branches:
  - Proceed with controlled pressure -> ending | intent=CURIOSITY | progress +30
- Clue Reveals: red-creek-winter-clue-epilogue

## Ending Variants
- Clean Resolution [JUSTICE]
  - Summary: You secure both culprit and corroborated chain before storm lift.
  - Epilogue: Truth lands publicly with evidence that survives scrutiny.
  - Sequel Hook: A tagged evidence box points to the next case.
- Compromised Truth [PYRRHIC]
  - Summary: You stop killings but ignite permanent distrust in local institutions.
  - Epilogue: The culprit is exposed, but allies and witnesses are fractured.
  - Sequel Hook: A surviving witness asks for help in a linked disappearance.
- Corruption Pact [CORRUPTION]
  - Summary: You accept staged closure to keep panic and tourism revenue controlled.
  - Epilogue: You keep control of the case, and the villain keeps control of you.
  - Sequel Hook: Season continuity marks the player as compromised.

## Replay Hooks
- Suspect order rotates by weather seed.
- Aggressive play increases misinformation floods.
- Perfect run unlocks tribunal ending sequence.

