export function buildCommercialCreativeIssueBlueprints(storyIds) {
  const core = [
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

  return [...core, ...perStory];
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
