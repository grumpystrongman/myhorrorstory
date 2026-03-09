# Trigger DSL

## Purpose
The trigger DSL allows deterministic story reactions based on player behavior, trust dynamics, timing, and clue progress.

## Condition Grammar
- `predicate`
- `all`
- `any`
- `not`

### Predicate Shape
- `source`: fact source (`PLAYER_REPUTATION`, `NPC_TRUST`, `HAS_CLUE`, `EVENT_OCCURRED`, `VILLAIN_STAGE`, etc.).
- `key`: field or entity id.
- `operator`: `EQ`, `NEQ`, `GT`, `GTE`, `LT`, `LTE`, `INCLUDES`, `NOT_INCLUDES`.
- `value`: primitive (`string | number | boolean`).

## Rule Shape
- `id`, `name`, `description`
- `eventType`: execution context (`PLAYER_MESSAGE`, `PLAYER_ACCUSATION`, `PLAYER_DELAY`, etc.)
- `when`: condition tree
- `actions`: ordered action list
- `priority`: higher first
- `cooldownSeconds`: minimum interval between activations
- `maxActivations`: upper bound per runtime

## Supported Actions
- `SEND_MESSAGE`
- `UPDATE_REPUTATION`
- `UPDATE_NPC_TRUST`
- `SET_FLAG`
- `REVEAL_CLUE`
- `EMIT_EVENT`
- `START_COUNTDOWN`
- `ADVANCE_VILLAIN_STAGE`
- `LOCK_ENDING`
- `UNLOCK_ENDING`

## Example
```json
{
  "id": "rule-near-success",
  "eventType": "INVESTIGATION_PROGRESS",
  "when": {
    "kind": "predicate",
    "predicate": {
      "source": "INVESTIGATION_PROGRESS",
      "key": "percent",
      "operator": "GTE",
      "value": 85
    }
  },
  "actions": [
    { "type": "ADVANCE_VILLAIN_STAGE", "stage": 4 },
    {
      "type": "START_COUNTDOWN",
      "countdownId": "final-choice",
      "durationSeconds": 900,
      "failureEventId": "hostage.lost"
    }
  ],
  "priority": 95,
  "cooldownSeconds": 300,
  "maxActivations": 1
}
```

## Runtime Evaluation
- Evaluate condition tree against `StoryRuntimeState`.
- Filter by event type, cooldown, and activation limits.
- Sort by descending priority.
- Apply actions in order to produce next state.

## Narrative Director Handshake
- Trigger evaluation remains deterministic and stateful.
- Narrative Director consumes the updated runtime plus behavior telemetry to emit event cards.
- Each event card carries response options and consequence mappings that feed back into runtime as:
- `PLAYER_MESSAGE`, `PLAYER_ACCUSATION`, `PLAYER_DELAY`, `INVESTIGATION_PROGRESS`, and `CLUE_DISCOVERED`.
