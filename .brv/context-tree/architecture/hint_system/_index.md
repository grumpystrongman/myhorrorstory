---
children_hash: 1754474dff8df9a81b418c77a7cf046dab039fd884b296332c0ce89ce25d6978
compression_ratio: 0.8526912181303116
condensation_order: 1
covers: [context.md, hint_system_architecture.md]
covers_token_total: 353
summary_level: d1
token_count: 301
type: summary
---
# Hint System Overview

The hint system provides a three-tier guidance architecture (approach, thinking, solve) integrated with LLM-backed generation and a server-authoritative penalty engine.

### Architecture and Integration
- **Flow**: UI Request → `/api/hints` → LLM (`gpt-4o-mini`) → Structured Hint + Penalties → UI Update.
- **LLM Configuration**: Uses `json_object` format, temperature `0.3`, and `buildFallbackHint` for error handling.
- **Key Files/Components**: Detailed in **hint_system_architecture.md**.

### Core Mechanisms
- **Guidance Levels**:
  - **Approach**: Low severity guidance.
  - **Thinking**: Medium severity conceptual help.
  - **Solve**: High severity; provides direct answers and executes autopick UI actions.
- **Penalty Logic**: Server-side enforcement affecting reputation, campaign progress, and villain advantage.
- **Key Constants**: Audio cipher code is `440`.

### Critical Rules
- Penalties must remain server-authoritative to prevent client-side bypass.
- Solve-level hints must provide the direct solution and automate UI selection.

For implementation details on API signatures and penalty scaling, refer to **hint_system_architecture.md** and **context.md**.