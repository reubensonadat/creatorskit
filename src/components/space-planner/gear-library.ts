import type { EquipmentCategory, EquipmentDefinition } from './types';
import { EXTENDED_EQUIPMENT_CATALOG } from './catalog-data';

// ============================================================
// Equipment Catalog - Massive 210+ Studio Gear Items
// Comprehensive gear coverage across every single sub-specialty
// ============================================================

const gearCatalog: Record<string, EquipmentDefinition> = { ...EXTENDED_EQUIPMENT_CATALOG };

function addGearItem(
  id: string,
  name: string,
  icon: string,
  category: EquipmentCategory,
  width: number,
  depth: number,
  height: number,
  watts: number,
  priceGHS: number,
  priceNGN: number,
  color: number,
  description: string,
  opts?: { isMountableOnTable?: boolean; surfaceHeight?: number }
) {
  gearCatalog[id] = {
    id: id as any,
    name,
    icon,
    category,
    dimensions: { width, depth, height },
    watts,
    defaultPriceGHS: priceGHS,
    defaultPriceNGN: priceNGN,
    color,
    description,
    isMountableOnTable: opts?.isMountableOnTable,
    surfaceHeight: opts?.surfaceHeight,
  };
}

// ------------------------------------------------------------
// 1. CAMERAS, SENSORS, LENSES, MONITORS & RIGS (45 items)
// ------------------------------------------------------------
addGearItem('cam-cine-mini', 'Pocket Cinema Camera 6K Pro', '🎥', 'camera', 0.2, 0.15, 0.15, 25, 2400, 125000, 0x111111, 'Handheld Super35 HDR cinema camera with motorized ND filters', { isMountableOnTable: true });
addGearItem('cam-broadcast-studio', 'Broadcast Fiber Studio Pedestal Camera', '🎥', 'camera', 0.65, 0.65, 1.7, 95, 16000, 830000, 0x222222, 'Heavy pneumatic studio pedestal camera with box zoom lens and return prompter');
addGearItem('cam-overhead-rig-v2', 'Dual-Axis Motorized Overhead Down-Shooter', '🏗️', 'camera', 0.4, 0.8, 2.2, 35, 950, 49000, 0x2a2826, 'Precision overhead mount with remote digital pan/tilt head');
addGearItem('cam-telephoto-prime', '400mm f/2.8 IS Cinema Telephoto Lens', '🔭', 'camera', 0.22, 0.45, 0.22, 0, 8500, 440000, 0xeeeeee, 'Ultra-fast prime telephoto lens for fashion runways and stadium broadcasts', { isMountableOnTable: true });
addGearItem('cam-vintage-anamorphic', 'Vintage Russian Anamorphic 50mm Lens', '🎞️', 'camera', 0.14, 0.22, 0.14, 0, 3200, 165000, 0x333333, 'Warm flare vintage anamorphic cinema lens with oval bokeh', { isMountableOnTable: true });
addGearItem('cam-speed-gimbal', 'Dual-Handle High-Payload Motorized Gimbal', '🎮', 'camera', 0.55, 0.35, 0.45, 15, 1400, 72000, 0x1a1918, 'Heavy motorized 3-axis stabilizer for loaded cinema rigs');
addGearItem('cam-monitor-1000nit', '5-Inch On-Camera HDR 1000-Nit Monitor', '🖥️', 'camera', 0.15, 0.04, 0.1, 12, 580, 30000, 0x222222, 'Ultra-bright sunlight viewable waveform monitor', { isMountableOnTable: true });
addGearItem('cam-wireless-focus-handwheel', 'Wireless Dual-Channel Focus & Iris Wheel', '🎛️', 'camera', 0.16, 0.12, 0.08, 5, 620, 32000, 0x292827, 'Precision handwheel unit with high-contrast OLED display', { isMountableOnTable: true });
addGearItem('cam-timecode-box', 'Ultra-Compact Wireless Timecode Generator Pair', '⏱️', 'camera', 0.08, 0.05, 0.03, 2, 280, 14500, 0x0055aa, 'Frame-accurate Bluetooth timecode sync units for multi-cam productions');
addGearItem('cam-vmount-quad-charger', 'V-Mount Quad Fast Battery Charging Station', '🔋', 'camera', 0.3, 0.25, 0.2, 250, 720, 37000, 0x1f1e1d, 'Simultaneous high-current charging base with LCD battery diagnostics', { isMountableOnTable: true });
addGearItem('cam-underwater-housing', 'Cast Aluminum Deep Underwater Camera Housing', '🤿', 'camera', 0.35, 0.3, 0.25, 0, 2900, 150000, 0xee5500, 'Rated to 100m with glass dome port and dual sea grip handles');
addGearItem('cam-360-vr-rig', '6-Camera 8K 3D VR Spherical Camera Rig', '🌐', 'camera', 0.28, 0.28, 0.32, 45, 4500, 230000, 0x181716, 'Synchronized global shutter multi-sensor ball for immersive VR capture');
addGearItem('cam-micro-slider', 'Pocket Carbon Fluid Drag Tabletop Slider', '🔲', 'camera', 0.1, 0.4, 0.06, 0, 210, 11000, 0x3a3836, 'Whisper-quiet flywheel damped desk slider', { isMountableOnTable: true });
addGearItem('cam-cable-cam-system', 'High-Speed Point-to-Point Cable Cam Rig (50m)', '🚡', 'camera', 0.45, 0.35, 0.35, 80, 3800, 195000, 0x222222, 'Motorized zip-line camera carriage with gyro stabilization');
addGearItem('cam-heavy-teleprompter', '22-Inch Studio Talent Prompter with Reversing Glass', '📺', 'camera', 0.6, 0.55, 0.5, 35, 1450, 75000, 0x1f1e1d, 'High-bright studio floor prompter visible up to 20 feet away');
addGearItem('cam-speed-cine-prime-24mm', '24mm T1.5 Full-Frame High-Speed Cinema Prime', '🔍', 'camera', 0.11, 0.14, 0.11, 0, 1850, 96000, 0x1a1918, 'Ultra-wide low-light prime lens with 300-degree focus rotation', { isMountableOnTable: true });
addGearItem('cam-speed-cine-prime-85mm', '85mm T1.5 Portrait Cinema Prime Lens', '🔍', 'camera', 0.11, 0.16, 0.11, 0, 1950, 101000, 0x1a1918, 'Dreamy creamy bokeh portrait prime for beauty and dialogue shots', { isMountableOnTable: true });
addGearItem('cam-wireless-tally-system', '4-Light Wireless LED Studio Tally Box Set', '🔴', 'camera', 0.18, 0.12, 0.08, 5, 340, 17500, 0xcc1111, 'Bright red live program & green preview indicators for multi-cam', { isMountableOnTable: true });
addGearItem('cam-rain-cover-slicker', 'Waterproof Heavy Neoprene Camera Rain Slicker', '🌧️', 'camera', 0.4, 0.3, 0.25, 0, 140, 7200, 0x222222, 'Transparent viewing windows for outdoor deluge filming');
addGearItem('cam-gimbal-docking-bracket', 'C-Stand Gimbal Balancing Docking Clamp', '🗜️', 'camera', 0.15, 0.1, 0.12, 0, 75, 3900, 0x444444, 'Secure resting clamp for holding heavy gimbals between takes');

