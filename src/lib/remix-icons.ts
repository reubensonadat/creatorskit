import React from 'react';
import {
  RiArrowRightLine,
  RiArrowRightUpLine,
  RiArrowRightCircleLine,
  RiCornerDownRightLine,
  RiCompass3Line,
  RiNavigationLine,
  RiImageLine,
  RiImageAddLine,
  RiGalleryLine,
  RiCameraLensLine,
  RiVideoLine,
  RiFilmLine,
  RiPlayCircleLine,
  RiSlideshowLine,
  RiPaletteLine,
  RiBrushLine,
  RiPencilRulerLine,
  RiContrastDropLine,
  RiCropLine,
  RiLayoutMasonryLine,
  RiArtboardLine,
  RiShapeLine,
  RiFireLine,
  RiRocketLine,
  RiLightbulbLine,
  RiSearchLine,
  RiFolder3Line,
  RiCheckLine,
  RiCheckboxCircleFill,
  RiBookmarkLine,
  RiHeartLine,
  RiThumbUpLine,
  RiShareForwardLine,
  RiSendPlaneLine,
  RiEyeLine,
  RiTimeLine,
  RiCalendarLine,
  RiFontSize,
  RiQuoteText,
  RiDoubleQuotesL,
  RiBookOpenLine,
  RiFileList3Line,
  RiChat1Line,
  RiMessage3Line,
  RiPriceTag3Line,
  RiShieldCheckLine,
  RiVerifiedBadgeFill,
  RiUserLine,
  RiBuildingLine,
  RiGlobalLine,
  RiLink,
  RiPlaneLine,
  RiQuestionLine,
  RiNotificationLine,
  RiCodeSSlashLine,
  RiStarLine,
  RiAwardLine,
  RiTrophyLine,
  RiKeyLine,
  RiLockLine,
  RiCpuLine,
  RiTerminalBoxLine,
} from '@remixicon/react';

export interface IconDefinition {
  id: string;
  name: string;
  category: 'arrows' | 'media' | 'creator' | 'actions' | 'social' | 'badge';
  component: React.ComponentType<{ size?: number | string; className?: string; style?: React.CSSProperties }>;
}

