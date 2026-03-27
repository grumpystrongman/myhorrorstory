---
children_hash: bc7fb024add70d8e2bc8666e108e08f78e8789a0e02981457dc81cc19ca54005
compression_ratio: 0.632
condensation_order: 1
covers: [story_style_kits_and_schemas.md]
covers_token_total: 250
summary_level: d1
token_count: 158
type: summary
---
### Story Style Kits and Schemas (d1 Summary)

**Narrative Schemas & Style Kits**
*   **STORY_STYLE_KITS**: Standardized configurations for 10 core stories (e.g., *black-chapel-ledger*, *dead-channel-protocol*, *ward-1908*) defining Incident, Objective, Risk, and Setting Thread.
*   **Narrative Payloads**: Structured as `playerBriefing` and `caseFile` objects.

**Technical Constraints**
*   **API/Validation**: `ensureMessageShape` enforces a strict schema for message objects.
*   **Required Properties**: `id`, `senderName`, `role`, `channel`, `text`, `delaySeconds`, `intensity`.

*Reference: story_style_kits_and_schemas.md*