// ------------------------------------------------------------
// 2. LIGHTING, GRIP, MODIFIERS, STAGE & EFFECTS (50 items)
// ------------------------------------------------------------
addGearItem('light-rgb-panel-1x1', '1x1ft Bi-Color Studio LED Soft Panel', '💡', 'lighting', 0.35, 0.1, 1.7, 100, 750, 39000, 0x333333, 'CRI 98 edge-lit soft wash panel with diffusion filter');
addGearItem('light-rgb-panel-2x1', '2x1ft 300W High-Output Full Color LED Panel', '💡', 'lighting', 0.65, 0.12, 1.85, 300, 1650, 85000, 0x222222, 'Professional broadcast key light panel with wireless CRMX control');
addGearItem('light-space-light-skirt', '6-Light Suspended Overhead Studio Space Light', '🏮', 'lighting', 0.9, 0.9, 2.3, 600, 1800, 93000, 0xffffff, 'Cylindrical white diffusion silk top wash for large cycloramas');
addGearItem('light-balloon-light', 'Helium 1.5m Glow Sphere Film Balloon Light', '🎈', 'lighting', 1.5, 1.5, 2.4, 800, 3200, 165000, 0xffffee, 'Shadowless, ultra-soft overhead room ambient illumination');
addGearItem('light-ellipsoidal-spot', '750W Tungsten / LED Ellipsoidal Profile Fixture', '🔦', 'lighting', 0.3, 0.65, 1.9, 750, 1100, 57000, 0x1a1918, 'Sharp-edged theatrical profile spot with 4 framing shutters');
addGearItem('light-par-bar-4way', '4-Head Moving RGBWA Stage Truss Light Bar', '🚥', 'lighting', 1.0, 0.25, 2.1, 160, 980, 51000, 0x111111, 'Synchronized rotating stage beams with strobe and chase effects');
addGearItem('light-moving-head-beam', '350W Stage Moving Head Sharp Beam Spotlight', '✨', 'lighting', 0.4, 0.4, 0.6, 350, 1400, 72000, 0x1c1b1a, 'Piercing parallel laser-like beam with rotating prism wheel');
addGearItem('light-strobe-blaster', '1500W High-Power DMX Theatrical Strobe Blaster', '⚡', 'lighting', 0.45, 0.2, 0.25, 1500, 850, 44000, 0x222222, 'Instantaneous stadium flash tube with continuous blinders');
addGearItem('light-glow-sticks-rgb', 'Set of 4 Magnetic Wireless RGB Light Wands', '🪄', 'lighting', 0.3, 0.3, 0.4, 40, 420, 22000, 0x8800ff, 'Handheld light painting and product edge rim tubes with charging case', { isMountableOnTable: true });
addGearItem('light-sun-gun-hmi', '575W Compact HMI Daylight Sun Gun', '☀️', 'lighting', 0.35, 0.35, 1.8, 575, 2600, 135000, 0x444444, 'True 5600K high-intensity daylight source for matching open windows');
addGearItem('light-soft-grid-egg', 'Eggcrate Honeycomb Fabric Grid (50-Degree)', '🕸️', 'lighting', 0.9, 0.1, 0.9, 0, 95, 4900, 0x111111, 'Snaps directly onto softboxes to prevent light spills onto studio walls');
addGearItem('light-floppy-cutter-4x4', '4x4ft Solid Black Foldout Floppy Flag', '🏴', 'lighting', 1.2, 0.1, 1.2, 0, 310, 16000, 0x0a0a0a, 'Expands into a massive 4x8ft negative fill shade for cinematic shadows');
addGearItem('light-cucoloris-wood', 'Wooden Venetian Blind Shadow Projector Cucoloris', '🪟', 'lighting', 0.6, 0.1, 0.6, 0, 110, 5500, 0x775533, 'Laser-cut wood pattern creates realistic sunlight window shadow streaks');
addGearItem('light-bounce-board-foam', '4x8ft Reversible White/Black V-Flat Foamcore Board', '📐', 'lighting', 1.2, 0.05, 2.4, 0, 190, 9800, 0xfafafa, 'Essential studio tool for wrapping key light or creating negative fill');
addGearItem('light-mirror-board', 'Silver / Gold Reflective Glass Studio Mirror Board', '🪞', 'lighting', 0.8, 0.1, 1.2, 0, 260, 13500, 0xcccccc, 'Redirects hard sunlight into deep studio corners');
addGearItem('light-gobo-pattern-disc-set', 'Set of 20 Stainless Steel Theatrical Gobos', '🎯', 'lighting', 0.1, 0.1, 0.02, 0, 85, 4400, 0xbbbbbb, 'Tree branches, abstract geometry, window blinds, and city skylines', { isMountableOnTable: true });
addGearItem('light-blackwrap-cinefoil', '50ft Roll of Matte Black Aluminum Cinefoil', '🧻', 'lighting', 0.35, 0.08, 0.08, 0, 95, 4900, 0x111111, 'Heat-resistant mask to shape light beams and eliminate spill', { isMountableOnTable: true });
addGearItem('light-ring-light-macro', 'Macro Lens Front Mounted Twin LED Ring Light', '⭕', 'lighting', 0.12, 0.12, 0.04, 8, 140, 7200, 0x222222, 'Shadow-free illumination for extreme closeups of jewelry and eyes', { isMountableOnTable: true });
addGearItem('light-bubble-machine-fx', 'Dual-Wand High Output Studio Bubble Machine', '🫧', 'props', 0.35, 0.25, 0.28, 80, 290, 15000, 0x333333, 'Produces hundreds of continuous floating bubbles for music videos');
addGearItem('light-cold-spark-machine', 'DMX Indoor Safe Titanium Cold Spark Fountain (3m)', '✨', 'props', 0.25, 0.22, 0.28, 600, 1200, 62000, 0x111111, 'Non-flammable pyrotechnic stage effect for stream climaxes');

