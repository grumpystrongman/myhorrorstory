export function buildCommercialCreativeIssueBlueprints(storyIds) {
  const core = [
    {
      title: 'Immersive Gameplay UX Delivery Pack',
      botId: 'AI-Web-App-Agent',
      priority: 1,
      description:
        'Deliver production-grade play-session experience: live message feed, popup channel simulation, branching response controls, investigation board ergonomics, ending debrief, and accessibility-safe interaction pacing.'
    },
    {
      title: 'In-App Channel Simulation and Notification Abstraction',
      botId: 'AI-Backend-Agent',
      priority: 1,
      description:
        'Implement simulation-first messaging gateway across SMS/WhatsApp/Telegram/email surfaces in web runtime, with provider-agnostic abstractions for future direct phone notifications.'
    },
    {
      title: 'Voice Drama Performance and Casting Production',
      botId: 'AI-Voice-Audio-Agent',
      priority: 1,
      description:
        'Finalize character voice direction and line delivery system across all story arcs, with provider chain support (Piper, ElevenLabs, OpenAI, Polly), emotion controls, and runtime playback behavior.'
    },
    {
      title: 'Story Arc Finalization and Branch Packaging QA',
      botId: 'AI-Story-Engine-Agent',
      priority: 1,
      description:
        'Finalize every launch story with complete beat progression, branch outcomes, replay hooks, and ending paths packaged into runtime artifacts and validated against narrative contracts.'
    },
    {
      title: 'Commercial Website Art Direction System',
      botId: 'AI-UX-UI-Agent',
      priority: 1,
      description:
        'Define premium horror-luxe visual system for marketing site and gameplay UI: typography stack, spacing scale, icon style, motion language, accessibility variants, and component acceptance references.'
    },
    {
      title: 'Brand Key Art and Campaign Creative Pack',
      botId: 'AI-Media-Pipeline-Agent',
      priority: 1,
      description:
        'Create campaign-quality key art, social crops, and launch creative derivatives with provenance metadata and revision controls.'
    },
    {
      title: 'Commercial Landing Conversion Optimization Pack',
      botId: 'AI-Growth-CRM-Agent',
      priority: 2,
      description:
        'Build and test high-conversion page sections (hero, credibility strip, CTA sequencing, social proof placements) with lifecycle hooks.'
    },
    {
      title: 'Visual QA and Accessibility Certification for Brand Surfaces',
      botId: 'AI-QA-Test-Agent',
      priority: 1,
      description:
        'Run visual and accessibility QA on all branded website surfaces, ensuring contrast, keyboard flow, and content readability on desktop/mobile.'
    },
    {
      title: 'Creative Pipeline Security and Licensing Controls',
      botId: 'AI-Security-Compliance-Agent',
      priority: 1,
      description:
        'Enforce asset provenance, provider usage policy, licensing metadata, moderation checks, and audit-safe retention rules.'
    }
  ];

  const perStory = storyIds.map((storyId) => ({
    title: `Story Asset Suite: ${storyId}`,
    botId: 'AI-Media-Pipeline-Agent',
    priority: 2,
    description:
      `Generate complete production-ready asset set for story ${storyId}: character portraits, scene art, evidence visuals, promo creatives, and social variants with reusable manifests.`
  }));

  const perStoryNarrative = storyIds.map((storyId) => ({
    title: `Final Drama Package: ${storyId}`,
    botId: 'AI-Story-Engine-Agent',
    priority: 2,
    description:
      `Ship fully authored runtime drama package for ${storyId} with beat-level channel drops, response branches, intent impacts, voice line sheets, and final ending debrief outcomes.`
  }));

  return [...core, ...perStory, ...perStoryNarrative];
}

export function buildCommercialWebsiteBlueprint() {
  return [
    {
      surface: 'landing',
      objective: 'Conversion-first premium first impression.',
      requiredAssets: [
        'hero_key_art',
        'trust_strip_icons',
        'case_highlight_cards',
        'subscription_tier_visuals',
        'testimonial_backplates'
      ]
    },
    {
      surface: 'library',
      objective: 'High-clarity case exploration with premium styling.',
      requiredAssets: [
        'genre_header_banners',
        'case_cover_art',
        'difficulty_badges',
        'session_length_chips'
      ]
    },
    {
      surface: 'play',
      objective: 'Immersive but readable gameplay visual hierarchy.',
      requiredAssets: [
        'evidence_board_backgrounds',
        'chapter_transition_cards',
        'ui_texture_layers',
        'character_message_portraits'
      ]
    },
    {
      surface: 'marketing_emails',
      objective: 'Consistent branded lifecycle communication.',
      requiredAssets: [
        'email_header_art',
        'story_teaser_panels',
        'offer_cards'
      ]
    }
  ];
}
