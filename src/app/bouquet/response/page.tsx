'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, Heart, ArrowLeft, Sparkles } from 'lucide-react';

function BouquetResponseForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const toParam = searchParams.get('to') || 'The Sender';
    const fromParam = searchParams.get('from') || 'You';

    const [message, setMessage] = useState('');
    const [name, setName] = useState(fromParam);
    const [submitted, setSubmitted] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);
        // Mock submission (user requested "build the ui for now")
        setTimeout(() => {
            setIsSending(false);
            setSubmitted(true);
        }, 1200);
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-[#f4f1ea] flex flex-col items-center justify-center p-6 font-mono select-none">
                <div className="w-full max-w-md bg-white border-3 border-black p-8 shadow-[8px_8px_0_#000] flex flex-col items-center text-center gap-5 animate-in fade-in slide-in-from-bottom-8 duration-500">
                    <div className="w-16 h-16 bg-[#FFE500] border-3 border-black flex items-center justify-center rounded-full mb-2">
                        <Heart size={32} className="text-black fill-black" />
                    </div>
                    <h1 className="text-2xl font-black uppercase">Note Sent!</h1>
                    <p className="text-sm font-medium text-neutral-600">
                        Your message is flying back to {toParam}. They'll be thrilled to hear from you.
                    </p>
                    <button
                        onClick={() => router.back()}
                        className="mt-4 px-6 py-3 bg-black text-[#FFE500] border-2 border-black font-black uppercase tracking-wider hover:bg-[#FFE500] hover:text-black hover:-translate-y-1 transition-all"
                    >
                        Back to Gift
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f4f1ea] flex flex-col items-center justify-center p-6 font-sans">
            {/* Background decorative elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-10">
                <div className="w-[80vw] h-[80vw] border-[10vw] border-black rounded-full mix-blend-overlay"></div>
            </div>

            <div className="w-full max-w-lg z-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 mb-6 text-sm font-mono font-bold uppercase tracking-wider text-black hover:text-neutral-500 transition-colors"
                >
                    <ArrowLeft size={16} /> Return to Gift
                </button>

                <div className="bg-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0_#000] relative">
                    {/* Decorative pin */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#FFE500] border-2 border-black rounded-full shadow-[2px_2px_0_#000]"></div>

                    <div className="flex flex-col gap-6 mt-4">
                        <div className="text-center space-y-2 border-b-2 border-black/10 pb-6">
                            <h1 className="text-3xl font-black uppercase tracking-tight text-black flex items-center justify-center gap-2">
                                Send a Note <Sparkles size={24} className="text-[#FFE500] fill-[#FFE500]" />
                            </h1>
                            <p className="text-sm font-mono font-bold text-neutral-500 uppercase tracking-wide">
                                To: {toParam}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            <div className="space-y-2">
                                <label className="text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2">
                                    Your Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 bg-[#f4f1ea] border-2 border-black font-medium focus:outline-none focus:ring-4 focus:ring-[#FFE500]/50 transition-all placeholder:text-neutral-400"
                                    placeholder="Who is this from?"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2">
                                    Message
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full px-4 py-3 bg-[#f4f1ea] border-2 border-black font-serif italic text-lg leading-relaxed focus:outline-none focus:ring-4 focus:ring-[#FFE500]/50 transition-all placeholder:text-neutral-400 resize-none"
                                    placeholder="Say thank you, happy birthday, or just hello..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSending || !message.trim() || !name.trim()}
                                className="mt-2 w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#FFE500] border-3 border-black text-black font-black uppercase tracking-widest text-sm shadow-[4px_4px_0_#000] hover:translate-y-1 hover:shadow-[0px_0px_0_#000] active:bg-black active:text-[#FFE500] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isSending ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} /> Send Note
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <Link
                        href="/tree-qr"
                        className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-neutral-500 hover:text-black transition-colors"
                    >
                        <Heart size={14} /> Built with CreatorsKit
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function BouquetResponsePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#f4f1ea] flex flex-col items-center justify-center p-6 font-mono select-none">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <BouquetResponseForm />
        </Suspense>
    );
}