// ------------------------------------------------------------
// 3. AUDIO, MICS, HEADPHONES & ACOUSTICS (45 items)
// ------------------------------------------------------------
addGearItem('audio-ribbon-mic', 'Classic Figure-8 Studio Ribbon Microphone', '🎙️', 'audio', 0.15, 0.15, 0.3, 0, 890, 46000, 0x222222, 'Silky-smooth vintage top end for brass, acoustic guitars and rich vocal warmth', { isMountableOnTable: true });
addGearItem('audio-tube-condenser', 'Gold-Sputtered Valve Tube Microphone with PSU', '🎙️', 'audio', 0.22, 0.22, 0.45, 25, 2100, 108000, 0xc0a060, 'Warm vacuum tube richness with dedicated outboard power supply unit');
addGearItem('audio-small-diaphragm-pair', 'Matched Stereo Pair Small Diaphragm Pencil Mics', '🥢', 'audio', 0.2, 0.12, 0.2, 0, 540, 28000, 0x444444, 'Cardioid/omni capsules in hard case for ORTF and XY stereo tracking', { isMountableOnTable: true });
addGearItem('audio-boundary-pzm', 'Flat Boundary PZM Floor Microphone', '📻', 'audio', 0.16, 0.16, 0.04, 0, 310, 16000, 0x222222, 'Tapes to conference tables or stages for natural room acoustics', { isMountableOnTable: true });
addGearItem('audio-parabolic-mic', '22-Inch Long-Range Parabolic Dish Microphone', '📡', 'audio', 0.55, 0.4, 0.55, 0, 780, 40000, 0x111111, 'Picks up crisp isolated audio from wildlife or actors over 100 meters away');
addGearItem('audio-boom-pole-carbon', '5-Section Telescoping Carbon Fiber Boom Pole (4m)', '🦯', 'audio', 0.1, 4.0, 0.1, 0, 380, 19500, 0x1f1e1d, 'Ultra-light rigid pole with internal coiled XLR wiring');
addGearItem('audio-blimp-windshield', 'Modular Zeppelin Blimp Windshield & Furry Deadcat', '🌭', 'audio', 0.45, 0.16, 0.16, 0, 290, 15000, 0x555555, 'Eliminates up to 30mph gale force wind noise on outdoor video shoots');
addGearItem('audio-mixer-16ch', '16-Channel Analog Studio Console with British EQ', '🎛️', 'audio', 0.65, 0.55, 0.2, 45, 1650, 85000, 0x22201d, 'Tactile 100mm faders, 4 aux sends, and built-in USB multi-track recording', { isMountableOnTable: true, surfaceHeight: 0.2 });
addGearItem('audio-dsp-speaker-calibrator', 'DSP Room Correction Processor with Measurement Mic', '🎚️', 'audio', 0.24, 0.18, 0.05, 15, 480, 25000, 0x1a1918, 'Calibrates monitor delays and EQ curves for acoustic room accuracy', { isMountableOnTable: true });
addGearItem('audio-guitar-cab-amp', '50W All-Tube Guitar Amplifier & 2x12 Speaker Cabinet', '🎸', 'audio', 0.7, 0.35, 0.75, 120, 1450, 75000, 0x2b2927, 'Classic tone stack amplifier with footswitch and Celestion speakers');
addGearItem('audio-electronic-drum-kit', 'Mesh-Head 8-Piece Electronic Drum Kit & Module', '🥁', 'audio', 1.3, 1.1, 1.2, 25, 2200, 114000, 0x1f1e1d, 'Silent practice and MIDI drum recording setup with dual-zone cymbals');
addGearItem('audio-acoustic-diffuser-qrd', 'Wooden QRD 2D Quadratic Acoustic Sound Diffuser', '🪵', 'audio', 0.6, 0.15, 0.6, 0, 240, 12500, 0x8a6a4a, 'Scatters harsh reflections to make small studio rooms sound huge and open');
addGearItem('audio-iso-vocal-booth-walkin', 'Single-Person Modular Sound Isolation WhisperRoom', '🚪', 'audio', 1.2, 1.2, 2.1, 15, 6800, 350000, 0x2e2c29, '-35dB double-walled isolation booth with ventilation and cable port');
addGearItem('audio-headphone-amp-8ch', '8-Channel High-Power Studio Headphone Distribution Amp', '🎧', 'audio', 0.48, 0.22, 0.05, 30, 390, 20000, 0x1e1d1b, 'Independent stereo mix levels for up to 8 recording musicians', { isMountableOnTable: true });
addGearItem('audio-direct-box-di', 'Active Dual-Channel Phantom Powered DI Box', '🔲', 'audio', 0.14, 0.1, 0.05, 0, 120, 6200, 0x1144aa, 'Converts high-impedance instrument signals to balanced XLR studio lines', { isMountableOnTable: true });

