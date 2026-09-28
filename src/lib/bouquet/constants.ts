export interface BotanicalItem {
  id: string;
  name: string;
  category: 'flower' | 'greenery' | 'card' | 'overlay';
  flowerSize?: 'big' | 'small';
  greenerySize?: 'big' | 'small';
  src: string;
  meaning: string;
  color: string;
}

export const FLOWERS: BotanicalItem[] = [
  // ─── 12 SMALL FLOWERS (Petite Garden Blooms · Pick 3 to 10) ───
  { id: 'rose-pink', name: 'Rose', category: 'flower', flowerSize: 'small', src: '/assets/bouquet/flowers/rose-pink.webp', meaning: 'Grace, gratitude & joy', color: '#F472B6' },
  { id: 'sunflower-golden', name: 'Sunflower', category: 'flower', flowerSize: 'small', src: '/assets/bouquet/flowers/sunflower-golden.webp', meaning: 'Adoration, warmth & loyalty', color: '#FACC15' },
  { id: 'peony-blush', name: 'Peony', category: 'flower', flowerSize: 'small', src: '/assets/bouquet/flowers/peony-blush.webp', meaning: 'Prosperity & romance', color: '#FDA4AF' },
  { id: 'ranunculus-blush', name: 'Ranunculus', category: 'flower', flowerSize: 'small', src: '/assets/bouquet/flowers/ranunculus-blush.webp', meaning: 'Radiant charm & attraction', color: '#F43F5E' },
  { id: 'carnation-blush', name: 'Carnation', category: 'flower', flowerSize: 'small', src: '/assets/bouquet/flowers/carnation-blush.webp', meaning: 'Pure love & good fortune', color: '#FBCFE8' },
  { id: 'camellia-pink', name: 'Camellia', category: 'flower', flowerSize: 'small', src: '/assets/bouquet/flowers/camellia-pink.webp', meaning: 'Affection & longing', color: '#FB7185' },
  { id: 'african-daisy-coral', name: 'African Daisy', category: 'flower', flowerSize: 'small', src: '/assets/bouquet/flowers/african-daisy-coral.webp', meaning: 'Bright optimism & playful spirit', color: '#FB923C' },
  { id: 'daisy-cream', name: 'Daisy', category: 'flower', flowerSize: 'small', src: '/assets/bouquet/flowers/daisy-cream.webp', meaning: 'Innocence & cheerful beginnings', color: '#FEF08A' },
  { id: 'tulip-rose', name: 'Tulip', category: 'flower', flowerSize: 'small', src: '/assets/bouquet/flowers/tulip-rose.webp', meaning: 'Perfect & unconditional love', color: '#FB7185' },
  { id: 'lily-ivory', name: 'Lily', category: 'flower', flowerSize: 'small', src: '/assets/bouquet/flowers/lily-ivory.webp', meaning: 'Purity, rebirth & devotion', color: '#F8FAFC' },
  { id: 'orchid-lilac', name: 'Orchid', category: 'flower', flowerSize: 'small', src: '/assets/bouquet/flowers/orchid-lilac.webp', meaning: 'Delicate beauty & strength', color: '#C084FC' },
  { id: 'lotus-blush', name: 'Lotus', category: 'flower', flowerSize: 'small', src: '/assets/bouquet/flowers/lotus-blush.webp', meaning: 'Enlightenment & renewal', color: '#F472B6' },

  // ─── 8 BIG FLOWERS (Grand Statement Blooms · Pick 3 to 5 with wide spacing) ───
  { id: 'net-rose', name: 'Velvet Rose', category: 'flower', flowerSize: 'big', src: '/assets/bouquet/flowers/net-rose.webp', meaning: 'Deep romance & clear affection', color: '#E11D48' },
  { id: 'net-peony', name: 'Imperial Peony', category: 'flower', flowerSize: 'big', src: '/assets/bouquet/flowers/net-peony.webp', meaning: 'Warm celebration & honor', color: '#FB7185' },
  { id: 'net-camellia', name: 'Classic Camellia', category: 'flower', flowerSize: 'big', src: '/assets/bouquet/flowers/net-camellia.webp', meaning: 'Structured & dependable care', color: '#F472B6' },
  { id: 'net-daisy', name: 'Meadow Daisy', category: 'flower', flowerSize: 'big', src: '/assets/bouquet/flowers/net-daisy.webp', meaning: 'Bright informal care & friendship', color: '#FDE047' },
  { id: 'net-tulip', name: 'Ruby Tulip', category: 'flower', flowerSize: 'big', src: '/assets/bouquet/flowers/net-tulip.webp', meaning: 'Upright friendship & fresh starts', color: '#F43F5E' },
  { id: 'net-lily', name: 'Stargazer Lily', category: 'flower', flowerSize: 'big', src: '/assets/bouquet/flowers/net-lily.webp', meaning: 'Respectful and calm support', color: '#E2E8F0' },
  { id: 'net-orchid', name: 'Royal Orchid', category: 'flower', flowerSize: 'big', src: '/assets/bouquet/flowers/net-orchid.webp', meaning: 'Polished, intentional refinement', color: '#A855F7' },
  { id: 'net-lotus', name: 'Sacred Lotus', category: 'flower', flowerSize: 'big', src: '/assets/bouquet/flowers/net-lotus.webp', meaning: 'Centered, peaceful presence', color: '#FDA4AF' },
];

