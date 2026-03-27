# Static Between Stations QA Agent Report

- Story ID: `static-between-stations`
- Generated: 2026-03-24T22:12:37.233Z
- Production Readiness: **93/100**
- Difficulty: **3 (Advanced)**

## Coverage

- Beat coverage: 100%
- Choice coverage: 100%
- Ending coverage: 100%
- Optional ending coverage: 50%
- Failure ending coverage: 100%

## Score Breakdown

- Structural: 100
- Narrative: 78
- Interaction: 100
- Consequence Depth: 100
- Novice Clarity: 82
- Reliability: 93
- Media Production: 92

## Media QA

- Voice profiles mapped: 6/6
- Unique OpenAI voices: 6
- Unique voice signatures: 6
- Video duration compliant: 13/13
- Video voiceover compliant: 13/13
- Voice naturalness compliant: 2/5
- Video narration naturalness compliant: 13/13

## Issues

- Message flood risk: average message count per beat is high and may overwhelm novice players.

## Recommendations

- Increase in-beat delay spread and gate lower-priority messages behind response selections.
- 1 optional-tone endings are currently rare; keep as stretch outcomes or tune branch balance if desired.
- Regenerate voice profile assets so each character has full design metadata (speed, pitch, texture, EQ).
- Run human playtest on mobile with the novice script to verify readability and pacing under real interruption patterns.

## Scenario Outcomes

| Scenario ID | Strategy | Steps | Ending | Progress |
| --- | --- | ---: | --- | ---: |
| protocol-conservative | Protocol Conservative (Novice) | 28 | JUSTICE | 100 |
| pressure-audit | Pressure Audit (Assertive) | 28 | TRAGIC | 100 |
| shadow-deceiver | Shadow Deceiver (Undercover) | 28 | CORRUPTION | 100 |
| rotating-probe | Rotating Probe (Branch Sampler) | 28 | TRAGIC | 100 |
| justice-maximizer | Justice Maximizer | 28 | JUSTICE | 100 |
| corruption-maximizer | Corruption Maximizer | 28 | TRAGIC | 100 |
| tragic-force | Tragic Force Path | 28 | TRAGIC | 100 |
| pyrrhic-balancer | Pyrrhic Balancer | 28 | TRAGIC | 100 |
| novice-curious | Novice Curious Path | 28 | JUSTICE | 100 |
| ending-target-justice | Ending Target - JUSTICE | 28 | JUSTICE | 100 |
| ending-target-pyrrhic | Ending Target - PYRRHIC | 28 | TRAGIC | 100 |
| ending-target-tragic | Ending Target - TRAGIC | 28 | JUSTICE | 100 |
| ending-target-corruption | Ending Target - CORRUPTION | 28 | TRAGIC | 100 |
| ending-target-unresolved | Ending Target - UNRESOLVED | 28 | PYRRHIC | 100 |

