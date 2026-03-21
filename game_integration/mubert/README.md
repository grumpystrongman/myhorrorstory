# Mubert Adaptive Integration

This folder contains runtime integration examples for adaptive horror music.

## Files

- `types.ts`: state/credential/request types
- `stateMap.ts`: game-state to playlist/intensity mapping
- `mubertClient.ts`: API wrapper with response/url extraction safeguards
- `adaptiveMusicManager.ts`: crossfades + debounced transitions + preloading
- `simpleStateManager.ts`: metric-based state resolver
- `webExample.ts`: browser setup example
- `unity/HorrorAdaptiveMusicController.cs`: Unity implementation

## Endpoint Assumptions

API usage is based on public snippets from `https://mubert.com/api`:

- `POST https://music-api.mubert.com/api/v3/public/tracks`
- `GET https://music-api.mubert.com/api/v3/public/streaming/get-link`

Confirm exact payload/response schema in your account docs before shipping.

## Credential Handling

Use secure server-side config or encrypted secret management.
Do not commit live `customer-id` or `access-token`.
