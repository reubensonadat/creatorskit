export interface GoogleFontOption {
  id: string;
  name: string;
  category: 'Serif' | 'Typewriter' | 'Tabloid' | 'Sans' | 'Display';
  fontFamily: string;
}

export const GOOGLE_FONTS_LIST: GoogleFontOption[] = [
  // --- SERIF & BROADSHEET (12) ---
  { id: 'playfair', name: 'Playfair Display', category: 'Serif', fontFamily: '"Playfair Display", Georgia, serif' },
  { id: 'merriweather', name: 'Merriweather', category: 'Serif', fontFamily: '"Merriweather", Georgia, serif' },
  { id: 'cinzel', name: 'Cinzel Decorative', category: 'Serif', fontFamily: '"Cinzel", "Times New Roman", serif' },
  { id: 'bodoni', name: 'Bodoni Moda', category: 'Serif', fontFamily: '"Bodoni Moda", serif' },
  { id: 'cormorant', name: 'Cormorant Garamond', category: 'Serif', fontFamily: '"Cormorant Garamond", serif' },
  { id: 'dm-serif', name: 'DM Serif Display', category: 'Serif', fontFamily: '"DM Serif Display", serif' },
  { id: 'libre-baskerville', name: 'Libre Baskerville', category: 'Serif', fontFamily: '"Libre Baskerville", serif' },
  { id: 'eb-garamond', name: 'EB Garamond', category: 'Serif', fontFamily: '"EB Garamond", serif' },
  { id: 'lora', name: 'Lora', category: 'Serif', fontFamily: '"Lora", serif' },
  { id: 'newsreader', name: 'Newsreader', category: 'Serif', fontFamily: '"Newsreader", serif' },
  { id: 'prata', name: 'Prata', category: 'Serif', fontFamily: '"Prata", serif' },
  { id: 'old-standard', name: 'Old Standard TT', category: 'Serif', fontFamily: '"Old Standard TT", serif' },

  // --- TYPEWRITER & CLASSIFIED (10) ---
  { id: 'courier-prime', name: 'Courier Prime', category: 'Typewriter', fontFamily: '"Courier Prime", "Courier New", monospace' },
  { id: 'special-elite', name: 'Special Elite (Grungy Type)', category: 'Typewriter', fontFamily: '"Special Elite", monospace' },
  { id: 'space-mono', name: 'Space Mono', category: 'Typewriter', fontFamily: '"Space Mono", monospace' },
  { id: 'roboto-mono', name: 'Roboto Mono', category: 'Typewriter', fontFamily: '"Roboto Mono", monospace' },
  { id: 'fira-code', name: 'Fira Code', category: 'Typewriter', fontFamily: '"Fira Code", monospace' },
  { id: 'ibm-plex-mono', name: 'IBM Plex Mono', category: 'Typewriter', fontFamily: '"IBM Plex Mono", monospace' },
  { id: 'source-code', name: 'Source Code Pro', category: 'Typewriter', fontFamily: '"Source Code Pro", monospace' },
  { id: 'cutive-mono', name: 'Cutive Mono', category: 'Typewriter', fontFamily: '"Cutive Mono", monospace' },
  { id: 'anonymous-pro', name: 'Anonymous Pro', category: 'Typewriter', fontFamily: '"Anonymous Pro", monospace' },
  { id: 'vt323', name: 'VT323 Terminal', category: 'Typewriter', fontFamily: '"VT323", monospace' },

  // --- TABLOID & HEAVY GOTHIC (10) ---
  { id: 'bebas-neue', name: 'Bebas Neue', category: 'Tabloid', fontFamily: '"Bebas Neue", Impact, sans-serif' },
  { id: 'anton', name: 'Anton', category: 'Tabloid', fontFamily: '"Anton", Impact, sans-serif' },
  { id: 'oswald', name: 'Oswald', category: 'Tabloid', fontFamily: '"Oswald", sans-serif' },
  { id: 'barlow-condensed', name: 'Barlow Condensed', category: 'Tabloid', fontFamily: '"Barlow Condensed", sans-serif' },
  { id: 'archivo-black', name: 'Archivo Black', category: 'Tabloid', fontFamily: '"Archivo Black", sans-serif' },
  { id: 'fjalla-one', name: 'Fjalla One', category: 'Tabloid', fontFamily: '"Fjalla One", sans-serif' },
  { id: 'alfa-slab', name: 'Alfa Slab One', category: 'Tabloid', fontFamily: '"Alfa Slab One", serif' },
  { id: 'russo-one', name: 'Russo One', category: 'Tabloid', fontFamily: '"Russo One", sans-serif' },
  { id: 'black-ops', name: 'Black Ops One', category: 'Tabloid', fontFamily: '"Black Ops One", sans-serif' },
  { id: 'ultra', name: 'Ultra Heavy', category: 'Tabloid', fontFamily: '"Ultra", serif' },

  // --- CLEAN BRUTALIST & MODERN SANS (10) ---
  { id: 'inter', name: 'Inter', category: 'Sans', fontFamily: '"Inter", sans-serif' },
  { id: 'montserrat', name: 'Montserrat', category: 'Sans', fontFamily: '"Montserrat", sans-serif' },
  { id: 'plus-jakarta', name: 'Plus Jakarta Sans', category: 'Sans', fontFamily: '"Plus Jakarta Sans", sans-serif' },
  { id: 'work-sans', name: 'Work Sans', category: 'Sans', fontFamily: '"Work Sans", sans-serif' },
  { id: 'dm-sans', name: 'DM Sans', category: 'Sans', fontFamily: '"DM Sans", sans-serif' },
  { id: 'poppins', name: 'Poppins', category: 'Sans', fontFamily: '"Poppins", sans-serif' },
  { id: 'outfit', name: 'Outfit', category: 'Sans', fontFamily: '"Outfit", sans-serif' },
  { id: 'space-grotesk', name: 'Space Grotesk', category: 'Sans', fontFamily: '"Space Grotesk", sans-serif' },
  { id: 'syne', name: 'Syne', category: 'Sans', fontFamily: '"Syne", sans-serif' },
  { id: 'cabin', name: 'Cabin', category: 'Sans', fontFamily: '"Cabin", sans-serif' },

  // --- DISPLAY, MARKER & HANDWRITTEN (10) ---
  { id: 'permanent-marker', name: 'Permanent Marker', category: 'Display', fontFamily: '"Permanent Marker", cursive' },
  { id: 'rock-salt', name: 'Rock Salt', category: 'Display', fontFamily: '"Rock Salt", cursive' },
  { id: 'caveat', name: 'Caveat', category: 'Display', fontFamily: '"Caveat", cursive' },
  { id: 'kalam', name: 'Kalam', category: 'Display', fontFamily: '"Kalam", cursive' },
  { id: 'shadows', name: 'Shadows Into Light', category: 'Display', fontFamily: '"Shadows Into Light", cursive' },
  { id: 'indie-flower', name: 'Indie Flower', category: 'Display', fontFamily: '"Indie Flower", cursive' },
  { id: 'covered-grace', name: 'Covered By Your Grace', category: 'Display', fontFamily: '"Covered By Your Grace", cursive' },
  { id: 'bangers', name: 'Bangers Comic', category: 'Display', fontFamily: '"Bangers", cursive' },
  { id: 'righteous', name: 'Righteous', category: 'Display', fontFamily: '"Righteous", cursive' },
  { id: 'monoton', name: 'Monoton Inline', category: 'Display', fontFamily: '"Monoton", cursive' },
];