export const REMIX_ICONS_LIST: IconDefinition[] = [
  // Arrows & Navigation
  { id: 'arrow-right', name: 'Arrow Right', category: 'arrows', component: RiArrowRightLine },
  { id: 'arrow-up-right', name: 'Arrow Up Right', category: 'arrows', component: RiArrowRightUpLine },
  { id: 'arrow-circle-right', name: 'Arrow Circle', category: 'arrows', component: RiArrowRightCircleLine },
  { id: 'corner-down-right', name: 'Corner Arrow', category: 'arrows', component: RiCornerDownRightLine },
  { id: 'plane', name: 'Airplane / Jet', category: 'arrows', component: RiPlaneLine },
  { id: 'navigation', name: 'Navigation', category: 'arrows', component: RiNavigationLine },
  { id: 'compass', name: 'Compass', category: 'arrows', component: RiCompass3Line },

  // Media & Images
  { id: 'image-add', name: 'Add Image', category: 'media', component: RiImageAddLine },
  { id: 'image', name: 'Image / Photo', category: 'media', component: RiImageLine },
  { id: 'gallery', name: 'Gallery', category: 'media', component: RiGalleryLine },
  { id: 'camera', name: 'Camera', category: 'media', component: RiCameraLensLine },
  { id: 'video', name: 'Video Reel', category: 'media', component: RiVideoLine },
  { id: 'film', name: 'Cinema Strip', category: 'media', component: RiFilmLine },
  { id: 'play', name: 'Play Button', category: 'media', component: RiPlayCircleLine },
  { id: 'slideshow', name: 'Carousel Slide', category: 'media', component: RiSlideshowLine },

  // Creator & Design
  { id: 'palette', name: 'Color Palette', category: 'creator', component: RiPaletteLine },
  { id: 'brush', name: 'Art Brush', category: 'creator', component: RiBrushLine },
  { id: 'ruler', name: 'Ruler & Pencil', category: 'creator', component: RiPencilRulerLine },
  { id: 'contrast', name: 'Contrast / Drop', category: 'creator', component: RiContrastDropLine },
  { id: 'crop', name: 'Crop Canvas', category: 'creator', component: RiCropLine },
  { id: 'layout', name: 'Grid Layout', category: 'creator', component: RiLayoutMasonryLine },
  { id: 'artboard', name: 'Artboard Canvas', category: 'creator', component: RiArtboardLine },
  { id: 'shape', name: 'Geometry Shape', category: 'creator', component: RiShapeLine },
  { id: 'font-size', name: 'Typography', category: 'creator', component: RiFontSize },
  { id: 'code', name: 'Code Dev', category: 'creator', component: RiCodeSSlashLine },
  { id: 'cpu', name: 'AI / Tech Chip', category: 'creator', component: RiCpuLine },
  { id: 'terminal', name: 'Terminal', category: 'creator', component: RiTerminalBoxLine },

  // Actions & Engagement
  { id: 'fire', name: 'Fire / Viral', category: 'actions', component: RiFireLine },
  { id: 'rocket', name: 'Rocket Launch', category: 'actions', component: RiRocketLine },
  { id: 'lightbulb', name: 'Idea / Insight', category: 'actions', component: RiLightbulbLine },
  { id: 'search', name: 'Search Loop', category: 'actions', component: RiSearchLine },
  { id: 'folder', name: 'Folder Notes', category: 'actions', component: RiFolder3Line },
  { id: 'check', name: 'Checkmark', category: 'actions', component: RiCheckLine },
  { id: 'bookmark', name: 'Save / Bookmark', category: 'actions', component: RiBookmarkLine },
  { id: 'heart', name: 'Heart Like', category: 'actions', component: RiHeartLine },
  { id: 'thumb-up', name: 'Thumbs Up', category: 'actions', component: RiThumbUpLine },
  { id: 'share', name: 'Share Forward', category: 'actions', component: RiShareForwardLine },
  { id: 'send', name: 'Send Paper Plane', category: 'actions', component: RiSendPlaneLine },

  // Social & Badges
  { id: 'verified', name: 'Verified Badge', category: 'badge', component: RiVerifiedBadgeFill },
  { id: 'shield', name: 'Shield Security', category: 'badge', component: RiShieldCheckLine },
  { id: 'user', name: 'Author Profile', category: 'badge', component: RiUserLine },
  { id: 'building', name: 'Company / Org', category: 'badge', component: RiBuildingLine },
  { id: 'global', name: 'Web World', category: 'badge', component: RiGlobalLine },
  { id: 'link', name: 'Hyperlink', category: 'badge', component: RiLink },
  { id: 'quote', name: 'Quote Marks', category: 'badge', component: RiQuoteText },
  { id: 'double-quote', name: 'Double Quote', category: 'badge', component: RiDoubleQuotesL },
  { id: 'star', name: 'Star Award', category: 'badge', component: RiStarLine },
  { id: 'trophy', name: 'Trophy Winner', category: 'badge', component: RiTrophyLine },
  { id: 'award', name: 'Ribbon Award', category: 'badge', component: RiAwardLine },
  { id: 'tag', name: 'Tag Badge', category: 'badge', component: RiPriceTag3Line },
  { id: 'chat', name: 'Chat Bubble', category: 'badge', component: RiChat1Line },
];

export function getRemixIconComponent(iconId?: string) {
  if (!iconId) return RiArrowRightLine;
  const found = REMIX_ICONS_LIST.find((i) => i.id === iconId || i.name.toLowerCase() === iconId.toLowerCase());
  return found ? found.component : RiArrowRightLine;
}
