import type { CreatorTemplate, CreatorTemplateId } from './types';

// ============================================================
// 9 Realistic Creator Studio Templates
// Real-world equipment placement, accurate room dimensions,
// lighting key/fill angles, acoustic treatment, and tabletop stacking.
// Coordinates are relative to room center (0,0)
// ============================================================

export const CREATOR_TEMPLATES: Record<CreatorTemplateId, CreatorTemplate> = {
  'diy-bedroom-phone': {
    id: 'diy-bedroom-phone',
    name: 'DIY Phone Bedroom Rig ($0–$50)',
    icon: '📱',
    category: 'Budget & DIY',
    description: 'Realistic bedroom studio using your smartphone with rear mirror monitor, desk clamp light, wireless lapel mic, bed audio absorption, and window daylight',
    defaultRoom: { width: 3.4, depth: 3.0 },
    items: [
      // Double Bed (Acts as major acoustic absorption for room echo)
      { equipmentId: 'bed-furniture', x: -1.0, z: -0.5, rotationY: 0 },
      // Wardrobe / Closet
      { equipmentId: 'closet-wardrobe', x: 1.1, z: -0.9, rotationY: 0 },
      // 2: Small Work Desk
      { equipmentId: 'content-table', x: 0.2, z: 0.15, rotationY: 0 },
      // Smartphone Mount with Rear Mirror (mounted on desk)
      { equipmentId: 'phone-tripod-mirror', x: 0.2, z: -0.1, rotationY: 0, parentId: 2, isMainCamera: true, lensPreset: '24mm' },
      // Clamp DIY Lamp with Parchment Paper Diffuser (mounted on desk)
      { equipmentId: 'clamp-desk-lamp', x: 0.55, z: -0.05, rotationY: -Math.PI / 4, parentId: 2, lightSettings: { intensity: 80, colorTempKelvin: 4500, beamAngle: 80 } },
      // Wireless Lapel Mic
      { equipmentId: 'budget-wireless-lav', x: -0.05, z: 0.05, rotationY: 0, parentId: 2 },
      // Creator Desk Chair
      { equipmentId: 'chair', x: 0.2, z: -0.65, rotationY: 0 },
      // Power strip on floor
      { equipmentId: 'power-strip', x: 0.8, z: 0.7, rotationY: 0 },
    ],
  },

  'bedroom-studio': {
    id: 'bedroom-studio',
    name: 'Bedroom Creator Nook',
    icon: '🛏️',
    category: 'Bedroom & Small',
    description: 'Cozy bedroom YouTube & streaming setup with desk, monitors, mic, and warm lighting',
    defaultRoom: { width: 3.6, depth: 3.0 },
    items: [
      // 0: Main Wooden Content Desk
      { equipmentId: 'content-table', x: 0, z: -0.7, rotationY: 0 },
      // Table accessories mounted atop desk
      { equipmentId: 'desk-lamp', x: 0.35, z: -0.7, rotationY: 0, parentId: 0, lightSettings: { intensity: 75, colorTempKelvin: 3200, beamAngle: 80 } },
      { equipmentId: 'webcam', x: 0, z: -0.65, rotationY: Math.PI, parentId: 0, lensPreset: '24mm' },
      { equipmentId: 'podcast-mic', x: -0.35, z: -0.6, rotationY: 0, parentId: 0 },
      { equipmentId: 'studio-monitor', x: -0.52, z: -0.72, rotationY: 0.15, parentId: 0 },
      { equipmentId: 'studio-monitor', x: 0.52, z: -0.72, rotationY: -0.15, parentId: 0 },
      { equipmentId: 'power-strip', x: 0.42, z: -0.55, rotationY: 0, parentId: 0 },
      // Ergonomic Chair
      { equipmentId: 'chair', x: 0, z: -0.15, rotationY: 0 },
      // Room Lighting & Camera
      { equipmentId: 'ring-light', x: 0.65, z: 0.35, rotationY: -Math.PI / 4, lightSettings: { intensity: 80, colorTempKelvin: 5600, beamAngle: 75 } },
      { equipmentId: 'camera', x: 0, z: 0.85, rotationY: Math.PI, isMainCamera: true, lensPreset: '35mm' },
      // Acoustic wall treatment & background shelf
      { equipmentId: 'acoustic-panel', x: -0.85, z: -1.35, rotationY: 0 },
      { equipmentId: 'acoustic-panel', x: 0.85, z: -1.35, rotationY: 0 },
      { equipmentId: 'shelf-props', x: -1.35, z: -0.8, rotationY: Math.PI / 2 },
      // Backup Power
      { equipmentId: 'power-station', x: 1.25, z: -1.0, rotationY: 0 },
    ],
  },

  podcast: {
    id: 'podcast',
    name: 'Two-Person Podcast Lounge',
    icon: '🎙️',
    category: 'Audio & Music',
    description: 'Two-host broadcast podcast with modern sofa, dual dynamic mics, softbox lighting, and RGB rim',
    defaultRoom: { width: 5.2, depth: 4.2 },
    items: [
      // Backdrop
      { equipmentId: 'backdrop', x: 0, z: -1.75, rotationY: 0 },
      // Host & Guest Sofa
      { equipmentId: 'sofa', x: 0, z: -0.8, rotationY: 0 },
      // 2: Center Coffee / Equipment Table
      { equipmentId: 'content-table', x: 0, z: -0.05, rotationY: 0 },
      // Table gear
      { equipmentId: 'podcast-mic', x: -0.38, z: -0.05, rotationY: 0, parentId: 2 },
      { equipmentId: 'podcast-mic', x: 0.38, z: -0.05, rotationY: 0, parentId: 2 },
      { equipmentId: 'audio-recorder', x: 0, z: -0.05, rotationY: 0, parentId: 2 },
      // Key & Fill Softbox Lighting
      { equipmentId: 'softbox', x: -1.7, z: 0.45, rotationY: Math.PI / 3, lightSettings: { intensity: 85, colorTempKelvin: 5600, beamAngle: 60 } },
      { equipmentId: 'softbox', x: 1.7, z: 0.45, rotationY: -Math.PI / 3, lightSettings: { intensity: 50, colorTempKelvin: 4500, beamAngle: 80 } },
      // RGB Tube Rim Light for cinematic silhouette
      { equipmentId: 'rgb-tube', x: 1.45, z: -1.35, rotationY: -Math.PI / 2, lightSettings: { intensity: 65, colorHex: '#00D4FF', beamAngle: 120 } },
      // Acoustic Panels
      { equipmentId: 'acoustic-panel', x: -2.35, z: -0.8, rotationY: Math.PI / 2 },
      { equipmentId: 'acoustic-panel', x: 2.35, z: -0.8, rotationY: -Math.PI / 2 },
      // Master Camera with 16:9 view frustum
      { equipmentId: 'camera', x: 0, z: 1.5, rotationY: Math.PI, isMainCamera: true, lensPreset: '35mm' },
      // Backup Power
      { equipmentId: 'power-station', x: -2.0, z: -1.5, rotationY: 0 },
    ],
  },

  'product-photography': {
    id: 'product-photography',
    name: 'Commercial Product Studio',
    icon: '📸',
    category: 'Commercial & Photo',
    description: 'Clean product shoot studio with rotating turntable, dual softboxes, and overhead beauty dish',
    defaultRoom: { width: 4.2, depth: 3.6 },
    items: [
      { equipmentId: 'backdrop', x: 0, z: -1.3, rotationY: 0 },
      { equipmentId: 'product-stand', x: 0, z: -0.4, rotationY: 0 },
      { equipmentId: 'camera', x: 0, z: 1.1, rotationY: Math.PI, isMainCamera: true, lensPreset: '50mm' },
      { equipmentId: 'softbox', x: -1.3, z: 0.1, rotationY: Math.PI / 3, lightSettings: { intensity: 90, colorTempKelvin: 5600, beamAngle: 60 } },
      { equipmentId: 'softbox', x: 1.3, z: 0.1, rotationY: -Math.PI / 3, lightSettings: { intensity: 60, colorTempKelvin: 5600, beamAngle: 60 } },
      { equipmentId: 'beauty-dish', x: 0, z: 0.75, rotationY: Math.PI, lightSettings: { intensity: 85, colorTempKelvin: 5600, beamAngle: 45 } },
      // 6: Side Prep Table
      { equipmentId: 'content-table', x: 1.35, z: -0.85, rotationY: -Math.PI / 4 },
      { equipmentId: 'power-strip', x: 1.35, z: -0.85, rotationY: 0, parentId: 6 },
      { equipmentId: 'shelf-props', x: -1.55, z: -1.15, rotationY: Math.PI / 2 },
      { equipmentId: 'power-station', x: 1.35, z: 0.6, rotationY: 0 },
    ],
  },

  'tech-review': {
    id: 'tech-review',
    name: 'Tech & Unboxing Desk',
    icon: '💻',
    category: 'Video & Tech',
    description: 'Overhead camera slider setup with studio audio monitors, motorized display stand, and soft panels',
    defaultRoom: { width: 4.6, depth: 3.8 },
    items: [
      // 0: Content Desk
      { equipmentId: 'content-table', x: 0, z: -0.6, rotationY: 0 },
      { equipmentId: 'product-stand', x: 0, z: -0.55, rotationY: 0, parentId: 0 },
      { equipmentId: 'desk-lamp', x: 0.45, z: -0.65, rotationY: 0, parentId: 0, lightSettings: { intensity: 70, colorTempKelvin: 3200, beamAngle: 80 } },
      { equipmentId: 'studio-monitor', x: -0.55, z: -0.7, rotationY: 0.15, parentId: 0 },
      { equipmentId: 'studio-monitor', x: 0.55, z: -0.7, rotationY: -0.15, parentId: 0 },
      { equipmentId: 'power-strip', x: -0.45, z: -0.55, rotationY: 0, parentId: 0 },
      // Host Chair
      { equipmentId: 'chair', x: 0, z: -0.05, rotationY: 0 },
      // Cinematic Camera Slider
      { equipmentId: 'camera-slider', x: 0, z: 0.85, rotationY: 0 },
      { equipmentId: 'camera', x: 0, z: 0.85, rotationY: Math.PI, isMainCamera: true, lensPreset: '35mm' },
      // Soft Panel Key & Fill
      { equipmentId: 'led-light', x: -1.5, z: 0.2, rotationY: Math.PI / 3, lightSettings: { intensity: 85, colorTempKelvin: 5600, beamAngle: 70 } },
      { equipmentId: 'led-light', x: 1.5, z: 0.2, rotationY: -Math.PI / 3, lightSettings: { intensity: 50, colorTempKelvin: 4500, beamAngle: 80 } },
      // Acoustic wall panels and bookshelf
      { equipmentId: 'acoustic-panel', x: 0, z: -1.75, rotationY: 0 },
      { equipmentId: 'shelf-props', x: -1.7, z: -1.2, rotationY: Math.PI / 2 },
      { equipmentId: 'power-station', x: 1.6, z: -1.2, rotationY: 0 },
    ],
  },

  'streaming-battlestation': {
    id: 'streaming-battlestation',
    name: 'Streaming Battlestation',
    icon: '🎮',
    category: 'Video & Tech',
    description: 'Immersive gaming setup with dual RGB tube mood lighting, studio monitors, and boom condenser mic',
    defaultRoom: { width: 4.0, depth: 3.2 },
    items: [
      // 0: Battlestation Desk
      { equipmentId: 'content-table', x: 0, z: -0.7, rotationY: 0 },
      { equipmentId: 'webcam', x: 0, z: -0.7, rotationY: Math.PI, parentId: 0, lensPreset: '24mm' },
      { equipmentId: 'studio-monitor', x: -0.52, z: -0.75, rotationY: 0.2, parentId: 0 },
      { equipmentId: 'studio-monitor', x: 0.52, z: -0.75, rotationY: -0.2, parentId: 0 },
      { equipmentId: 'microphone', x: -0.3, z: -0.58, rotationY: 0, parentId: 0 },
      { equipmentId: 'desk-lamp', x: 0.45, z: -0.7, rotationY: 0, parentId: 0, lightSettings: { intensity: 65, colorTempKelvin: 3200, beamAngle: 80 } },
      { equipmentId: 'power-strip', x: 0.45, z: -0.55, rotationY: 0, parentId: 0 },
      // Ergonomic Gaming Chair
      { equipmentId: 'chair', x: 0, z: -0.15, rotationY: 0 },
      // Dual Neon RGB Tubes
      { equipmentId: 'rgb-tube', x: -1.3, z: -1.0, rotationY: Math.PI / 4, lightSettings: { intensity: 75, colorHex: '#9D00FF', beamAngle: 120 } },
      { equipmentId: 'rgb-tube', x: 1.3, z: -1.0, rotationY: -Math.PI / 4, lightSettings: { intensity: 75, colorHex: '#00E5FF', beamAngle: 120 } },
      // Key Ring Light & DSLR
      { equipmentId: 'ring-light', x: 0.55, z: 0.35, rotationY: -Math.PI / 4, lightSettings: { intensity: 80, colorTempKelvin: 5600, beamAngle: 75 } },
      { equipmentId: 'camera', x: 0, z: 0.8, rotationY: Math.PI, isMainCamera: true, lensPreset: '24mm' },
      { equipmentId: 'acoustic-panel', x: 0, z: -1.45, rotationY: 0 },
      { equipmentId: 'power-station', x: -1.4, z: 0.8, rotationY: 0 },
    ],
  },

  interview: {
    id: 'interview',
    name: 'Talking-Head & Interview',
    icon: '🗣️',
    category: 'Commercial & Photo',
    description: 'Two-person interview setup with 3-point lighting, teleprompter, and multi-cam angles',
    defaultRoom: { width: 5.5, depth: 4.5 },
    items: [
      { equipmentId: 'backdrop', x: 0, z: -1.8, rotationY: 0 },
      // Two Interview Chairs
      { equipmentId: 'chair', x: -0.75, z: 0.1, rotationY: Math.PI / 6 },
      { equipmentId: 'chair', x: 0.75, z: 0.1, rotationY: -Math.PI / 6 },
      // 3: Center Table
      { equipmentId: 'content-table', x: 0, z: 0.1, rotationY: 0 },
      { equipmentId: 'audio-recorder', x: 0, z: 0.1, rotationY: 0, parentId: 3 },
      { equipmentId: 'lavalier', x: -0.2, z: 0.1, rotationY: 0, parentId: 3 },
      { equipmentId: 'lavalier', x: 0.2, z: 0.1, rotationY: 0, parentId: 3 },
      // Master A-Cam with Teleprompter
      { equipmentId: 'teleprompter', x: 0, z: 1.8, rotationY: Math.PI },
      { equipmentId: 'camera', x: 0, z: 1.8, rotationY: Math.PI, isMainCamera: true, lensPreset: '50mm' },
      // Secondary B-Cam Angle
      { equipmentId: 'camera', x: -1.6, z: 1.3, rotationY: Math.PI * 0.75, lensPreset: '85mm' },
      // 3-Point Lighting (Fresnel key, Softbox fill, RGB hair light)
      { equipmentId: 'fresnel', x: -2.0, z: 0.3, rotationY: Math.PI / 3, lightSettings: { intensity: 90, colorTempKelvin: 5600, beamAngle: 35 } },
      { equipmentId: 'softbox', x: 2.0, z: 0.3, rotationY: -Math.PI / 3, lightSettings: { intensity: 50, colorTempKelvin: 4500, beamAngle: 75 } },
      { equipmentId: 'rgb-tube', x: 1.2, z: -1.4, rotationY: -Math.PI / 2, lightSettings: { intensity: 60, colorHex: '#FF9E00', beamAngle: 120 } },
      { equipmentId: 'generator', x: -2.2, z: -1.6, rotationY: 0 },
    ],
  },

  'fashion-lookbook': {
    id: 'fashion-lookbook',
    name: 'Fashion Runway & Lookbook',
    icon: '👗',
    category: 'Commercial & Photo',
    description: 'High-end fashion shoot with wide backdrop sweep, dual softboxes, and beauty dish',
    defaultRoom: { width: 5.6, depth: 5.0 },
    items: [
      { equipmentId: 'backdrop', x: 0, z: -2.0, rotationY: 0 },
      { equipmentId: 'camera', x: 0, z: 2.0, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'softbox', x: -1.8, z: 0.6, rotationY: Math.PI / 3 },
      { equipmentId: 'softbox', x: 1.8, z: 0.6, rotationY: -Math.PI / 3 },
      { equipmentId: 'beauty-dish', x: 0, z: -0.4, rotationY: Math.PI },
      { equipmentId: 'led-light', x: -2.2, z: -0.8, rotationY: Math.PI / 2 },
      { equipmentId: 'led-light', x: 2.2, z: -0.8, rotationY: -Math.PI / 2 },
      { equipmentId: 'shelf-props', x: -2.2, z: -2.0, rotationY: 0 },
      { equipmentId: 'content-table', x: 2.1, z: -1.8, rotationY: -Math.PI / 6 },
      { equipmentId: 'chair', x: -1.2, z: 1.5, rotationY: Math.PI / 4 },
      { equipmentId: 'generator', x: -2.2, z: 1.5, rotationY: 0 },
    ],
  },

  'green-screen-vfx': {
    id: 'green-screen-vfx',
    name: 'Chroma Green VFX Studio',
    icon: '🟩',
    category: 'Commercial & Photo',
    description: 'Evenly lit green screen studio with dual softboxes, key light, and audio boom',
    defaultRoom: { width: 4.6, depth: 4.0 },
    items: [
      { equipmentId: 'green-screen', x: 0, z: -1.5, rotationY: 0 },
      // Dual Softboxes for even green screen illumination (no hotspots/shadows)
      { equipmentId: 'softbox', x: -1.6, z: -0.7, rotationY: Math.PI / 4 },
      { equipmentId: 'softbox', x: 1.6, z: -0.7, rotationY: -Math.PI / 4 },
      // Key presenter light
      { equipmentId: 'led-light', x: 1.2, z: 0.5, rotationY: -Math.PI / 3 },
      { equipmentId: 'camera', x: 0, z: 1.4, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'microphone', x: -1.2, z: 0.2, rotationY: 0 },
      { equipmentId: 'power-station', x: -1.6, z: -1.4, rotationY: 0 },
    ],
  },

  'home-studio': {
    id: 'home-studio',
    name: 'Compact Home Studio',
    icon: '🏠',
    category: 'Bedroom & Small',
    description: 'Space-efficient studio for small apartments and dorms with desk and backup generator',
    defaultRoom: { width: 3.2, depth: 2.6 },
    items: [
      // 0: Compact Desk
      { equipmentId: 'content-table', x: 0, z: -0.65, rotationY: 0 },
      { equipmentId: 'webcam', x: 0, z: -0.65, rotationY: Math.PI, parentId: 0 },
      { equipmentId: 'podcast-mic', x: -0.35, z: -0.6, rotationY: 0, parentId: 0 },
      { equipmentId: 'desk-lamp', x: 0.35, z: -0.65, rotationY: 0, parentId: 0 },
      { equipmentId: 'chair', x: 0, z: -0.1, rotationY: 0 },
      { equipmentId: 'led-light', x: -0.9, z: 0.3, rotationY: Math.PI / 3 },
      { equipmentId: 'camera', x: 0, z: 0.8, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'shelf-props', x: -1.1, z: -0.8, rotationY: Math.PI / 2 },
      { equipmentId: 'generator', x: 1.1, z: -0.9, rotationY: 0 },
    ],
  },

  'culinary-kitchen': {
    id: 'culinary-kitchen',
    name: 'Culinary & Cooking Show',
    icon: '🍳',
    category: 'Lifestyle & Crafts',
    description: 'Central cooking prep island with overhead top-down camera rig, dual softboxes, and lavaliers',
    defaultRoom: { width: 5.4, depth: 4.4 },
    items: [
      { equipmentId: 'backdrop', x: 0, z: -1.8, rotationY: 0 },
      // 1: Center Prep Island
      { equipmentId: 'content-table', x: 0, z: -0.4, rotationY: 0 },
      { equipmentId: 'product-stand', x: 0, z: -0.4, rotationY: 0, parentId: 1 },
      // Overhead Rig pointing directly down at the prep surface
      { equipmentId: 'overhead-rig', x: -0.3, z: -0.4, rotationY: 0 },
      // Front Master Eye-Level Camera
      { equipmentId: 'camera', x: 0, z: 1.5, rotationY: Math.PI, isMainCamera: true },
      // Floor confidence monitor for chef preview
      { equipmentId: 'floor-monitor', x: 0.85, z: 1.1, rotationY: Math.PI * 0.85 },
      // Dual Softbox Lighting
      { equipmentId: 'softbox', x: -1.8, z: 0.4, rotationY: Math.PI / 3 },
      { equipmentId: 'softbox', x: 1.8, z: 0.4, rotationY: -Math.PI / 3 },
      // Side pantry shelf & power
      { equipmentId: 'shelf-props', x: -2.1, z: -1.4, rotationY: Math.PI / 2 },
      { equipmentId: 'power-station', x: 2.0, z: -1.4, rotationY: 0 },
    ],
  },

  'music-vocal-booth': {
    id: 'music-vocal-booth',
    name: 'Music & Vocal Studio',
    icon: '🎵',
    category: 'Audio & Music',
    description: 'Pro music workstation with MIDI synth keyboard, acoustic vocal shield, and studio monitors',
    defaultRoom: { width: 4.8, depth: 4.0 },
    items: [
      // 0: Producer Workstation Desk
      { equipmentId: 'content-table', x: 0, z: -0.9, rotationY: 0 },
      { equipmentId: 'studio-monitor', x: -0.52, z: -0.92, rotationY: 0.15, parentId: 0 },
      { equipmentId: 'studio-monitor', x: 0.52, z: -0.92, rotationY: -0.15, parentId: 0 },
      { equipmentId: 'audio-recorder', x: 0, z: -0.85, rotationY: 0, parentId: 0 },
      { equipmentId: 'desk-lamp', x: 0.38, z: -0.9, rotationY: 0, parentId: 0 },
      // Producer Chair
      { equipmentId: 'chair', x: 0, z: -0.35, rotationY: 0 },
      // Side 61-Key Synthesizer Keyboard on stand
      { equipmentId: 'keyboard-synth', x: 1.45, z: -0.6, rotationY: -Math.PI / 2 },
      // Vocal Reflection Shield in recording corner
      { equipmentId: 'vocal-booth-screen', x: -1.4, z: 0.5, rotationY: Math.PI * 0.75 },
      // Wall acoustic panels
      { equipmentId: 'acoustic-panel', x: -1.2, z: -1.85, rotationY: 0 },
      { equipmentId: 'acoustic-panel', x: 1.2, z: -1.85, rotationY: 0 },
      { equipmentId: 'acoustic-panel', x: -2.25, z: 0.2, rotationY: Math.PI / 2 },
      // Camera & mood lights
      { equipmentId: 'camera', x: 0, z: 1.2, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'rgb-tube', x: -1.6, z: -1.4, rotationY: Math.PI / 4 },
      { equipmentId: 'power-station', x: 1.8, z: 1.2, rotationY: 0 },
    ],
  },

  'fitness-dance': {
    id: 'fitness-dance',
    name: 'Fitness, Yoga & Dance',
    icon: '🧘',
    category: 'Lifestyle & Crafts',
    description: 'Spacious workout space with stage floor monitor, wide-angle camera, and wash softboxes',
    defaultRoom: { width: 6.0, depth: 4.8 },
    items: [
      { equipmentId: 'backdrop', x: 0, z: -2.0, rotationY: 0 },
      // Stage Floor confidence monitor angled up at instructor
      { equipmentId: 'floor-monitor', x: 0.9, z: 1.5, rotationY: Math.PI * 0.85 },
      // Master Camera (Wide Angle)
      { equipmentId: 'camera', x: 0, z: 1.9, rotationY: Math.PI, isMainCamera: true },
      // Dual Softbox Wash Lights
      { equipmentId: 'softbox', x: -2.1, z: 0.5, rotationY: Math.PI / 3 },
      { equipmentId: 'softbox', x: 2.1, z: 0.5, rotationY: -Math.PI / 3 },
      // Overhead beauty dish for head-to-toe definition
      { equipmentId: 'beauty-dish', x: 0, z: -0.6, rotationY: Math.PI },
      // Side water & props table
      { equipmentId: 'content-table', x: 2.2, z: -1.4, rotationY: -Math.PI / 6 },
      { equipmentId: 'generator', x: -2.3, z: 1.6, rotationY: 0 },
    ],
  },

  'craft-flatlay': {
    id: 'craft-flatlay',
    name: 'Art, Craft & Flatlay DIY',
    icon: '🎨',
    category: 'Lifestyle & Crafts',
    description: 'Top-down DIY crafting studio with overhead boom camera rig, cutting desk, and soft lighting',
    defaultRoom: { width: 4.2, depth: 3.6 },
    items: [
      // 0: Main Workstation Crafting Desk
      { equipmentId: 'content-table', x: 0, z: -0.5, rotationY: 0 },
      { equipmentId: 'desk-lamp', x: 0.42, z: -0.55, rotationY: 0, parentId: 0 },
      // Overhead Boom Rig centered directly over the desk
      { equipmentId: 'overhead-rig', x: -0.25, z: -0.5, rotationY: 0 },
      // Front Camera for talking head intros
      { equipmentId: 'camera', x: 0, z: 1.1, rotationY: Math.PI, isMainCamera: true },
      // Host Stool / Chair
      { equipmentId: 'chair', x: 0, z: 0.05, rotationY: 0 },
      // Dual Softbox side lights for shadowless craft lighting
      { equipmentId: 'softbox', x: -1.4, z: 0.2, rotationY: Math.PI / 3 },
      { equipmentId: 'softbox', x: 1.4, z: 0.2, rotationY: -Math.PI / 3 },
      // Props shelf for art supplies
      { equipmentId: 'shelf-props', x: -1.5, z: -1.1, rotationY: Math.PI / 2 },
      { equipmentId: 'power-station', x: 1.4, z: -1.1, rotationY: 0 },
    ],
  },

  'asmr-sound': {
    id: 'asmr-sound',
    name: 'ASMR & Binaural Audio',
    icon: '🎧',
    category: 'Audio & Music',
    description: 'Intimate audio sanctuary featuring 3DIO binaural ear microphone, warm lighting, and acoustic foam',
    defaultRoom: { width: 3.8, depth: 3.2 },
    items: [
      // 0: ASMR Center Presentation Table
      { equipmentId: 'content-table', x: 0, z: -0.4, rotationY: 0 },
      // 3DIO Binaural Silicone Ear Mic in center of table
      { equipmentId: 'binaural-mic', x: 0, z: -0.38, rotationY: 0, parentId: 0 },
      { equipmentId: 'desk-lamp', x: -0.42, z: -0.45, rotationY: 0, parentId: 0 },
      { equipmentId: 'desk-lamp', x: 0.42, z: -0.45, rotationY: 0, parentId: 0 },
      // Cozy Chair / Loveseat
      { equipmentId: 'chair', x: 0, z: 0.1, rotationY: 0 },
      // Soft Front Macro Camera
      { equipmentId: 'camera', x: 0, z: 0.9, rotationY: Math.PI, isMainCamera: true },
      // Dual RGB Ambient Glow Tubes behind host
      { equipmentId: 'rgb-tube', x: -1.2, z: -1.0, rotationY: Math.PI / 4 },
      { equipmentId: 'rgb-tube', x: 1.2, z: -1.0, rotationY: -Math.PI / 4 },
      // Acoustic wall treatment
      { equipmentId: 'acoustic-panel', x: -0.7, z: -1.45, rotationY: 0 },
      { equipmentId: 'acoustic-panel', x: 0.7, z: -1.45, rotationY: 0 },
      { equipmentId: 'power-station', x: -1.3, z: 0.7, rotationY: 0 },
    ],
  },

  'executive-webinar': {
    id: 'executive-webinar',
    name: 'Executive Keynote & Webinar',
    icon: '💼',
    category: 'Video & Tech',
    description: 'High-trust executive broadcast with dual barndoor studio panels, teleprompter, and podcast mic',
    defaultRoom: { width: 5.0, depth: 4.0 },
    items: [
      // 0: Executive Desk
      { equipmentId: 'content-table', x: 0, z: -0.7, rotationY: 0 },
      { equipmentId: 'podcast-mic', x: -0.38, z: -0.65, rotationY: 0, parentId: 0 },
      { equipmentId: 'desk-lamp', x: 0.42, z: -0.72, rotationY: 0, parentId: 0 },
      // Executive Leather Chair
      { equipmentId: 'chair', x: 0, z: -0.15, rotationY: 0 },
      // Master Camera with Beam-Splitter Teleprompter
      { equipmentId: 'teleprompter', x: 0, z: 1.3, rotationY: Math.PI },
      { equipmentId: 'camera', x: 0, z: 1.3, rotationY: Math.PI, isMainCamera: true },
      // Dual Barndoor Studio Spotlights for crisp executive lighting
      { equipmentId: 'barndoor-light', x: -1.6, z: 0.4, rotationY: Math.PI / 3 },
      { equipmentId: 'barndoor-light', x: 1.6, z: 0.4, rotationY: -Math.PI / 3 },
      // Background Bookcase Shelf & Acoustic Panels
      { equipmentId: 'shelf-props', x: -1.8, z: -1.4, rotationY: Math.PI / 2 },
      { equipmentId: 'acoustic-panel', x: 0.6, z: -1.85, rotationY: 0 },
      { equipmentId: 'power-station', x: 1.7, z: -1.3, rotationY: 0 },
    ],
  },

  'live-dj-booth': {
    id: 'live-dj-booth',
    name: 'Live DJ Stream & Club Set',
    icon: '🎛️',
    category: 'Audio & Music',
    description: 'High-energy DJ broadcast with 4-channel controller, studio monitors, RGB mood tubes, and stage fogger',
    defaultRoom: { width: 4.8, depth: 3.8 },
    items: [
      // 0: DJ Stand Table
      { equipmentId: 'content-table', x: 0, z: -0.6, rotationY: 0 },
      { equipmentId: 'dj-deck', x: 0, z: -0.58, rotationY: 0, parentId: 0 },
      { equipmentId: 'studio-monitor', x: -0.58, z: -0.65, rotationY: 0.2, parentId: 0 },
      { equipmentId: 'studio-monitor', x: 0.58, z: -0.65, rotationY: -0.2, parentId: 0 },
      // DJ Standing in front / behind deck
      { equipmentId: 'shotgun-mic', x: -0.85, z: -0.4, rotationY: Math.PI / 4 },
      // Front Camera Wide
      { equipmentId: 'camera', x: 0, z: 1.3, rotationY: Math.PI, isMainCamera: true },
      // Stage Atmospheric Fog Haze Machine
      { equipmentId: 'fog-machine', x: -1.6, z: -1.2, rotationY: Math.PI / 4 },
      // Dual RGB Neon Tubes behind DJ
      { equipmentId: 'rgb-tube', x: -1.4, z: -1.4, rotationY: Math.PI / 4 },
      { equipmentId: 'rgb-tube', x: 1.4, z: -1.4, rotationY: -Math.PI / 4 },
      // Acoustic wall baffles
      { equipmentId: 'acoustic-panel', x: -1.0, z: -1.8, rotationY: 0 },
      { equipmentId: 'acoustic-panel', x: 1.0, z: -1.8, rotationY: 0 },
      { equipmentId: 'power-station', x: 1.8, z: -0.8, rotationY: 0 },
    ],
  },

  'makeup-beauty-vanity': {
    id: 'makeup-beauty-vanity',
    name: 'Beauty, Glam & Makeup Vanity',
    icon: '💄',
    category: 'Lifestyle & Crafts',
    description: 'Glamour studio with Hollywood lighted vanity mirror, beauty dish overhead, and dual product risers',
    defaultRoom: { width: 4.2, depth: 3.6 },
    items: [
      // 0: Glam Vanity Table
      { equipmentId: 'content-table', x: 0, z: -0.65, rotationY: 0 },
      { equipmentId: 'beauty-mirror', x: 0, z: -0.82, rotationY: 0, parentId: 0 },
      { equipmentId: 'product-stand', x: -0.48, z: -0.58, rotationY: 0, parentId: 0 },
      { equipmentId: 'product-stand', x: 0.48, z: -0.58, rotationY: 0, parentId: 0 },
      // Vanity Plush Chair
      { equipmentId: 'chair', x: 0, z: -0.1, rotationY: 0 },
      // Front Beauty Camera with Ring Light
      { equipmentId: 'camera', x: 0, z: 0.95, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'ring-light', x: 0, z: 0.95, rotationY: Math.PI },
      // Overhead Beauty Dish for soft hair and cheekbone highlight
      { equipmentId: 'beauty-dish', x: 0, z: -0.2, rotationY: Math.PI },
      // Side Softbox for soft ambient wrap
      { equipmentId: 'softbox', x: -1.4, z: 0.2, rotationY: Math.PI / 3 },
      { equipmentId: 'shelf-props', x: 1.5, z: -0.9, rotationY: -Math.PI / 2 },
      { equipmentId: 'power-station', x: -1.5, z: -1.2, rotationY: 0 },
    ],
  },

  'unboxing-3cam': {
    id: 'unboxing-3cam',
    name: '3-Camera Pro Unboxing Suite',
    icon: '📦',
    category: 'Video & Tech',
    description: 'Multi-angle studio with front talking camera, 45° detail cam, top-down boom, and live video switcher',
    defaultRoom: { width: 4.8, depth: 4.0 },
    items: [
      // 0: Unboxing Presentation Desk
      { equipmentId: 'content-table', x: 0, z: -0.5, rotationY: 0 },
      { equipmentId: 'multi-cam-switcher', x: 0.42, z: -0.45, rotationY: -0.2, parentId: 0 },
      { equipmentId: 'podcast-mic', x: -0.38, z: -0.42, rotationY: 0.2, parentId: 0 },
      { equipmentId: 'audio-recorder', x: 0.42, z: -0.62, rotationY: 0, parentId: 0 },
      // Host Ergonomic Chair
      { equipmentId: 'chair', x: 0, z: 0.05, rotationY: 0 },
      // Camera 1: Master Front Talking Head
      { equipmentId: 'camera', x: 0, z: 1.25, rotationY: Math.PI, isMainCamera: true },
      // Camera 2: Left 45-Degree Macro Product Detail
      { equipmentId: 'camera', x: -1.1, z: 0.45, rotationY: Math.PI * 0.75 },
      // Camera 3: Top-Down Articulating Overhead Boom Rig
      { equipmentId: 'overhead-rig', x: 0.35, z: -0.5, rotationY: -Math.PI / 2 },
      // Dual Softboxes & Light Flag Cutter
      { equipmentId: 'softbox', x: -1.6, z: 0.3, rotationY: Math.PI / 3 },
      { equipmentId: 'softbox', x: 1.6, z: 0.3, rotationY: -Math.PI / 3 },
      { equipmentId: 'c-stand-flag', x: -1.4, z: -0.6, rotationY: Math.PI / 4 },
      // Power & Shelf
      { equipmentId: 'shelf-props', x: -1.7, z: -1.3, rotationY: Math.PI / 2 },
      { equipmentId: 'power-station', x: 1.6, z: -1.3, rotationY: 0 },
    ],
  },

  'voiceover-booth': {
    id: 'voiceover-booth',
    name: 'Isolation Voiceover & Audiobook',
    icon: '🎙️',
    category: 'Audio & Music',
    description: 'Tightly dampened acoustic booth with reflection shield, broadcast shotgun mic, and floor monitor',
    defaultRoom: { width: 3.4, depth: 2.8 },
    items: [
      // 0: Script Stand Table
      { equipmentId: 'content-table', x: 0, z: -0.3, rotationY: 0 },
      { equipmentId: 'audio-recorder', x: 0.35, z: -0.3, rotationY: 0, parentId: 0 },
      { equipmentId: 'desk-lamp', x: -0.35, z: -0.35, rotationY: 0, parentId: 0 },
      // Voice Actor Stool
      { equipmentId: 'chair', x: 0, z: 0.25, rotationY: 0 },
      // Heavy Vocal Reflection Shield with Mic
      { equipmentId: 'vocal-booth-screen', x: 0, z: -0.05, rotationY: 0 },
      // Floor preview script monitor
      { equipmentId: 'floor-monitor', x: 0.65, z: 0.45, rotationY: Math.PI * 0.8 },
      // 360 Acoustic Foam Wall Coverage
      { equipmentId: 'acoustic-panel', x: -0.75, z: -1.25, rotationY: 0 },
      { equipmentId: 'acoustic-panel', x: 0.75, z: -1.25, rotationY: 0 },
      { equipmentId: 'acoustic-panel', x: -1.55, z: 0, rotationY: Math.PI / 2 },
      { equipmentId: 'acoustic-panel', x: 1.55, z: 0, rotationY: -Math.PI / 2 },
      { equipmentId: 'power-station', x: -1.1, z: 0.8, rotationY: 0 },
    ],
  },

  'mobile-vlog-station': {
    id: 'mobile-vlog-station',
    name: 'Mobile Smartphone & Gimbal Station',
    icon: '📱',
    category: 'Video & Tech',
    description: 'Fast-turnaround vertical TikTok & Reels creator hub with phone gimbal, wireless audio, and ring light',
    defaultRoom: { width: 3.8, depth: 3.2 },
    items: [
      { equipmentId: 'backdrop', x: 0, z: -1.3, rotationY: 0 },
      // 0: Props & Phone Charging Table
      { equipmentId: 'content-table', x: -1.1, z: -0.4, rotationY: Math.PI / 2 },
      { equipmentId: 'power-station', x: -1.1, z: -0.5, rotationY: 0, parentId: 0 },
      // Center Standing Host Zone
      { equipmentId: 'phone-gimbal', x: 0, z: 0.8, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'ring-light', x: 0, z: 0.82, rotationY: Math.PI },
      // Dual wireless lavaliers and sound recorder
      { equipmentId: 'lavalier', x: 0, z: 0, rotationY: 0 },
      // RGB mood tube in corner
      { equipmentId: 'rgb-tube', x: 1.3, z: -1.0, rotationY: -Math.PI / 4 },
      { equipmentId: 'generator', x: 1.3, z: 0.9, rotationY: 0 },
    ],
  },

  'gaming-dual-host': {
    id: 'gaming-dual-host',
    name: 'Esports & Co-Op Stream Lounge',
    icon: '🎮',
    category: 'Video & Tech',
    description: 'Dual-seat gaming station with side-by-side chairs, studio monitors, dynamic mics, and barndoor wash',
    defaultRoom: { width: 5.2, depth: 4.2 },
    items: [
      // 0: Wide Co-Op Gaming Desk
      { equipmentId: 'content-table', x: 0, z: -0.7, rotationY: 0 },
      { equipmentId: 'podcast-mic', x: -0.45, z: -0.6, rotationY: 0, parentId: 0 },
      { equipmentId: 'podcast-mic', x: 0.45, z: -0.6, rotationY: 0, parentId: 0 },
      { equipmentId: 'studio-monitor', x: -0.85, z: -0.72, rotationY: 0.15, parentId: 0 },
      { equipmentId: 'studio-monitor', x: 0.85, z: -0.72, rotationY: -0.15, parentId: 0 },
      // Dual Streamer Gaming Chairs
      { equipmentId: 'chair', x: -0.42, z: -0.1, rotationY: 0 },
      { equipmentId: 'chair', x: 0.42, z: -0.1, rotationY: 0 },
      // Master Center Camera
      { equipmentId: 'camera', x: 0, z: 1.25, rotationY: Math.PI, isMainCamera: true },
      // Dual Barndoor Side Lights
      { equipmentId: 'barndoor-light', x: -1.8, z: 0.3, rotationY: Math.PI / 3 },
      { equipmentId: 'barndoor-light', x: 1.8, z: 0.3, rotationY: -Math.PI / 3 },
      // Dual RGB Neon Tubes on Back Wall
      { equipmentId: 'rgb-tube', x: -1.2, z: -1.6, rotationY: 0 },
      { equipmentId: 'rgb-tube', x: 1.2, z: -1.6, rotationY: 0 },
      { equipmentId: 'acoustic-panel', x: 0, z: -1.95, rotationY: 0 },
      { equipmentId: 'power-station', x: -1.9, z: -1.2, rotationY: 0 },
    ],
  },
};

import { ALL_STUDIO_SCENARIOS } from './scenarios-library';

export const COMPREHENSIVE_TEMPLATES: Record<string, CreatorTemplate> = {
  ...CREATOR_TEMPLATES,
  ...ALL_STUDIO_SCENARIOS,
};

export const COMPREHENSIVE_TEMPLATE_IDS: string[] = Object.keys(COMPREHENSIVE_TEMPLATES);

export const TEMPLATE_IDS: CreatorTemplateId[] = COMPREHENSIVE_TEMPLATE_IDS as any;