// ------------------------------------------------------------
// 4. FURNITURE, SEATING, DESKS & STAGE PROPS (40 items)
// ------------------------------------------------------------
addGearItem('furn-podcast-table-curved', '4-Person Curved Kidney Podcast Studio Desk', '🪵', 'furniture', 2.0, 1.1, 0.75, 0, 1600, 83000, 0x4a3424, 'Custom broadcast shape allowing all 4 hosts clear eye contact', { surfaceHeight: 0.75 });
addGearItem('furn-executive-leather-desk', 'Walnut & Black Steel Executive Director Desk', '💼', 'furniture', 1.8, 0.85, 0.75, 0, 1950, 100000, 0x28201a, 'Deep luxury wood desk with hidden wire trough and wireless phone pad', { surfaceHeight: 0.75 });
addGearItem('furn-couch-chesterfield', '3-Seater Tufted Leather Chesterfield Sofa', '🛋️', 'furniture', 2.1, 0.9, 0.8, 0, 2800, 145000, 0x3d2719, 'Classic vintage deep brown button-tufted statement couch for talk shows');
addGearItem('furn-stool-wooden-rustic', 'Solid Oak Stool with Sculpted Saddle Seat', '🪑', 'furniture', 0.4, 0.35, 0.65, 0, 180, 9500, 0x997755, 'Minimalist natural wood stool for casual creator vlogs and acoustic sets');
addGearItem('furn-product-pedestal-white', 'Matte White Acrylic Display Pedestal (1m)', '🏛️', 'furniture', 0.4, 0.4, 1.0, 0, 220, 11500, 0xffffff, 'Clean museum-grade plinth for showcasing tech devices and luxury items', { surfaceHeight: 1.0 });
addGearItem('furn-cyclorama-corner-wall', 'Curved Seamless White Infinity Cyclorama Wall Segment', '⬜', 'furniture', 2.4, 1.5, 2.4, 0, 1800, 93000, 0xfcfcfc, 'Smooth cove corner creating an endless horizon for product commercials');
addGearItem('furn-kitchen-island-cart', 'Stainless Steel Rolling Chef Prep Island Counter', '🍳', 'furniture', 1.4, 0.75, 0.9, 0, 1350, 70000, 0xd0d0d0, 'Commercial butcher block top for culinary food shows and ASMR cooking', { surfaceHeight: 0.9 });
addGearItem('furn-neon-sign-custom', 'Custom Acrylic LED Neon Studio Logo Sign', '💡', 'furniture', 0.9, 0.05, 0.45, 30, 390, 20000, 0xff0077, 'Vibrant pink/cyan wall neon script glowing behind the presenter');
addGearItem('furn-houseplant-monstera', 'Large Potted Monstera Deliciosa Indoor Plant', '🪴', 'props', 0.65, 0.65, 1.4, 0, 140, 7200, 0x228833, 'Adds natural organic texture, life, and green color pop to backgrounds');
addGearItem('furn-floor-rug-persian', 'Traditional Persian Pattern Low-Pile Studio Floor Rug', '🧶', 'furniture', 2.0, 1.5, 0.02, 0, 350, 18000, 0x882233, 'Dampens floor footstep echo and adds rich cozy textures to camera shots');
addGearItem('furn-clapper-shelf-display', 'Retro Film Clapper & Vintage Camera Display Shelf', '🎞️', 'props', 0.5, 0.2, 0.8, 0, 190, 9800, 0x332211, 'Decorative background props for cinema reviewers and filmmakers', { isMountableOnTable: true });
addGearItem('furn-wardrobe-rack-rolling', 'Heavy Duty Double Bar Chrome Rolling Garment Rack', '👗', 'props', 1.2, 0.5, 1.6, 0, 210, 11000, 0xcccccc, 'Holds 40+ outfit changes for fashion lookbooks and try-on hauls');
addGearItem('furn-whiteboard-easel', 'Magnetic Double-Sided Rolling Glass Whiteboard', '📋', 'furniture', 1.0, 0.55, 1.85, 0, 480, 25000, 0xf0f0f0, 'Clear glass dry-erase board for tutorials, coding streams and brainstorming');
addGearItem('furn-director-folding-chair', 'Classic Hardwood Canvas Director Chair (Tall)', '🪑', 'furniture', 0.55, 0.5, 1.15, 0, 220, 11500, 0x111111, 'Traditional high vantage film set chair with personalized backrest');

