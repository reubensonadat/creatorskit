'use client';

interface AdBannerProps {
  slot?: 'leaderboard' | 'rectangle' | 'sidebar';
  className?: string;
}

export default function AdBanner({ slot = 'leaderboard', className = '' }: AdBannerProps) {
  return (
    <div
      className={`w-full my-4 border border-dashed border-gray-400 bg-white p-3 flex flex-col items-center justify-center min-h-[90px] ${className}`}
    >
      <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">
        ADVERTISEMENT
      </span>
      {/* Ready for Google AdSense <ins className="adsbygoogle" ... /> */}
    </div>
  );
}
