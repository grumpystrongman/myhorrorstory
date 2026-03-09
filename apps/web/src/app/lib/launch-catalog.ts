import { getStoryTitle, listStoryScores, type StoryScoreSummary } from '@myhorrorstory/music';

export interface LaunchCase extends StoryScoreSummary {
  subgenre: string;
  toneLabel: string;
  hook: string;
  warnings: string[];
  visualPath: string;
  coverImagePath: string;
  heroImagePath: string;
  evidenceImagePath: string;
  portraitImagePath: string;
  spotlight: string;
}

const metadataByStoryId: Record<
  string,
  {
    subgenre: string;
    toneLabel: string;
    hook: string;
    warnings: string[];
    spotlight: string;
  }
> = {
  'static-between-stations': {
    subgenre: 'Psychological Horror',
    toneLabel: 'Cinematic / Distorted Memory',
    hook: 'A dead rail line starts broadcasting confessions in your own voice.',
    warnings: ['Disturbing audio', 'Stalking behavior', 'Threats'],
    spotlight: 'Signal-grade spectrogram clues and emotional witness contradiction loops.'
  },
  'black-chapel-ledger': {
    subgenre: 'Gothic Horror',
    toneLabel: 'Ceremonial / Ominous',
    hook: 'A cathedral debt ledger records names of people who have not gone missing yet.',
    warnings: ['Religious imagery', 'Coercion', 'Mature themes'],
    spotlight: 'Layered archive clues with bell-tower voice drops and confession route branches.'
  },
  'the-harvest-men': {
    subgenre: 'Folk Horror',
    toneLabel: 'Slow-Burn / Rural Dread',
    hook: 'A masked procession marks players as participants in a ritual they did not choose.',
    warnings: ['Ritual violence', 'Body threat', 'Cult coercion'],
    spotlight: 'Weather-gated clue cadence and distributed party puzzle shards.'
  },
  'signal-from-kharon-9': {
    subgenre: 'Cosmic Horror',
    toneLabel: 'Cold / Existential',
    hook: 'A decommissioned deep-space station sends telemetry that references private player actions.',
    warnings: ['Existential dread', 'Disorientation', 'Threat'],
    spotlight: 'Telemetry decoding, map overlays, and branching containment decisions.'
  },
  'the-fourth-tenant': {
    subgenre: 'Supernatural Mystery',
    toneLabel: 'Urban / Uneasy',
    hook: 'A missing apartment keeps collecting rent from tenants that do not appear on any record.',
    warnings: ['Stalking behavior', 'Disturbing imagery', 'Threat'],
    spotlight: 'Evidence board lease chain reconstruction and trust-fracture dialogue paths.'
  },
  'tape-17-pinewatch': {
    subgenre: 'Found Footage Investigation',
    toneLabel: 'Documentary / Panic',
    hook: 'Recovered camera tapes rewrite themselves after midnight.',
    warnings: ['Missing persons', 'Panic audio', 'Threat'],
    spotlight: 'Frame-level anomalies, audio reversal clues, and field-versus-forensics branching.'
  },
  'crown-of-salt': {
    subgenre: 'Occult Conspiracy',
    toneLabel: 'Conspiratorial / Liturgical',
    hook: 'A smuggling ring traffics relics that rewrite witness memory after contact.',
    warnings: ['Cult themes', 'Violence', 'Coercion'],
    spotlight: 'Logistics-led clue graphing with cartel and ritual cell reveal variants.'
  },
  'red-creek-winter': {
    subgenre: 'Small-Town Slasher Mystery',
    toneLabel: 'Frozen / High Pressure',
    hook: 'Each snowfall reveals a body and an alibi that should be impossible.',
    warnings: ['Slasher violence', 'Threat', 'Mature distress'],
    spotlight: 'Pacing spikes, timed accusations, and survival-weighted ending branches.'
  },
  'ward-1908': {
    subgenre: 'Haunted Institution',
    toneLabel: 'Institutional / Oppressive',
    hook: 'A closed psychiatric ward keeps updating patient files every night.',
    warnings: ['Medical trauma themes', 'Confinement', 'Threat'],
    spotlight: 'Archival clue chains with haunted-record and human-cover-up variants.'
  },
  'dead-channel-protocol': {
    subgenre: 'Techno / Paranormal Thriller',
    toneLabel: 'Networked / Accelerated',
    hook: 'A transit-control app predicts outages, deaths, and your next move.',
    warnings: ['Surveillance anxiety', 'Threat', 'Panic scenarios'],
    spotlight: 'Channel spoofing, synthetic clue corruption, and escalation-heavy villain contact.'
  },
  'midnight-lockbox': {
    subgenre: 'Short Mode Supernatural Mystery',
    toneLabel: 'Compact / Procedural',
    hook: 'A storage unit sends voicemails that predict what your team will do next.',
    warnings: ['Threat', 'Stalking behavior', 'Disturbing audio'],
    spotlight: '1-2 day async QA arc with full villain escalation and replay hooks.'
  }
};

export function getLaunchCases(): LaunchCase[] {
  return listStoryScores().map((entry) => {
    const meta = metadataByStoryId[entry.storyId];
    const visualPath = `/visuals/stories/${entry.storyId}.svg`;
    return {
      ...entry,
      subgenre: meta?.subgenre ?? 'Horror Mystery',
      toneLabel: meta?.toneLabel ?? 'Cinematic',
      hook: meta?.hook ?? `${getStoryTitle(entry.storyId)} is now available.`,
      warnings: meta?.warnings ?? ['Mature themes'],
      visualPath,
      coverImagePath: visualPath,
      heroImagePath: visualPath,
      evidenceImagePath: visualPath,
      portraitImagePath: visualPath,
      spotlight: meta?.spotlight ?? 'Branching clue outcomes and remote co-op pacing.'
    };
  });
}

export function getLaunchCaseById(storyId: string): LaunchCase | undefined {
  return getLaunchCases().find((entry) => entry.storyId === storyId);
}
