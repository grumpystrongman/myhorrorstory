using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;
using UnityEngine;
using UnityEngine.Networking;

public enum HorrorGameState
{
    Exploration,
    SafeRoom,
    TensionRising,
    EnemyNearby,
    Chase,
    BossEncounter,
    PostScareCooldown,
    DeathGameOver
}

[Serializable]
public class MubertStateProfile
{
    public HorrorGameState state;
    public string playlistIndex = "1.0.0";
    public string intensity = "low"; // low | medium | high
    public int durationSec = 90;
    public int bitrate = 320;
    public string format = "wav";
    public AudioClip fallbackClip;
}

public class HorrorAdaptiveMusicController : MonoBehaviour
{
    [Header("Mubert Credentials (set securely in production)")]
    [SerializeField] private string customerId = "REPLACE_ME";
    [SerializeField] private string accessToken = "REPLACE_ME";

    [Header("Audio Routing")]
    [SerializeField] private AudioSource sourceA;
    [SerializeField] private AudioSource sourceB;
    [SerializeField] private float baseVolume = 0.72f;
    [SerializeField] private float crossfadeDuration = 2.6f;
    [SerializeField] private float debounceSeconds = 0.7f;
    [SerializeField] private float minTransitionInterval = 1.2f;

    [Header("State Profiles")]
    [SerializeField] private List<MubertStateProfile> profiles = new List<MubertStateProfile>();

    private readonly Dictionary<HorrorGameState, string> urlCache = new Dictionary<HorrorGameState, string>();
    private readonly Dictionary<HorrorGameState, MubertStateProfile> profileMap = new Dictionary<HorrorGameState, MubertStateProfile>();

    private HorrorGameState? currentState;
    private HorrorGameState? pendingState;
    private float pendingAt = -1f;
    private float lastTransitionAt = -999f;
    private bool useAAsActive = true;

    private const string TracksEndpoint = "https://music-api.mubert.com/api/v3/public/tracks";

    private void Awake()
    {
        if (sourceA == null || sourceB == null)
        {
            Debug.LogError("Assign both audio sources for adaptive music crossfades.");
            enabled = false;
            return;
        }

        sourceA.loop = true;
        sourceB.loop = true;
        sourceA.volume = baseVolume;
        sourceB.volume = 0f;

        foreach (var profile in profiles)
        {
            profileMap[profile.state] = profile;
        }
    }

    private void Update()
    {
        if (!pendingState.HasValue)
        {
            return;
        }
        if (Time.unscaledTime < pendingAt + debounceSeconds)
        {
            return;
        }
        if (Time.unscaledTime < lastTransitionAt + minTransitionInterval)
        {
            return;
        }
        var next = pendingState.Value;
        pendingState = null;
        StartCoroutine(TransitionToState(next));
    }

    public void SetState(HorrorGameState state)
    {
        if (currentState.HasValue && currentState.Value == state)
        {
            return;
        }
        pendingState = state;
        pendingAt = Time.unscaledTime;
    }

    public void Prime(HorrorGameState initialState)
    {
        StartCoroutine(PrimeRoutine(initialState));
    }

    private IEnumerator PrimeRoutine(HorrorGameState initialState)
    {
        yield return TransitionToState(initialState);
    }

    private IEnumerator TransitionToState(HorrorGameState state)
    {
        if (!profileMap.TryGetValue(state, out var profile))
        {
            Debug.LogWarning($"No profile mapped for state {state}");
            yield break;
        }

        var incoming = useAAsActive ? sourceB : sourceA;
        var outgoing = useAAsActive ? sourceA : sourceB;

        string url = null;
        if (!urlCache.TryGetValue(state, out url))
        {
            bool done = false;
            string resolvedUrl = null;
            string error = null;
            yield return StartCoroutine(RequestTrackUrl(profile, value =>
            {
                resolvedUrl = value;
                done = true;
            }, fail =>
            {
                error = fail;
                done = true;
            }));
            if (!done)
            {
                yield break;
            }
            if (string.IsNullOrWhiteSpace(resolvedUrl))
            {
                Debug.LogWarning($"Mubert fallback for state {state}: {error}");
                if (profile.fallbackClip != null)
                {
                    incoming.clip = profile.fallbackClip;
                    incoming.time = 0f;
                    incoming.Play();
                    yield return StartCoroutine(Crossfade(outgoing, incoming, crossfadeDuration));
                    FinalizeTransition(state);
                }
                yield break;
            }
            url = resolvedUrl;
            urlCache[state] = url;
        }

        bool clipLoaded = false;
        AudioClip loadedClip = null;
        string clipError = null;
        yield return StartCoroutine(DownloadClip(url, clip =>
        {
            loadedClip = clip;
            clipLoaded = true;
        }, fail =>
        {
            clipError = fail;
            clipLoaded = true;
        }));

        if (!clipLoaded || loadedClip == null)
        {
            Debug.LogWarning($"Failed to stream clip for {state}: {clipError}");
            if (profile.fallbackClip == null)
            {
                yield break;
            }
            incoming.clip = profile.fallbackClip;
        }
        else
        {
            incoming.clip = loadedClip;
        }

        incoming.time = 0f;
        incoming.Play();
        yield return StartCoroutine(Crossfade(outgoing, incoming, crossfadeDuration));
        FinalizeTransition(state);
    }

