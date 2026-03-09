# Crown of Salt - Finalized Story Playbook

- Story ID: `crown-of-salt`
- Version: `v2`
- Subgenre: occult conspiracy
- Tone: CINEMATIC
- Hook: A relic-smuggling cartel launders artifacts through a city that disappears at dawn tide.
- Location: Port authority archives and salt catacombs
- Target Session: 100 minutes

## Arc Map
- Contact and Contradiction (OPENING): The case opens with impossible evidence and uncertain allies.
- Interference and Doubt (MIDDLE): Villain contact escalates while ally trust becomes volatile.
- Confrontation and Reckoning (ENDGAME): The final branch depends on ethics, timing, and trust.

## Beat-by-Beat Runtime Package
### Manifest Drift (`beat-1`)
- Act: Contact
- Villain Stage: 1
- Narrative: Shipping manifests arrive by email and WhatsApp with contradictory destination ports.
- Incoming Message Sequence:
  - [SMS] Port Auditor Lin Ortega: Shipping manifests arrive by email and WhatsApp with contradictory destination ports. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 32)
  - [WHATSAPP] Smuggler Rafe Quinn: Cross-reference this before dawn: Brine-sealed manifest. (delay 3s, intensity 48)
  - [SMS] The Salt Regent: You traced the crate, not the oath that moved it. (Peripheral Presence) (delay 6s, intensity 62)
- Player Response Branches:
  - Audit crate chain-of-custody from port systems -> beat-2 | intent=CURIOSITY | progress +20
  - Flip the smuggler before the cartel locks channels -> beat-2 | intent=CURIOSITY | progress +20
- Clue Reveals: crown-of-salt-clue-origin

### Escalation Signal (`beat-2`)
- Act: Contact
- Villain Stage: 1
- Narrative: A contradictory channel drop appears within minutes and forces risk.
- Incoming Message Sequence:
  - [WHATSAPP] Smuggler Rafe Quinn: A contradictory channel drop appears within minutes and forces risk. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 32)
  - [TELEGRAM] Archivist Nun Sister Mirel: Cross-reference this before dawn: Dockside CCTV still. (delay 3s, intensity 48)
  - [SMS] The Salt Regent: You traced the crate, not the oath that moved it. (Peripheral Presence) (delay 6s, intensity 62)
- Player Response Branches:
  - Preserve original evidence chain -> beat-3 | intent=CURIOSITY | progress +18
  - Pursue suspect immediately -> beat-3 | intent=CURIOSITY | progress +18
- Clue Reveals: crown-of-salt-clue-pressure

### Trust Fracture (`beat-3`)
- Act: Interference
- Villain Stage: 2
- Narrative: The villain mixes real secrets with fabricated claims to split allies.
- Incoming Message Sequence:
  - [TELEGRAM] Archivist Nun Sister Mirel: The villain mixes real secrets with fabricated claims to split allies. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 44)
  - [EMAIL] Customs Broker Dax Ren: Cross-reference this before dawn: Catacomb symbol tracing. (delay 3s, intensity 61)
  - [WHATSAPP] The Salt Regent: He smiles because you made his bargain for him. (Psychological Contact) (delay 6s, intensity 76)
- Player Response Branches:
  - Trust Port Auditor Lin Ortega and secure witness -> beat-4 | intent=COMPLIANCE | progress +26
  - Trust Smuggler Rafe Quinn and expose internal leak -> beat-4 | intent=COMPLIANCE | progress +26
- Clue Reveals: crown-of-salt-clue-contradiction

### Ultimatum Window (`beat-4`)
- Act: Interference
- Villain Stage: 3
- Narrative: A timed message threatens collateral harm unless the party diverts.
- Incoming Message Sequence:
  - [EMAIL] Customs Broker Dax Ren: A timed message threatens collateral harm unless the party diverts. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 56)
  - [VOICE_MESSAGE] Port Auditor Lin Ortega: Cross-reference this before dawn: Customs API anomaly log. (delay 3s, intensity 74)
  - [SMS] The Salt Regent: Choose: the nun lives, or the port burns clean. (Active Interference) (delay 6s, intensity 90)
- Player Response Branches:
  - Divert to save threatened NPC -> beat-5 | intent=THREAT | progress +30
  - Continue forensic pursuit under threat -> beat-5 | intent=THREAT | progress +30
- Clue Reveals: crown-of-salt-clue-timed-warning

### Confrontation Protocol (`beat-5`)
- Act: Reckoning
- Villain Stage: 4
- Narrative: Players reconstruct motive and false trails before collapse.
- Incoming Message Sequence:
  - [VOICE_MESSAGE] Port Auditor Lin Ortega: Players reconstruct motive and false trails before collapse. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 68)
  - [DOCUMENT_DROP] Smuggler Rafe Quinn: Cross-reference this before dawn: Brine-sealed manifest. (delay 3s, intensity 87)
  - [EMAIL] The Salt Regent: Confess one lie and I return one life. (Personal Confrontation) (delay 6s, intensity 100)
- Player Response Branches:
  - Commit to formal accusation and expose evidence chain -> beat-6 | intent=ACCUSATION | progress +34
  - Take private contact route for hidden confession -> beat-6 | intent=BARGAIN | progress +34
- Clue Reveals: crown-of-salt-clue-reveal

### Case Debrief (`beat-6`)
- Act: Reckoning
- Villain Stage: 4
- Narrative: Final scoring resolves ending branch and season continuity flags.
- Incoming Message Sequence:
  - [DOCUMENT_DROP] Smuggler Rafe Quinn: Final scoring resolves ending branch and season continuity flags. Maintain chain-of-custody and keep your channel open. (delay 1s, intensity 68)
  - [SIMULATED_SITE] Archivist Nun Sister Mirel: Cross-reference this before dawn: Dockside CCTV still. (delay 3s, intensity 87)
  - [EMAIL] The Salt Regent: Confess one lie and I return one life. (Personal Confrontation) (delay 6s, intensity 100)
- Player Response Branches:
  - Proceed with controlled pressure -> ending | intent=CURIOSITY | progress +30
- Clue Reveals: crown-of-salt-clue-epilogue

## Ending Variants
- Clean Resolution [JUSTICE]
  - Summary: You dismantle the smuggling lattice and preserve admissible evidence.
  - Epilogue: Truth lands publicly with evidence that survives scrutiny.
  - Sequel Hook: A tagged evidence box points to the next case.
- Compromised Truth [PYRRHIC]
  - Summary: You collapse the ritual cell but lose legal leverage over sponsors.
  - Epilogue: The culprit is exposed, but allies and witnesses are fractured.
  - Sequel Hook: A surviving witness asks for help in a linked disappearance.
- Corruption Pact [CORRUPTION]
  - Summary: You become gatekeeper of relic flow under a private pact.
  - Epilogue: You keep control of the case, and the villain keeps control of you.
  - Sequel Hook: Season continuity marks the player as compromised.

## Replay Hooks
- Route graph permutations alter hierarchy.
- Nun-trust branch opens nonviolent path.
- Taunts adapt strongly to deception profile.