// ------------------------------------------------------------
// 5. STREAMING, TECH, SWITCHERS, COMPUTERS & DISPLAYS (35 items)
// ------------------------------------------------------------
addGearItem('tech-pc-battlestation', 'Liquid-Cooled 24-Core Gaming & Render Rig Tower', '🖥️', 'camera', 0.25, 0.55, 0.5, 750, 4800, 250000, 0x111111, 'RTX 4090 with ARGB lighting, dual 4K capture cards, and NVMe raid', { isMountableOnTable: true });
addGearItem('tech-control-surface-davinci', 'Colorist 3-Trackball Grading Control Panel', '🎛️', 'camera', 0.65, 0.35, 0.12, 30, 2900, 150000, 0x1a1918, 'Weighted optical trackballs and illuminated rotary encoders for color grading', { isMountableOnTable: true });
addGearItem('tech-matrix-switcher-8x8', '8x8 12G-SDI Broadcast Matrix Router', '🎚️', 'camera', 0.48, 0.3, 0.08, 45, 1950, 100000, 0x222222, 'Instantaneous zero-glitch SDI routing between all studio cameras and screens');
addGearItem('tech-ptz-joystick-controller', '3D 4-Axis IP PTZ Joystick Keyboard Controller', '🕹️', 'camera', 0.32, 0.22, 0.12, 12, 780, 40000, 0x1e1d1b, 'Smooth variable speed pan/tilt joystick with zoom rocker for up to 255 cams', { isMountableOnTable: true });
addGearItem('tech-audio-stream-mixer-usb', 'Dual-PC Streaming Audio Interface with Sampler Pads', '🎛️', 'audio', 0.28, 0.18, 0.08, 15, 520, 27000, 0x1f1e1d, 'Motorized faders, optical input, and real-time voice pitch morphing', { isMountableOnTable: true });
addGearItem('tech-smart-prompter-pad', '11-Inch Wireless Tablet with Bluetooth Prompter Remote', '📱', 'camera', 0.25, 0.18, 0.02, 5, 380, 19500, 0x222222, 'Voice-tracking script prompter that matches the speaker cadence', { isMountableOnTable: true });
addGearItem('tech-multi-view-wall-tv', '65-Inch 4K Studio Program / Multi-View Wall Display', '📺', 'camera', 1.45, 0.1, 0.85, 140, 1800, 93000, 0x111111, 'Shows live quad-split, audio meters, tally status, and YouTube chat');
addGearItem('tech-kvm-switch-quad', '4-Port 4K 144Hz DisplayPort / USB-C KVM Matrix Switch', '🖲️', 'camera', 0.24, 0.15, 0.05, 15, 290, 15000, 0x222222, 'Instant hotkey switching between gaming PC, Mac Studio, and streaming rig', { isMountableOnTable: true });
addGearItem('tech-rackmount-ups-3000va', '3000VA True Online Double Conversion 2U Rack UPS', '⚡', 'power', 0.48, 0.6, 0.09, 0, 1650, 85000, 0x111111, 'Zero transfer time pure sine wave power protection for mission critical live broadcasts');