/**
 * Builds Google Fonts stylesheet URL for all 52 curated fonts
 */
export function getGoogleFontsStylesheetUrl(): string {
  const fontParams = [
    'family=Alfa+Slab+One',
    'family=Anonymous+Pro:wght@400;700',
    'family=Anton',
    'family=Archivo+Black',
    'family=Bangers',
    'family=Barlow+Condensed:wght@700;900',
    'family=Bebas+Neue',
    'family=Black+Ops+One',
    'family=Bodoni+Moda:opsz,wght@6..96,700;6..96,900',
    'family=Cabin:wght@700',
    'family=Caveat:wght@700',
    'family=Cinzel:wght@700;900',
    'family=Cormorant+Garamond:wght@700',
    'family=Courier+Prime:wght@700',
    'family=Covered+By+Your+Grace',
    'family=Cutive+Mono',
    'family=DM+Sans:wght@700;900',
    'family=DM+Serif+Display',
    'family=EB+Garamond:wght@700;800',
    'family=Fira+Code:wght@700',
    'family=Fjalla+One',
    'family=IBM+Plex+Mono:wght@700',
    'family=Indie+Flower',
    'family=Inter:wght@800;900',
    'family=Kalam:wght@700',
    'family=Libre+Baskerville:wght@700',
    'family=Lora:wght@700',
    'family=Merriweather:wght@700;900',
    'family=Monoton',
    'family=Montserrat:wght@800;900',
    'family=Newsreader:opsz,wght@6..72,700;6..72,800',
    'family=Old+Standard+TT:wght@700',
    'family=Oswald:wght@700',
    'family=Outfit:wght@800;900',
    'family=Permanent+Marker',
    'family=Playfair+Display:wght@700;900',
    'family=Plus+Jakarta+Sans:wght@800',
    'family=Poppins:wght@800;900',
    'family=Prata',
    'family=Righteous',
    'family=Roboto+Mono:wght@700',
    'family=Rock+Salt',
    'family=Russo+One',
    'family=Shadows+Into+Light',
    'family=Source+Code+Pro:wght@700;900',
    'family=Space+Grotesk:wght@700',
    'family=Space+Mono:wght@700',
    'family=Special+Elite',
    'family=Syne:wght@800',
    'family=Ultra',
    'family=VT323',
    'family=Work+Sans:wght@800;900',
  ].join('&');

  return `https://fonts.googleapis.com/css2?${fontParams}&display=swap`;
}
