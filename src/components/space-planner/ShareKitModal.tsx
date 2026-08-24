'use client';

import { useState } from 'react';
import { usePlannerStore } from './store';
import { generateShareableKitUrl, compressStudioKit } from '@/lib/space-planner/share-engine';
import { generateBillOfMaterials } from '@/lib/space-planner/affiliate';
import { Copy, Check, Share2, Twitter, ExternalLink } from 'lucide-react';

interface ShareKitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareKitModal({ isOpen, onClose }: ShareKitModalProps) {
  const roomWidth = usePlannerStore((s) => s.roomWidth);
  const roomDepth = usePlannerStore((s) => s.roomDepth);
  const roomHeight = usePlannerStore((s) => s.roomHeight);
  const floorFinish = usePlannerStore((s) => s.floorFinish);
  const projectInfo = usePlannerStore((s) => s.projectInfo);
  const placedObjects = usePlannerStore((s) => s.placedObjects);
  const userAffiliateTag = usePlannerStore((s) => s.userAffiliateTag);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  if (!isOpen) return null;

  const shareUrl = generateShareableKitUrl({
    roomWidth,
    roomDepth,
    roomHeight,
    floorFinish,
    projectInfo,
    userAffiliateTag,
    placedObjects,
  });

  const bom = generateBillOfMaterials(placedObjects, userAffiliateTag);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const youtubeSnippet = [
    `🎥 MY STUDIO SETUP (Interactive 3D Tour & Gear List):`,
    `👉 ${shareUrl}`,
    ``,
    `GEAR USED:`,
    ...bom.items.slice(0, 6).map((i) => `• ${i.brand} ${i.model} - ${i.amazonUrl}`),
    ...(bom.items.length > 6 ? [`• + ${bom.items.length - 6} more items in 3D kit`] : []),
  ].join('\n');

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(youtubeSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  const tweetText = encodeURIComponent(
    `Check out my full 3D Creator Studio Setup & Gear Layout on CreatorKit Space Planner! 🎥✨ Explore the 3D kit here: ${shareUrl}`
  );
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white border-4 border-black p-5 shadow-[8px_8px_0_#000] font-mono space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-black pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 bg-zinc-900 text-white border border-black font-bold text-xs uppercase">
                3D STUDIO SHARE
              </span>
            </div>
            <h2 className="text-lg font-black text-black mt-1">
              Share Your 3D Studio Kit
            </h2>
            <p className="text-[11px] text-stone-600">
              Anyone with this link can interactively walk through your 3D setup and inspect your exact gear.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 bg-black text-white font-bold flex items-center justify-center hover:bg-stone-800"
          >
            ✕
          </button>
        </div>

        {/* 1-Click Link Copy Box */}
        <div className="space-y-1.5">
          <label className="text-[10.5px] font-bold text-black uppercase">
            1-Click 3D Interactive URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 p-2 text-[11px] bg-stone-100 border-2 border-black font-mono select-all text-stone-800"
            />
            <button
              onClick={handleCopyLink}
              className="btn px-4 py-2 bg-zinc-900 hover:bg-black text-white font-bold text-xs border-2 border-black flex items-center gap-1.5 shadow-[2px_2px_0_#000]"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copiedLink ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* YouTube Description Snippet */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10.5px] font-bold text-black uppercase">
              YouTube Video Description Snippet
            </label>
            <button
              onClick={handleCopySnippet}
              className="text-[10px] font-bold text-black hover:underline flex items-center gap-1"
            >
              {copiedSnippet ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              {copiedSnippet ? 'Copied Snippet!' : 'Copy Snippet'}
            </button>
          </div>
          <textarea
            readOnly
            rows={4}
            value={youtubeSnippet}
            className="w-full p-2 text-[10px] bg-stone-50 border-2 border-black font-mono select-all text-stone-700 leading-relaxed"
          />
        </div>

        {/* Social Share Buttons */}
        <div className="pt-2 border-t-2 border-black flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn px-3 py-1.5 bg-[#1DA1F2] hover:bg-[#1a94e0] text-white font-bold text-[11px] border-2 border-black flex items-center gap-1.5 shadow-[2px_2px_0_#000]"
            >
              <Twitter size={13} />
              Share to X / Twitter
            </a>
          </div>

          <button
            onClick={onClose}
            className="btn px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-black font-bold text-xs border border-black"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