    private void FinalizeTransition(HorrorGameState state)
    {
        currentState = state;
        pendingState = null;
        lastTransitionAt = Time.unscaledTime;
        useAAsActive = !useAAsActive;
        StartCoroutine(PreloadNeighbors(state));
    }

    private IEnumerator PreloadNeighbors(HorrorGameState state)
    {
        var candidates = PickNeighbors(state);
        foreach (var neighbor in candidates)
        {
            if (urlCache.ContainsKey(neighbor) || !profileMap.TryGetValue(neighbor, out var profile))
            {
                continue;
            }
            bool done = false;
            yield return StartCoroutine(RequestTrackUrl(profile, url =>
            {
                if (!string.IsNullOrWhiteSpace(url))
                {
                    urlCache[neighbor] = url;
                }
                done = true;
            }, _ => { done = true; }));
            if (!done)
            {
                yield break;
            }
        }
    }

    private List<HorrorGameState> PickNeighbors(HorrorGameState state)
    {
        switch (state)
        {
            case HorrorGameState.Exploration:
                return new List<HorrorGameState> { HorrorGameState.TensionRising, HorrorGameState.SafeRoom };
            case HorrorGameState.SafeRoom:
                return new List<HorrorGameState> { HorrorGameState.Exploration, HorrorGameState.PostScareCooldown };
            case HorrorGameState.TensionRising:
                return new List<HorrorGameState> { HorrorGameState.EnemyNearby, HorrorGameState.Exploration };
            case HorrorGameState.EnemyNearby:
                return new List<HorrorGameState> { HorrorGameState.Chase, HorrorGameState.TensionRising };
            case HorrorGameState.Chase:
                return new List<HorrorGameState> { HorrorGameState.EnemyNearby, HorrorGameState.DeathGameOver };
            case HorrorGameState.BossEncounter:
                return new List<HorrorGameState> { HorrorGameState.Chase, HorrorGameState.DeathGameOver };
            case HorrorGameState.PostScareCooldown:
                return new List<HorrorGameState> { HorrorGameState.Exploration, HorrorGameState.TensionRising };
            default:
                return new List<HorrorGameState> { HorrorGameState.Exploration };
        }
    }

    private IEnumerator Crossfade(AudioSource outgoing, AudioSource incoming, float durationSec)
    {
        if (durationSec <= 0f)
        {
            outgoing.volume = 0f;
            incoming.volume = baseVolume;
            outgoing.Stop();
            yield break;
        }

        float elapsed = 0f;
        while (elapsed < durationSec)
        {
            elapsed += Time.unscaledDeltaTime;
            float t = Mathf.Clamp01(elapsed / durationSec);
            float outGain = Mathf.Cos(t * Mathf.PI * 0.5f);
            float inGain = Mathf.Sin(t * Mathf.PI * 0.5f);
            outgoing.volume = baseVolume * outGain;
            incoming.volume = baseVolume * inGain;
            yield return null;
        }
        outgoing.volume = 0f;
        incoming.volume = baseVolume;
        outgoing.Stop();
    }

    private IEnumerator RequestTrackUrl(
        MubertStateProfile profile,
        Action<string> onSuccess,
        Action<string> onError)
    {
        // Endpoint assumptions based on https://mubert.com/api snippets.
        // Verify exact payload/response schema against your account docs before shipping.
        var body = "{\"playlist_index\":\"" + profile.playlistIndex + "\","
            + "\"duration\":" + profile.durationSec + ","
            + "\"bitrate\":" + profile.bitrate + ","
            + "\"format\":\"" + profile.format + "\","
            + "\"intensity\":\"" + profile.intensity + "\","
            + "\"mode\":\"track\"}";

        using (var request = new UnityWebRequest(TracksEndpoint, "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(body);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            request.SetRequestHeader("customer-id", customerId);
            request.SetRequestHeader("access-token", accessToken);

            yield return request.SendWebRequest();
            if (request.result != UnityWebRequest.Result.Success)
            {
                onError?.Invoke(request.error);
                yield break;
            }

            string text = request.downloadHandler.text;
            string url = TryExtractFirstUrl(text);
            if (string.IsNullOrWhiteSpace(url))
            {
                onError?.Invoke("No URL found in API response.");
                yield break;
            }
            onSuccess?.Invoke(url);
        }
    }

    private IEnumerator DownloadClip(
        string url,
        Action<AudioClip> onSuccess,
        Action<string> onError)
    {
        using (var request = UnityWebRequestMultimedia.GetAudioClip(url, AudioType.WAV))
        {
            yield return request.SendWebRequest();
            if (request.result != UnityWebRequest.Result.Success)
            {
                onError?.Invoke(request.error);
                yield break;
            }
            var clip = DownloadHandlerAudioClip.GetContent(request);
            onSuccess?.Invoke(clip);
        }
    }

    private static string TryExtractFirstUrl(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        // Robust fallback extraction when response schema is uncertain.
        var match = Regex.Match(text, @"https?:\/\/[^\s\""']+");
        if (!match.Success)
        {
            return null;
        }
        return match.Value;
    }
}