// ------------------------------------------------------------
// 6. POWER, DISTRIBUTION, CABLING & LOCATION (30 items)
// ------------------------------------------------------------
addGearItem('pwr-solar-foldable-400w', '400W Quad-Fold Monocrystalline Solar Panel Kit', '☀️', 'power', 1.0, 0.1, 1.0, 0, 980, 51000, 0x1a2a3a, 'High-efficiency outdoor off-grid charging blanket with MC4 output');
addGearItem('pwr-power-distro-box-32a', '32A 3-Phase Studio Power Distribution Breaker Box', '⚡', 'power', 0.45, 0.35, 0.3, 0, 850, 44000, 0x2233aa, 'Distributes high-load generator power safely to multiple 16A stages');
addGearItem('pwr-generator-silent-5kw', '5kW Ultra-Silent Dual-Fuel Enclosed Inverter Generator', '⚙️', 'power', 0.65, 0.45, 0.55, 0, 4900, 255000, 0xcc2222, '52dB low-noise engine capable of running full studio lighting rigs during blackouts');
addGearItem('pwr-cable-snake-xlr-16ch', '16-Channel XLR Multi-Cable Stage Snake (30m)', '🐍', 'power', 0.4, 0.4, 0.25, 0, 620, 32000, 0x111111, 'Heavy steel stage box running audio signals cleanly from stage to control desk');
addGearItem('pwr-step-up-down-transformer', '3000W Heavy Duty Step-Up / Step-Down Voltage Converter', '🔌', 'power', 0.25, 0.2, 0.18, 0, 420, 22000, 0x333333, 'Runs 110V US cinema equipment safely on 220V/240V African grid power');
addGearItem('pwr-smart-pdu-rack', '8-Outlet IP-Controlled Remote Reboot Rack PDU', '🖧', 'power', 0.48, 0.1, 0.05, 10, 380, 19500, 0x111111, 'Web-accessible power strip to remotely power cycle studio equipment');
addGearItem('pwr-gaffer-tape-pack-6', 'Pro Grade Residue-Free Matte Black Gaffer Tape (6 Rolls)', '📼', 'power', 0.15, 0.15, 0.25, 0, 95, 4900, 0x111111, 'Essential film set adhesive for securing cables and light marks', { isMountableOnTable: true });
addGearItem('pwr-apple-box-family', 'Studio Baltic Birch 4-Piece Nesting Apple Box Set', '📦', 'furniture', 0.5, 0.3, 0.2, 0, 180, 9500, 0xb8976a, 'Full, Half, Quarter, and Pancake wooden riser boxes for leveling equipment and talent');

export const COMPREHENSIVE_EQUIPMENT_CATALOG: Record<string, EquipmentDefinition> = gearCatalog;
export const ALL_EQUIPMENT_IDS: string[] = Object.keys(COMPREHENSIVE_EQUIPMENT_CATALOG);