export const GREENERY: BotanicalItem[] = [
  // ─── 6 PETITE GREENERY (For Small Flowers · Delicate backdrop) ───
  { id: 'fern-illustration', name: 'Woodland Fern', category: 'greenery', greenerySize: 'small', src: '/assets/bouquet/greenery/fern-illustration.webp', meaning: 'Eternal youth & sincerity', color: '#22C55E' },
  { id: 'fern-fan', name: 'Fan Fern', category: 'greenery', greenerySize: 'small', src: '/assets/bouquet/greenery/fern-fan.webp', meaning: 'Protection & fascination', color: '#15803D' },
  { id: 'curled-frond', name: 'Curled Frond', category: 'greenery', greenerySize: 'small', src: '/assets/bouquet/greenery/curled-frond.webp', meaning: 'New beginnings & grace', color: '#16A34A' },
  { id: 'olive-spray', name: 'Olive Spray', category: 'greenery', greenerySize: 'small', src: '/assets/bouquet/greenery/olive-spray.webp', meaning: 'Peace, wisdom & friendship', color: '#65A30D' },
  { id: 'berry-branch', name: 'Berry Branch', category: 'greenery', greenerySize: 'small', src: '/assets/bouquet/greenery/berry-branch.webp', meaning: 'Celebration & abundance', color: '#E11D48' },
  { id: 'berry-spray', name: 'Berry Spray', category: 'greenery', greenerySize: 'small', src: '/assets/bouquet/greenery/berry-spray.webp', meaning: 'Sweet memories', color: '#DC2626' },

  // ─── 4 GRAND GREENERY (For Big Flowers · Full botanical background) ───
  { id: 'net-leafy', name: 'Lush Foliage', category: 'greenery', greenerySize: 'big', src: '/assets/bouquet/greenery/net-leafy.webp', meaning: 'Fullness & vibrant life', color: '#16A34A' },
  { id: 'net-eucalyptus', name: 'Silver Eucalyptus', category: 'greenery', greenerySize: 'big', src: '/assets/bouquet/greenery/net-eucalyptus.webp', meaning: 'Healing & protection', color: '#10B981' },
  { id: 'net-willow', name: 'Weeping Willow', category: 'greenery', greenerySize: 'big', src: '/assets/bouquet/greenery/net-willow.webp', meaning: 'Graceful flow & balance', color: '#059669' },
  { id: 'net-fern', name: 'Forest Fern', category: 'greenery', greenerySize: 'big', src: '/assets/bouquet/greenery/net-fern.webp', meaning: 'Calm composure', color: '#047857' },
];

export const CARD_TEMPLATES = [
  { id: 'minimalist-letterhead', name: 'Minimalist Letterhead', src: '/assets/bouquet/cards/classic-cream.webp', border: '#e2d9cc' },
];

export const OVERLAYS = {
  ribbonWrap: '/assets/bouquet/overlays/ribbon-wrap.webp',
  petalFall: '/assets/bouquet/overlays/petal-fall.webp',
};
