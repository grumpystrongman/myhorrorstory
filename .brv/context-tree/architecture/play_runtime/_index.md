---
children_hash: 69019d1b8d3b4a3352407c76852283c548ef7f44d8e98fdadf302eb2fb20372f
compression_ratio: 0.6577777777777778
condensation_order: 1
covers: [channel_relay_and_ui_logic.md, play_runtime_and_channel_relay.md]
covers_token_total: 675
summary_level: d1
token_count: 444
type: summary
---
# Play Runtime and Channel Relay Structural Summary

The Play Runtime manages the live game session, coordinating user interface interactions, message simulation, and external communication channels.

### Core Architecture and UI Logic
The runtime operates primarily within `apps/web/src/app/play/page.tsx`, managing session state via `playerId` retrieved from URL parameters or `localStorage` (`myhorrorstory.channel.playerId`). Key UI constants include:
*   **Message Delays:** Minimum 1.2s, maximum 45s.
*   **View Constraints:** Zoom/pan limits set between 50% and 200%.
*   **Composer Logic:** The iPhone composer is specifically unblocked from `isSimulatingBeat` restrictions to allow for mission bootstrapping and initial quick-replies.

For detailed UI implementation, see: **channel_relay_and_ui_logic.md**

### External Channel Relay Mechanism
The system utilizes a relay API (`/api/channels/send`) to bridge in-game messages to external providers. 
*   **Supported Platforms:** SMS, WhatsApp, and Telegram.
*   **Relay Logic:** Only non-investigator messages are automatically relayed to external channels.
*   **Technical Requirements:** 
    *   US 10-digit phone numbers are normalized with a `+1` prefix.
    *   WhatsApp destinations require a `whatsapp:` prefix.
    *   Telegram requires a numeric `chatId`.

For relay flow and file references, see: **play_runtime_and_channel_relay.md**

### Gameplay Mechanics and Rules
*   **Hint Penalty System:** Logic applies severity-based increases to game state:
    *   **Progress:** +1 to +3
    *   **Day:** +1 to +2
    *   **Danger/Villain:** +2 to +5
*   **Security/Data:** The audio cipher code is defined as `440`.

For specific penalty values and logic constants, see: **play_runtime_and_channel_relay.md**