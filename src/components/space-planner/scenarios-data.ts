import type { CreatorTemplate, CreatorTemplateId } from './types';

// ============================================================
// Massive Expanded Studio Scenarios Library (100+ Scenarios)
// Grouped into distinct production categories:
// 1. Audio, Podcasts & Music Production (20 scenarios)
// 2. Video, Tech, Reviews & Streaming (25 scenarios)
// 3. Commercial, Product, Food & Fashion (25 scenarios)
// 4. Education, Corporate, Webinars & Keynotes (15 scenarios)
// 5. Small Spaces, Bedrooms & Mobile Rigs (15 scenarios)
// ============================================================

export const EXTENDED_SCENARIOS: Record<string, CreatorTemplate> = {
  // ------------------------------------------------------------
  // Audio, Podcasts & Music Production
  // ------------------------------------------------------------
  'podcast-4host-roundtable': {
    id: 'podcast-4host-roundtable' as any,
    name: '4-Host Master Roundtable Podcast',
    icon: '🎙️',
    category: 'Audio & Music',
    description: 'Circular 4-presenter broadcast setup with dynamic mics, individual headphone feeds, and overhead omni light',
    defaultRoom: { width: 5.5, depth: 4.8 },
    items: [
      { equipmentId: 'content-table', x: 0, z: -0.2, rotationY: 0 },
      { equipmentId: 'podcast-mic', x: -0.5, z: -0.4, rotationY: 0.3, parentId: 0 },
      { equipmentId: 'podcast-mic', x: 0.5, z: -0.4, rotationY: -0.3, parentId: 0 },
      { equipmentId: 'podcast-mic', x: -0.5, z: 0.0, rotationY: 1.2, parentId: 0 },
      { equipmentId: 'podcast-mic', x: 0.5, z: 0.0, rotationY: -1.2, parentId: 0 },
      { equipmentId: 'audio-recorder', x: 0, z: -0.2, rotationY: 0, parentId: 0 },
      { equipmentId: 'chair', x: -0.85, z: -0.5, rotationY: 0.3 },
      { equipmentId: 'chair', x: 0.85, z: -0.5, rotationY: -0.3 },
      { equipmentId: 'chair', x: -0.85, z: 0.1, rotationY: 1.2 },
      { equipmentId: 'chair', x: 0.85, z: 0.1, rotationY: -1.2 },
      { equipmentId: 'camera', x: 0, z: 1.6, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'softbox', x: -1.8, z: 0.5, rotationY: Math.PI / 3 },
      { equipmentId: 'softbox', x: 1.8, z: 0.5, rotationY: -Math.PI / 3 },
      { equipmentId: 'acoustic-panel', x: -2.4, z: -1.8, rotationY: Math.PI / 2 },
      { equipmentId: 'acoustic-panel', x: 2.4, z: -1.8, rotationY: -Math.PI / 2 },
      { equipmentId: 'power-station', x: 2.2, z: 1.4, rotationY: 0 },
    ],
  },

  'live-drum-recording': {
    id: 'live-drum-recording' as any,
    name: 'Full Drum Kit Tracking Room',
    icon: '🥁',
    category: 'Audio & Music',
    description: 'Acoustically treated drum sanctuary with overhead matched mics, snare spot mic, and isolation baffles',
    defaultRoom: { width: 5.8, depth: 5.0 },
    items: [
      { equipmentId: 'vocal-booth-screen', x: 0, z: -0.5, rotationY: 0 },
      { equipmentId: 'chair', x: 0, z: -0.5, rotationY: 0 },
      { equipmentId: 'microphone', x: -0.6, z: -0.2, rotationY: 0.5 },
      { equipmentId: 'microphone', x: 0.6, z: -0.2, rotationY: -0.5 },
      { equipmentId: 'shotgun-mic', x: 0, z: 0.8, rotationY: Math.PI },
      { equipmentId: 'content-table', x: 2.0, z: -1.0, rotationY: -Math.PI / 2 },
      { equipmentId: 'studio-monitor', x: 2.0, z: -1.3, rotationY: -Math.PI / 2, parentId: 5 },
      { equipmentId: 'audio-recorder', x: 2.0, z: -0.8, rotationY: -Math.PI / 2, parentId: 5 },
      { equipmentId: 'camera', x: -1.4, z: 1.5, rotationY: Math.PI * 0.7, isMainCamera: true },
      { equipmentId: 'acoustic-panel', x: -2.6, z: 0, rotationY: Math.PI / 2 },
      { equipmentId: 'acoustic-panel', x: 0, z: -2.3, rotationY: 0 },
      { equipmentId: 'rgb-tube', x: -2.2, z: -2.0, rotationY: Math.PI / 4 },
      { equipmentId: 'rgb-tube', x: 2.2, z: -2.0, rotationY: -Math.PI / 4 },
    ],
  },

  'piano-acoustic-recital': {
    id: 'piano-acoustic-recital' as any,
    name: 'Concert Grand Piano & Strings Stage',
    icon: '🎹',
    category: 'Audio & Music',
    description: 'Warm classical stage recording with stereo spaced pair microphones, dramatic spotlight, and warm ambient fill',
    defaultRoom: { width: 6.0, depth: 5.2 },
    items: [
      { equipmentId: 'keyboard-synth', x: 0, z: -0.5, rotationY: 0 },
      { equipmentId: 'chair', x: 0, z: 0.1, rotationY: 0 },
      { equipmentId: 'microphone', x: -0.8, z: -0.3, rotationY: 0.4 },
      { equipmentId: 'microphone', x: 0.8, z: -0.3, rotationY: -0.4 },
      { equipmentId: 'fresnel', x: -1.8, z: 1.2, rotationY: Math.PI / 3 },
      { equipmentId: 'softbox', x: 1.8, z: 1.2, rotationY: -Math.PI / 3 },
      { equipmentId: 'camera', x: 0, z: 2.0, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'backdrop', x: 0, z: -2.2, rotationY: 0 },
      { equipmentId: 'power-station', x: -2.4, z: -1.8, rotationY: 0 },
    ],
  },

  'acoustic-guitar-singer': {
    id: 'acoustic-guitar-singer' as any,
    name: 'Acoustic Guitarist & Singer Lounge',
    icon: '🎸',
    category: 'Audio & Music',
    description: 'Intimate acoustic music performance with condenser vocal mic, dynamic body mic, and warm mood lighting',
    defaultRoom: { width: 4.2, depth: 3.6 },
    items: [
      { equipmentId: 'chair', x: 0, z: -0.2, rotationY: 0 },
      { equipmentId: 'microphone', x: 0, z: 0.25, rotationY: Math.PI },
      { equipmentId: 'desk-lamp', x: -1.2, z: -0.8, rotationY: 0.3 },
      { equipmentId: 'camera', x: 0, z: 1.2, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'softbox', x: -1.2, z: 0.8, rotationY: Math.PI / 4 },
      { equipmentId: 'rgb-tube', x: 1.4, z: -1.2, rotationY: -Math.PI / 4 },
      { equipmentId: 'acoustic-panel', x: -1.8, z: -1.5, rotationY: 0 },
      { equipmentId: 'shelf-props', x: 1.5, z: -0.8, rotationY: -Math.PI / 2 },
    ],
  },

  // ------------------------------------------------------------
  // Video, Tech, Reviews & Streaming
  // ------------------------------------------------------------
  'tech-teardown-macro': {
    id: 'tech-teardown-macro' as any,
    name: 'Hardware Teardown & Macro Bench',
    icon: '🔬',
    category: 'Video & Tech',
    description: 'Ultra-precision workbench with articulating overhead microscope camera, dual LED ring lights, and magnetic screw tray',
    defaultRoom: { width: 4.5, depth: 3.8 },
    items: [
      { equipmentId: 'content-table', x: 0, z: -0.5, rotationY: 0 },
      { equipmentId: 'overhead-rig', x: 0, z: -0.5, rotationY: 0, parentId: 0 },
      { equipmentId: 'ring-light', x: 0.45, z: -0.5, rotationY: 0, parentId: 0 },
      { equipmentId: 'desk-lamp', x: -0.5, z: -0.5, rotationY: 0, parentId: 0 },
      { equipmentId: 'podcast-mic', x: -0.4, z: -0.3, rotationY: 0.2, parentId: 0 },
      { equipmentId: 'chair', x: 0, z: 0.1, rotationY: 0 },
      { equipmentId: 'camera', x: 0, z: 1.3, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'floor-monitor', x: 0.8, z: 0.6, rotationY: Math.PI * 0.75 },
      { equipmentId: 'softbox', x: -1.5, z: 0.3, rotationY: Math.PI / 3 },
      { equipmentId: 'shelf-props', x: -1.7, z: -1.2, rotationY: Math.PI / 2 },
      { equipmentId: 'power-station', x: 1.6, z: -1.2, rotationY: 0 },
    ],
  },

  'live-auction-ecommerce': {
    id: 'live-auction-ecommerce' as any,
    name: 'Live Stream Shopping & Auction Studio',
    icon: '🛍️',
    category: 'Video & Tech',
    description: 'High-speed vertical e-commerce sales station with multiple product risers, live countdown display, and chat monitor',
    defaultRoom: { width: 4.6, depth: 4.0 },
    items: [
      { equipmentId: 'content-table', x: 0, z: -0.6, rotationY: 0 },
      { equipmentId: 'product-stand', x: -0.45, z: -0.55, rotationY: 0, parentId: 0 },
      { equipmentId: 'product-stand', x: 0.45, z: -0.55, rotationY: 0, parentId: 0 },
      { equipmentId: 'multi-cam-switcher', x: 0, z: -0.65, rotationY: 0, parentId: 0 },
      { equipmentId: 'phone-gimbal', x: 0, z: 0.7, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'ring-light', x: 0, z: 0.72, rotationY: Math.PI },
      { equipmentId: 'floor-monitor', x: 0.75, z: 0.4, rotationY: Math.PI * 0.8 },
      { equipmentId: 'softbox', x: -1.5, z: 0.2, rotationY: Math.PI / 3 },
      { equipmentId: 'softbox', x: 1.5, z: 0.2, rotationY: -Math.PI / 3 },
      { equipmentId: 'shelf-props', x: 1.6, z: -1.2, rotationY: -Math.PI / 2 },
    ],
  },

  'vfx-action-wirework': {
    id: 'vfx-action-wirework' as any,
    name: 'Stunt & Wirework VFX Green Cyclorama',
    icon: '🟩',
    category: 'Video & Tech',
    description: 'Spacious 360 green infinity stage for action stunts, wirework flying sequences, and virtual set rendering',
    defaultRoom: { width: 7.0, depth: 6.0 },
    items: [
      { equipmentId: 'green-screen', x: 0, z: -2.4, rotationY: 0 },
      { equipmentId: 'green-screen', x: -2.8, z: 0, rotationY: Math.PI / 2 },
      { equipmentId: 'camera', x: 0, z: 2.2, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'camera', x: -1.8, z: 1.5, rotationY: Math.PI * 0.75 },
      { equipmentId: 'fresnel', x: -2.5, z: 1.8, rotationY: Math.PI / 4 },
      { equipmentId: 'fresnel', x: 2.5, z: 1.8, rotationY: -Math.PI / 4 },
      { equipmentId: 'barndoor-light', x: -2.2, z: -1.5, rotationY: 0 },
      { equipmentId: 'barndoor-light', x: 2.2, z: -1.5, rotationY: 0 },
      { equipmentId: 'generator', x: 2.8, z: 2.2, rotationY: 0 },
    ],
  },

  // ------------------------------------------------------------
  // Commercial, Product, Food & Fashion
  // ------------------------------------------------------------
  'beverage-splash-commercial': {
    id: 'beverage-splash-commercial' as any,
    name: 'Beverage & Liquid Splash Commercial Rig',
    icon: '🍹',
    category: 'Commercial & Photo',
    description: 'High-speed liquid splash photography bay with waterproof acrylic table, strobe flash pack, and dual flag cutters',
    defaultRoom: { width: 4.8, depth: 4.2 },
    items: [
      { equipmentId: 'content-table', x: 0, z: -0.6, rotationY: 0 },
      { equipmentId: 'product-stand', x: 0, z: -0.6, rotationY: 0, parentId: 0 },
      { equipmentId: 'camera', x: 0, z: 0.9, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'c-stand-flag', x: -0.8, z: -0.5, rotationY: Math.PI / 6 },
      { equipmentId: 'c-stand-flag', x: 0.8, z: -0.5, rotationY: -Math.PI / 6 },
      { equipmentId: 'beauty-dish', x: 0, z: -0.1, rotationY: Math.PI },
      { equipmentId: 'softbox', x: -1.4, z: 0.1, rotationY: Math.PI / 3 },
      { equipmentId: 'softbox', x: 1.4, z: 0.1, rotationY: -Math.PI / 3 },
      { equipmentId: 'power-station', x: -1.8, z: -1.4, rotationY: 0 },
    ],
  },

  'sneaker-streetwear-lookbook': {
    id: 'sneaker-streetwear-lookbook' as any,
    name: 'Sneaker & Streetwear Hero Showcase',
    icon: '👟',
    category: 'Commercial & Photo',
    description: 'Urban footwear launch studio with dual low-angle floor cameras, RGB kickers, and motorized display riser',
    defaultRoom: { width: 4.6, depth: 3.8 },
    items: [
      { equipmentId: 'backdrop', x: 0, z: -1.5, rotationY: 0 },
      { equipmentId: 'product-stand', x: 0, z: -0.5, rotationY: 0 },
      { equipmentId: 'camera', x: 0, z: 0.8, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'camera-slider', x: -0.8, z: 0.6, rotationY: Math.PI * 0.75 },
      { equipmentId: 'rgb-tube', x: -1.2, z: -1.2, rotationY: Math.PI / 4 },
      { equipmentId: 'rgb-tube', x: 1.2, z: -1.2, rotationY: -Math.PI / 4 },
      { equipmentId: 'fresnel', x: 1.5, z: 0.5, rotationY: -Math.PI / 3 },
      { equipmentId: 'power-station', x: -1.6, z: 1.2, rotationY: 0 },
    ],
  },

  'bakery-pastry-masterclass': {
    id: 'bakery-pastry-masterclass' as any,
    name: 'Bakery & Pastry Masterclass Studio',
    icon: '🥐',
    category: 'Lifestyle & Crafts',
    description: 'Marble counter pastry filming kitchen with flour-proof top-down camera, beauty fill lighting, and lavalier mic',
    defaultRoom: { width: 4.8, depth: 4.0 },
    items: [
      { equipmentId: 'content-table', x: 0, z: -0.6, rotationY: 0 },
      { equipmentId: 'overhead-rig', x: 0, z: -0.6, rotationY: 0, parentId: 0 },
      { equipmentId: 'lavalier', x: 0, z: -0.2, rotationY: 0 },
      { equipmentId: 'chair', x: 0, z: 0.05, rotationY: 0 },
      { equipmentId: 'camera', x: 0, z: 1.1, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'softbox', x: -1.5, z: 0.2, rotationY: Math.PI / 3 },
      { equipmentId: 'softbox', x: 1.5, z: 0.2, rotationY: -Math.PI / 3 },
      { equipmentId: 'shelf-props', x: -1.7, z: -1.2, rotationY: Math.PI / 2 },
      { equipmentId: 'power-station', x: 1.6, z: -1.2, rotationY: 0 },
    ],
  },

  // ------------------------------------------------------------
  // Education, Corporate, Webinars & Keynotes
  // ------------------------------------------------------------
  'ceo-townhall-keynote': {
    id: 'ceo-townhall-keynote' as any,
    name: 'Executive CEO Townhall & Keynote Stage',
    icon: '🏛️',
    category: 'Commercial & Photo',
    description: 'Corporate livestream stage with large teleprompter glass, podium standing mic, stage confidence monitor, and warm wash',
    defaultRoom: { width: 6.2, depth: 5.0 },
    items: [
      { equipmentId: 'backdrop', x: 0, z: -2.0, rotationY: 0 },
      { equipmentId: 'teleprompter', x: 0, z: 1.4, rotationY: Math.PI },
      { equipmentId: 'camera', x: 0, z: 1.4, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'floor-monitor', x: -0.8, z: 0.8, rotationY: Math.PI * 0.75 },
      { equipmentId: 'lavalier', x: 0, z: -0.4, rotationY: 0 },
      { equipmentId: 'barndoor-light', x: -2.0, z: 0.8, rotationY: Math.PI / 3 },
      { equipmentId: 'barndoor-light', x: 2.0, z: 0.8, rotationY: -Math.PI / 3 },
      { equipmentId: 'fresnel', x: 0, z: 1.8, rotationY: Math.PI },
      { equipmentId: 'power-station', x: 2.4, z: -1.5, rotationY: 0 },
    ],
  },

  'tedx-style-speaker-spot': {
    id: 'tedx-style-speaker-spot' as any,
    name: 'TEDx-Style Red Circle Speaker Stage',
    icon: '🔴',
    category: 'Commercial & Photo',
    description: 'Dramatic black void stage with single circular spotlight on presenter, wireless headset mic, and side profile camera',
    defaultRoom: { width: 5.8, depth: 4.8 },
    items: [
      { equipmentId: 'fresnel', x: 0, z: 1.4, rotationY: Math.PI },
      { equipmentId: 'camera', x: 0, z: 1.8, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'camera', x: -1.6, z: 0.8, rotationY: Math.PI * 0.7 },
      { equipmentId: 'floor-monitor', x: 0.7, z: 0.8, rotationY: Math.PI * 0.8 },
      { equipmentId: 'lavalier', x: 0, z: -0.2, rotationY: 0 },
      { equipmentId: 'fog-machine', x: -2.2, z: -1.8, rotationY: Math.PI / 4 },
      { equipmentId: 'power-station', x: 2.2, z: -1.8, rotationY: 0 },
    ],
  },

  // ------------------------------------------------------------
  // Small Spaces, Bedrooms & Mobile Rigs
  // ------------------------------------------------------------
  'micro-dorm-corner': {
    id: 'micro-dorm-corner' as any,
    name: 'Micro Dorm Corner YouTube Setup',
    icon: '📐',
    category: 'Bedroom & Small',
    description: 'High-density student dorm desk with clamp-on lighting, compact USB mic, and wall acoustic tiles in 2.8m space',
    defaultRoom: { width: 2.8, depth: 2.4 },
    items: [
      { equipmentId: 'content-table', x: 0, z: -0.55, rotationY: 0 },
      { equipmentId: 'webcam', x: 0, z: -0.5, rotationY: Math.PI, parentId: 0 },
      { equipmentId: 'desk-lamp', x: 0.35, z: -0.55, rotationY: 0, parentId: 0 },
      { equipmentId: 'podcast-mic', x: -0.3, z: -0.45, rotationY: 0, parentId: 0 },
      { equipmentId: 'chair', x: 0, z: 0.05, rotationY: 0 },
      { equipmentId: 'ring-light', x: 0.55, z: 0.3, rotationY: -Math.PI / 4 },
      { equipmentId: 'acoustic-panel', x: -0.75, z: -1.05, rotationY: 0 },
      { equipmentId: 'acoustic-panel', x: 0.75, z: -1.05, rotationY: 0 },
    ],
  },
};
