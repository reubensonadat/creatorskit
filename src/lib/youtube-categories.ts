/**
 * 🏷️ YouTube Creator Content Categories & Keyword Intelligence
 * Classifies any YouTube video into one of 10 creator categories.
 */

export const CREATOR_CATEGORIES = [
  'Technology & AI',
  'Business & Finance',
  'Africa & Diaspora',
  'Education & Science',
  'Gaming & Esports',
  'Entertainment & Comedy',
  'Podcasts & Interviews',
  'Storytelling & Animation',
  'Lifestyle & Fitness',
  'News & Documentaries',
] as const;

export type CreatorCategory = typeof CREATOR_CATEGORIES[number];

export const CATEGORY_KEYWORDS: Record<CreatorCategory, RegExp[]> = {
  'Technology & AI': [
    /\b(ai|artificial intelligence|gpt|llm|deep learning|neural|chatgpt|claude|gemini|midjourney)\b/i,
    /\b(apple|iphone|macbook|ipad|m4|m3|m2|ios|android|samsung|pixel)\b/i,
    /\b(code|coding|software|python|javascript|typescript|react|nextjs|github|developer|programmer|backend|frontend)\b/i,
    /\b(camera|lens|sensor|sony fx|sony a7|lumix|blackmagic|red komodo|cinema camera|4k|60fps|rig)\b/i,
    /\b(tech|hardware|gpu|cpu|nvidia|amd|intel|rtx|specs|review|unboxing|benchmark|setup)\b/i,
    /\b(teleprompter|microphone|shure|rode|audio interface|lighting|softbox|studio gear)\b/i,
  ],
  'Business & Finance': [
    /\b(money|\$|\bcedis\b|\bnaira\b|dollar|income|revenue|profit|net worth|cash flow)\b/i,
    /\b(sponsor|sponsorship|brand deal|contract|rate card|invoice|receipt|freelance|pricing)\b/i,
    /\b(business|startup|saas|founder|entrepreneur|indie hacker|ecommerce|dropshipping)\b/i,
    /\b(invest|investing|stocks|crypto|bitcoin|eth|real estate|wealth|passive income|momo)\b/i,
    /\b(monetization|creator economy|how to make money|rich|side hustle|salary)\b/i,
  ],
  'Africa & Diaspora': [
    /\b(ghana|ghanaian|accra|kumasi|takoradi|tema|asante|twi|nsmq)\b/i,
    /\b(nigeria|nigerian|lagos|abuja|yoruba|igbo|pidgin|naija)\b/i,
    /\b(kenya|nairobi|south africa|johannesburg|cape town|rwanda|kigali|african)\b/i,
    /\b(afrobeats|amapiano|burna boy|wizkid|davido|stonebwoy|shatta wale|sarkodie|asake)\b/i,
    /\b(wode maya|kwadwo sheldon|kweku|african creator|diaspora|black in tech|west africa)\b/i,
    /\b(jollof|chop bar|village life|accra street|chale|momo payment)\b/i,
  ],
  'Gaming & Esports': [
    /\b(gameplay|walkthrough|lets play|playthrough|speedrun|gaming|gamer)\b/i,
    /\b(gta|grand theft auto|minecraft|fortnite|roblox|call of duty|warzone|valorant|apex legends)\b/i,
    /\b(ps5|playstation|xbox|nintendo switch|steam deck|pc gaming|unreal engine 5)\b/i,
    /\b(esports|streamer|twitch|boss fight|easter egg|glitch|mod|multiplayer)\b/i,
  ],
  'Podcasts & Interviews': [
    /\b(podcast|episode|ep\.\s*\d+|ep\s*\d+|unfiltered|interview|interviewed|talks to|speaks on)\b/i,
    /\b(conversation with|sit down with|the truth about|confession|deep dive with|the joe rogan|diary of a ceo)\b/i,
    /\b(table talk|roundtable|panel|q&a|honest talk|spills the tea|hot ones)\b/i,
  ],
  'Education & Science': [
    /\b(science|physics|chemistry|biology|quantum|space|astronomy|nasa|planet)\b/i,
    /\b(how it works|how to|explained|why do|the history of|what happens if|breakdown)\b/i,
    /\b(tutorial|course|masterclass|learn|guide|step by step|101|principles|psychology)\b/i,
    /\b(math|algorithm|anatomy|brain|neuroscience|dna|research|experiment|study)\b/i,
  ],
  'Storytelling & Animation': [
    /\b(story|storytime|animated|animation|draw my life|short film|cinematic)\b/i,
    /\b(visual essay|video essay|how they shot|film breakdown|editing breakdown|match cut)\b/i,
    /\b(retention|hook|pacing|sound design|color grading|davinci resolve|premiere pro)\b/i,
    /\b(character|screenplay|plot twist|directing|cinematography|b-roll)\b/i,
  ],
  'Entertainment & Comedy': [
    /\b(mrbeast|challenge|i spent \d+|survived \d+|trapped in|24 hours|last to leave)\b/i,
    /\b(comedy|skit|funny|prank|jokes|stand up|parody|meme|try not to laugh)\b/i,
    /\b(reaction|reacting to|blind taste|tier list|ranking every|guess the)\b/i,
  ],
  'Lifestyle & Fitness': [
    /\b(fitness|workout|gym|bodybuilding|muscle|lifting|calisthenics|diet|nutrition|fat loss)\b/i,
    /\b(routine|morning routine|night routine|day in the life|vlog|lifestyle|what i eat)\b/i,
    /\b(travel|travel vlog|hotel|flight|solo travel|packing|minimalism|fashion|grooming)\b/i,
  ],
  'News & Documentaries': [
    /\b(documentary|investigation|exposed|investigative|the truth behind|the rise of|the fall of)\b/i,
    /\b(news|breaking news|economy|inflation|crisis|geopolitics|war|scandal|fraud|court)\b/i,
    /\b(history|untold story|secret world|behind closed doors|inside the)\b/i,
  ],
};

/**
 * Auto-classifies a YouTube video title, channel name, and tags into one of 10 standard categories.
 */
export function inferYouTubeCategory(title: string, channelName?: string): CreatorCategory {
  const combined = `${title || ''} ${channelName || ''}`.toLowerCase();

  // Score each category based on keyword matches
  let bestCategory: CreatorCategory = 'Technology & AI';
  let maxScore = 0;

  for (const category of CREATOR_CATEGORIES) {
    const regexList = CATEGORY_KEYWORDS[category];
    let score = 0;

    for (const regex of regexList) {
      if (regex.test(combined)) {
        score += 2;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}
