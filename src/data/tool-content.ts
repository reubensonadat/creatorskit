/**
 * src/data/tool-content.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Editorial layer for every embedded tool page (AdSense "low value content"
 * remediation 2026-10-23). Each entry renders below the live tool UI via
 * ToolArticle in ToolLayout: a genuine how-to, real use cases and an FAQ,
 * unique per tool — written about what the tool actually does, not boilerplate.
 *
 * Rules for future entries (keep the value bar high):
 *  · Reference real controls/behaviour of the tool — no generic filler.
 *  · No duplicated sentences between tools; Google's spam policies for thin
 *    content flag templated text swapped across URLs.
 *  · Every FAQ answer must be a complete, useful answer on its own.
 */

export interface ToolFaq {
    q: string;
    a: string;
}

export interface ToolContent {
    /** H2 above the article body, e.g. "About the Social Platform Resizer" */
    heading: string;
    /** Two-to-three unique paragraphs describing what this tool is and does. */
    intro: string[];
    /** Numbered how-to steps — each references a real control in the UI. */
    steps: { title: string; detail: string }[];
    /** Concrete user scenarios. */
    useCases: { title: string; detail: string }[];
    /** Honest, complete answers. Feeds FAQPage structured data. */
    faqs: ToolFaq[];
    /** Internal links shown at the end of the article. */
    related: { label: string; href: string; note: string }[];
}

export const TOOL_CONTENT: Record<string, ToolContent> = {
    '/business': {
        heading: 'About the Creator Business & Legal Suite',
        intro: [
            'The Business & Legal Suite is the paperwork side of a creator career: brand-deal invoices, sponsorship agreements, payment receipts and pitch letterheads, generated in your browser and exported as clean PDFs. It was built for the way deals actually close in West Africa and beyond — mobile-money details on the invoice, bank wire fields when the brand pays corporate, and a receipt you can send the moment money lands.',
            'Everything is free, needs no account, and none of your client data leaves your device. Fill the invoice once, save it to your brand kit, and every future document opens pre-filled with your logo, payment details and numbering. The suite pairs with the Receipt and Agreement tools so a full deal cycle — quote, contract, invoice, receipt — never requires a word processor again.',
        ],
        steps: [
            { title: 'Pick the document', detail: 'Open the suite and choose invoice, agreement, receipt or letterhead. Each one is a purpose-built template with the fields corporate finance teams expect: itemized lines, tax/WHT handling, due dates and payment channels.' },
            { title: 'Fill it once, save it forever', detail: 'Enter your business name, logo, MoMo or bank details. The Brand Kit remembers them on your device, so the next invoice starts 90% complete.' },
            { title: 'Quote in the currency the brand pays in', detail: 'GHS, NGN, USD — the line items and totals follow the currency you pick, and payment instructions match the channel: MTN MoMo, Telecel Cash, bank wire or Paystack link.' },
            { title: 'Export and send', detail: 'Download a clean PDF or share a link that opens a recipient-friendly view on any phone. No watermark, no "Made with" stamp on client-facing documents.' },
        ],
        useCases: [
            { title: 'Invoicing a brand after a sponsored post', detail: 'Post goes live, invoice goes out the same hour with the PO number the brand gave you — that is how you avoid the "waiting on management" delay.' },
            { title: 'Contracting a 3-month retainer', detail: 'Sign the sponsorship agreement before content is shot, with usage rights, deliverables and kill fees in writing.' },
            { title: 'Receipting a MoMo payment', detail: 'The moment the mobile-money alert lands, send a matching receipt — brands remember the creators who make accounting easy.' },
        ],
        faqs: [
            { q: 'Are the invoices and agreements legally valid?', a: 'Yes — an invoice or agreement generated here is the same document you would type in Word. The agreement template covers deliverables, usage rights, payment terms and signatures. For high-value contracts, have a local lawyer review the specifics before signing.' },
            { q: 'Do my client details get uploaded anywhere?', a: 'No. Documents are composed and rendered entirely in your browser. Nothing is sent to a server, and everything stays on your device — you can inspect and delete all stored data at /your-data.' },
            { q: 'Can I add withholding tax (WHT) to an invoice?', a: 'Yes. The invoice supports tax lines so Ghanaian and Nigerian creators can show WHT calculations the way corporate finance departments need them processed.' },
            { q: 'Does it cost anything?', a: 'No. Every document type — invoice, agreement, receipt, letterhead — is free with no signup and no watermark. The site is funded by ads outside the tool flow, never on your documents.' },
            { q: 'Can my client open the document on their phone?', a: 'Yes. Export a PDF, or use the share link — it opens a mobile-friendly view of the exact document, no app or account required.' },
        ],
        related: [
            { label: 'Receipt tool', href: '/receipt', note: 'Standalone payment receipts' },
            { label: 'Brand Kit', href: '/brand-kit', note: 'Save your identity once' },
        ],
    },

    '/demystify': {
        heading: 'About the Demystify Idea Planner',
        intro: [
            'Demystify turns the big task you keep avoiding into a numbered, checkable plan — and every step links straight to the CreatorsKit tool that executes it. Type "edit and post my interview video" and it comes back as concrete chunks: trim the clip, generate captions, style them, resize for each platform. Procrastination is usually ambiguity; this removes it.',
            'The planner runs on your own AI key (BYOK): bring a free Groq key, an OpenAI key, or a Google Gemini key, paste it once, and planning requests go directly from your browser to the model you chose. Your key is stored only on your device and is never sent to our servers. No key? The planner still works with its built-in offline breakdown.',
        ],
        steps: [
            { title: 'Type the task you are stuck on', detail: 'One plain sentence is enough: "launch my photography portfolio" or "clear my 40-clip backlog". The planner is built for vague starts.' },
            { title: 'Connect your key (optional)', detail: 'Paste a Groq, OpenAI or Gemini API key for AI-generated plans. The key lives in your browser storage only and requests go straight to the provider.' },
            { title: 'Get a numbered plan', detail: 'The big task comes back as small checkable steps, each sized for one sitting. Tick them off in the app — progress is saved on your device.' },
            { title: 'Jump into the doing', detail: 'Steps that map to a suite tool carry a button that opens it — captions open Auto Captions, resizing opens the Resizer, invoicing opens the Business Suite. Plan and execution live in the same tab.' },
        ],
        useCases: [
            { title: 'Breaking a video project into a shoot-day list', detail: 'Script → teleprompter → film → captions → match cut → post: each step links to its tool, so the plan is also your production checklist.' },
            { title: 'Starting a side business', detail: '"Register and monetize my content page" becomes paperwork, first five posts, invoice templates and a pitch letter — in order, with links.' },
            { title: 'Weekly planning for freelancers', detail: 'Dump every open loop Monday morning; get a prioritized, tool-linked list you actually finish by Friday.' },
        ],
        faqs: [
            { q: 'Do I need an AI API key to use it?', a: 'No. Demystify includes an offline breakdown mode that works with zero setup. Adding your own key (Groq, OpenAI or Gemini) unlocks richer AI plans — and even then, the key never touches our servers.' },
            { q: 'Where is my API key stored?', a: 'In your browser\u2019s local storage, on your device only. It is forwarded directly to the AI provider when you request a plan — never to CreatorsKit.' },
            { q: 'Is this another chatbot wrapper?', a: 'No. The output is a structured, checkable plan with direct hand-offs into real tools — not a wall of prose you copy somewhere else. The plan is the product.' },
            { q: 'Does it work offline?', a: 'The interface and your saved plans load offline (the suite is a PWA). AI-generated plans need internet; the offline breakdown does not.' },
            { q: 'Can I use it for non-creative work?', a: 'Yes — it plans any task. The difference is that creative steps come with one-click tool links, which other to-do apps cannot do.' },
        ],
        related: [
            { label: 'Teleprompter', href: '/teleprompter', note: 'Rehearse the script it wrote' },
            { label: 'Auto Captions', href: '/auto-captions', note: 'Execute the caption step' },
        ],
    },

    '/text-highlighter': {
        heading: 'About the Text Highlighter',
        intro: [
            'The Text Highlighter creates the animated marker sweeps, circle callouts and box underlines that make talking-head and tutorial videos feel edited — the yellow sweep behind a key phrase, the circle around a number, the box around a button you are explaining. You type the word, pick the effect, and the engine times the animation to the word in your video.',
            'It renders on your device at full resolution with paper textures, marker styles and color controls, then hands the finished clip to the Resizer for every platform format. No timeline editing, no After Effects, no subscription — the presets are tuned to the highlight styles that perform in short-form video right now.',
        ],
        steps: [
            { title: 'Load your video', detail: 'Drop in the clip that needs emphasis — a tutorial, a reaction, a product demo. The file opens locally; it is never uploaded.' },
            { title: 'Type the word or phrase to highlight', detail: 'Enter the exact text. The engine aligns it to the moment it is spoken so the sweep lands on the word, not near it.' },
            { title: 'Pick the effect and texture', detail: 'Marker sweep, circle callout or box underline — then choose ink color and a paper texture if you want the hand-drawn look.' },
            { title: 'Render and hand off', detail: 'Export the highlighted clip, then send it straight to the Resizer or Compressor from the next-step row without re-uploading.' },
        ],
        useCases: [
            { title: 'Tutorial videos where the UI matters', detail: 'Circle the exact button you are describing while you say it — viewers follow along instead of scrubbing back.' },
            { title: 'Podcast and interview clips', detail: 'Sweep the one quotable sentence in a 60-second cut so it lands even on mute.' },
            { title: 'Product demos', detail: 'Box the price, sweep the feature name — emphasis that sells without a voiceover change.' },
        ],
        faqs: [
            { q: 'Is it really free with no watermark?', a: 'Yes. Every render is full quality, no watermark, no export limits. The tool is funded by ads in reserved page slots — never placed over your video or before your download.' },
            { q: 'How does the highlight sync with speech?', a: 'The engine aligns each highlight to the spoken word using the transcript timing, so the sweep starts as the word is said — the same alignment the Auto Captions tool produces.' },
            { q: 'Can I highlight text in a language other than English?', a: 'Yes. The highlighter works on the words in your transcript regardless of language — timing is derived from audio alignment, not an English dictionary.' },
            { q: 'What video formats can I load?', a: 'Anything your browser can play natively — MP4/H.264 and WebM are the reliable choices from any phone or editor.' },
            { q: 'Does my video get uploaded to a server?', a: 'No. Decoding, animation and rendering all happen on your device. The exported file goes straight from your browser to your downloads folder.' },
        ],
        related: [
            { label: 'Match CUT', href: '/match-cut', note: 'Word-anchor kinetic type' },
            { label: 'Auto Captions', href: '/auto-captions', note: 'Generate the transcript first' },
        ],
    },

    '/match-cut': {
        heading: 'About Text Match CUT',
        intro: [
            'Match CUT is a word-anchor kinetic typography editor: it cuts your video exactly on a spoken word and blasts that word full-screen — the "when he said WHAT" edit that stops thumbs. Pick the anchor word, choose a typography preset from the Google Fonts library, and the tool renders the cut, the type and the transition in one pass.',
            'Everything runs locally through the same export pipeline as the rest of the suite, so a 1080p vertical render finishes in your browser and hands off to the Resizer with one click. It is the fastest path from raw clip to a scroll-stopping short.',
        ],
        steps: [
            { title: 'Open your clip', detail: 'Load the video with the line you want to cut on. Short-form clips under two minutes render fastest.' },
            { title: 'Choose the anchor word', detail: 'Tap the word in the transcript where the cut should land — the frame freezes exactly there and the typography takes over.' },
            { title: 'Pick a type preset', detail: 'Dozens of Google Fonts presets sized for vertical video: condensed, slab, mono, marker. Color and outline follow your pick.' },
            { title: 'Render and post', detail: 'Export the finished cut, then hand it to the Resizer for TikTok, Reels and Shorts formats in one ZIP.' },
        ],
        useCases: [
            { title: 'Podcast clips with a punchline', detail: 'Cut hard on the punchline word, full-screen type, back to the clip — the reliable podcast-clip formula in under a minute.' },
            { title: 'Storytime videos', detail: 'Anchor the reveal word so the type lands with the story beat, not after it.' },
            { title: 'Sales and hook videos', detail: 'Put the offer word ("FREE", "TODAY") on screen at full size precisely when it is spoken.' },
        ],
        faqs: [
            { q: 'What is a match cut in editing?', a: 'A cut timed to a specific beat — usually a spoken word — where the incoming shot or graphic matches the outgoing one. Here the beat is a word: the video freezes on it and typography fills the frame before the clip continues.' },
            { q: 'Do I need to know the timestamp myself?', a: 'No. You pick the word from the transcript and the engine finds the exact frame. Manual timestamp entry exists for fine-tuning.' },
            { q: 'Can I use my own font?', a: 'The preset library covers the fonts that reliably load in every browser and render correctly in video exports — hand-picked from Google Fonts so licensing is never a question.' },
            { q: 'How long can the video be?', a: 'There is no hard limit, but kinetic cuts are built for short clips. For long videos, trim the interesting span first — the Resizer can trim on export.' },
            { q: 'Is the export watermarked?', a: 'No. Renders are clean, full-resolution files. The only limit is your device\u2019s processing speed.' },
        ],
        related: [
            { label: 'Text Highlighter', href: '/text-highlighter', note: 'Sweeps instead of cuts' },
            { label: 'Social Platform Resizer', href: '/resizer', note: 'Export every format next' },
        ],
    },

    '/auto-captions': {
        heading: 'About Auto Captions',
        intro: [
            'Auto Captions transcribes your video in the browser and builds styled, timestamped subtitles you can burn in or export as a standard subtitle file. It runs on-device speech recognition — your audio never leaves your machine — and feeds its transcript straight into the Text Highlighter and Match CUT tools so those effects can land on the exact spoken word.',
            'The styling side is a full caption studio: font, size, color, position, background and per-word emphasis. What you style is what gets burned into the MP4. If you need clean SRT/VTT for YouTube instead, the export is one click.',
        ],
        steps: [
            { title: 'Load the video', detail: 'Drop in your clip — the audio is decoded locally, nothing is uploaded.' },
            { title: 'Generate the transcript', detail: 'On-device speech recognition produces timestamped text. Fix any proper nouns right in the editor; timings adjust as you edit.' },
            { title: 'Style the captions', detail: 'Choose font, colors, position and emphasis. The preview shows the burn-in exactly as it will render.' },
            { title: 'Burn in or export the file', detail: 'Render captions into the MP4, or download SRT/VTT for platforms that take subtitle uploads. Hand the transcript to Match CUT or Highlighter for kinetic effects.' },
        ],
        useCases: [
            { title: 'Making mute-scroll-friendly Reels', detail: 'Most viewers watch on mute in feed — burned-in styled captions are the difference between a 3-second and a 30-second watch.' },
            { title: 'YouTube accessibility', detail: 'Export a clean SRT and upload it with the video: proper subtitles, searchable by Google, without trusting auto-generated ones.' },
            { title: 'Repurposing a webinar', detail: 'One transcript becomes burned captions for short clips and an SRT for the full upload — two outputs, one pass.' },
        ],
        faqs: [
            { q: 'How accurate is on-device transcription?', a: 'For clear speech it is strong, and the editor makes fixing names and jargon fast — often faster than correcting cloud services that mangle the same words. Noisy audio benefits from a quiet 10-second re-record of key terms.' },
            { q: 'Does my audio go to a server?', a: 'No. Recognition runs in your browser using on-device models. The audio and transcript never leave your machine unless you choose an optional cloud provider with your own API key.' },
            { q: 'Can I export SRT files?', a: 'Yes — SRT and VTT, with the timings from your edited transcript. These upload directly to YouTube, LinkedIn and most players.' },
            { q: 'Does it support languages other than English?', a: 'On-device accuracy depends on the speech models your browser provides; English is the reliable baseline. The styling and export side works with any transcript you paste or import.' },
            { q: 'Why burn captions instead of using platform auto-captions?', a: 'Platform auto-captions are uniform, often wrong with names, and unstyleable. Burned captions keep your branding, survive re-uploads and look the same on every platform.' },
        ],
        related: [
            { label: 'Text Highlighter', href: '/text-highlighter', note: 'Animate key words' },
            { label: 'Teleprompter', href: '/teleprompter', note: 'Script it first' },
        ],
    },

    '/compressor': {
        heading: 'About Compress & Convert',
        intro: [
            'Compress & Convert handles the unglamorous jobs that decide whether a file actually ships: PDF to images, images to PDF, and squeezing oversized photos into WebP or JPG — with a size estimate before you commit, so you know the download cost on mobile data before you burn it.',
            'It runs entirely on your device, which matters for two reasons: your documents never touch a server, and compression is instant even on a patchy connection. Batch a whole folder, see the projected sizes, then convert only what is worth converting.',
        ],
        steps: [
            { title: 'Drop your files', detail: 'PDFs in for image extraction, images in for PDF packing or recompression. Batch input is supported throughout.' },
            { title: 'Check the estimate', detail: 'Before converting, the tool shows the projected output size per file — the number that matters on a data plan.' },
            { title: 'Pick the target format', detail: 'WebP or JPG with a quality slider for images, single PDF or one-page-per-image for documents.' },
            { title: 'Convert and download', detail: 'Files render on-device and land in your downloads. Send outputs straight to the Watermark or Resizer without re-uploading.' },
        ],
        useCases: [
            { title: 'Meeting a portal\u2019s upload limit', detail: 'Visa portals, tender sites and grant forms all reject large files. Recompress to fit the stated limit — with the size shown first.' },
            { title: 'Sending a photo portfolio as one PDF', detail: 'Pack a folder of shots into a single PDF clients can open anywhere — no zip, no download links.' },
            { title: 'Extracting pages from a scanned PDF', detail: 'Pull pages out as images for editing or re-sharing, at full scan resolution.' },
        ],
        faqs: [
            { q: 'Will compression reduce quality noticeably?', a: 'You control it. The quality slider plus the pre-conversion size estimate let you find the sweet spot — most photos are visually identical at a fraction of the bytes.' },
            { q: 'What is WebP and why use it?', a: 'WebP is Google\u2019s image format: typically 25–35% smaller than JPG at the same visual quality, supported by every modern browser and platform. It is the default recommendation for web uploads.' },
            { q: 'Are my documents uploaded anywhere?', a: 'No. Conversion happens in your browser. A scanned ID or contract processed here never exists on any server.' },
            { q: 'Can I convert a PDF to images for free without limits?', a: 'Yes — no page caps, no daily quotas, no signup. The processing happens on your device, so the only limit is your hardware.' },
            { q: 'Does it work offline?', a: 'Yes. As part of the installed PWA the compressor works with zero connectivity — useful on planes, in studios with dead zones, or when data runs out mid-task.' },
        ],
        related: [
            { label: 'Social Platform Resizer', href: '/resizer', note: 'Format before you compress' },
            { label: 'Batch Watermark', href: '/watermark', note: 'Protect before you send' },
        ],
    },

    '/resizer': {
        heading: 'About the Social Platform Resizer',
        intro: [
            'The Social Platform Resizer turns one master photo or video into every format the platforms actually want: TikTok, Reels and Shorts at 1080×1920, Instagram portrait and square, YouTube 16:9, X posts, Pinterest pins and LinkedIn banners. Frame the crop once with pan and zoom, then export all nine sizes in a single ZIP — each one drawn through the same compositor, so what you framed is exactly what downloads.',
            'Two features do the heavy lifting: platform safe-zone guides that show where TikTok\u2019s, Reels\u2019 and Shorts\u2019 native UI covers your frame, and four fill modes — blurred background, gradient, hard crop or solid letterbox — for converting between aspect ratios without ugly stretching. A brand watermark can be stamped into every export, and video exports render as frame-accurate H.264 MP4 with original audio.',
        ],
        steps: [
            { title: 'Open your master asset', detail: 'Drop a photo or video on the stage, paste a screenshot, or start from the demo. The tool remembers your last source file on-device.' },
            { title: 'Pick the platform', detail: 'Choose from the nine presets in the right panel or the live preview strip. Vertical presets show safe-zone overlays for where platform UI lands.' },
            { title: 'Frame it once', detail: 'Drag to reposition, scroll to zoom, and choose a fill mode for the aspect-ratio gap: blur, gradient, crop or solid color.' },
            { title: 'Export one or all', detail: 'Download the current format, or export all nine in one ZIP — watermark included if you enabled it. Videos render at 30fps with the original audio, trimmed to your in/out points.' },
        ],
        useCases: [
            { title: 'One shoot, every platform', detail: 'Export the same photo to nine exact sizes before your coffee cools — no per-platform trips into a photo editor.' },
            { title: 'Turning a landscape video vertical', detail: 'Blurred-fill converts 16:9 footage to 9:16 without cropping the subject — the standard look for repurposed TV and podcast clips.' },
            { title: 'Keeping captions out of TikTok\u2019s UI', detail: 'Safe-zone bands show exactly where the caption and button rail sit, so your text is never covered after posting.' },
        ],
        faqs: [
            { q: 'What size is a TikTok or Reels video?', a: '1080×1920 pixels (9:16). The resizer ships that preset plus safe-zone guides marking where TikTok\u2019s profile row, icon rail and caption area overlap the frame — the same guides exist for Reels and Shorts.' },
            { q: 'How do I make a landscape photo fit a vertical frame?', a: 'Use the Blur fill mode: the photo sits sharp in the middle while a blurred, darkened copy fills the 9:16 frame behind it. Gradient, hard-crop and solid letterbox modes are one click away.' },
            { q: 'Does resizing reduce image quality?', a: 'No. Every export is drawn at the full native resolution of the target preset through the same compositor used for the preview — no intermediate downscales.' },
            { q: 'Can it resize videos, not just photos?', a: 'Yes. Videos render as H.264 MP4 at 30fps with the original audio kept when the browser can decode it, and in/out points let you trim the export to the exact span you want.' },
            { q: 'Can I add a watermark to every export at once?', a: 'Yes — the watermark panel stamps your handle or logo into every format, video frame and ZIP file in one pass, and remembers your settings for next time.' },
        ],
        related: [
            { label: 'Compress & Convert', href: '/compressor', note: 'Shrink exports for upload' },
            { label: 'Batch Watermark', href: '/watermark', note: 'Protect existing images' },
        ],
    },

    '/watermark': {
        heading: 'About Batch Watermark & Protection',
        intro: [
            'Batch Watermark stamps your logo or handle across a whole folder of images in one pass — the practical defense when your work gets reposted without credit. Choose text or logo, position, size and opacity once, preview it on the first image, then run the batch and download everything watermarked.',
            'Like every tool in the suite it runs on your device, which is what makes batch processing painless: no uploads to wait on, no queue limits, no per-image fees. Position presets sit in the corners where crop-happy reposters leave them intact.',
        ],
        steps: [
            { title: 'Load the batch', detail: 'Drop or select all the images you want stamped — the batch list shows each file with its dimensions.' },
            { title: 'Choose text or logo', detail: 'Type your @handle or upload a logo PNG. Position, size and opacity are live-previewable before you commit.' },
            { title: 'Check the preview', detail: 'The first image renders with your watermark exactly as the batch will output it.' },
            { title: 'Run the batch', detail: 'Every image is stamped and downloaded in one pass — then hand off to the Compressor if you also need smaller files.' },
        ],
        useCases: [
            { title: 'Product photos before sending to a client', detail: 'Watermark the review set so approval copies do not become the final deliverables.' },
            { title: 'Photographers posting to marketplaces', detail: 'Stamp your handle on listing images so reposts carry your name back to you.' },
            { title: 'Event photos delivered in bulk', detail: 'One pass over a whole gallery turns every shared image into an ad for the next booking.' },
        ],
        faqs: [
            { q: 'Does a watermark actually stop content theft?', a: 'Determined thieves can crop or blur a mark, but a visible handle makes casual reposting carry your credit — and most reposts are casual. Corner placement with moderate opacity survives typical crops best.' },
            { q: 'Can I use a transparent logo?', a: 'Yes — upload a PNG with transparency. The opacity slider controls how strongly it sits over the image without hiding detail.' },
            { q: 'Is there a limit on batch size?', a: 'No artificial limit. The practical ceiling is your device\u2019s memory; batches of a few hundred images run comfortably on a modern phone.' },
            { q: 'Does the watermark reduce image quality?', a: 'Stamps are drawn at export quality onto the full-resolution image. Choose PNG output for lossless results, or JPG/WebP with the quality slider when size matters more.' },
            { q: 'Can I watermark different positions per image?', a: 'The batch applies one consistent placement — deliberate, because consistent placement is what makes a mark recognizable. Re-run with different settings for a second set.' },
        ],
        related: [
            { label: 'Compress & Convert', href: '/compressor', note: 'Shrink the batch after' },
            { label: 'Brand Kit', href: '/brand-kit', note: 'Save your logo once' },
        ],
    },

    '/carousel-slicer': {
        heading: 'About the Carousel Slicer',
        intro: [
            'The Carousel Slicer cuts one wide panoramic graphic into seamless multi-slide posts for Instagram, LinkedIn and X. Design the full-width image once — an infographic, a timeline, a step-by-step guide — and the slicer divides it into swipeable slides that line up pixel-perfectly, including the continuation seams that make a carousel feel like one flowing canvas.',
            'Slide counts and aspect ratios follow each platform\u2019s rules, and every slice exports at full platform resolution. The output drops straight into the platform uploader in order — no manual cropping, no guessing where slide boundaries will land.',
        ],
        steps: [
            { title: 'Design wide, load once', detail: 'Create your graphic at full width — for a 10-slide Instagram carousel at 1080px per slide, that is a 10800px-wide canvas.' },
            { title: 'Choose the platform and slide count', detail: 'Instagram square or portrait, LinkedIn, or X — the slicer snaps to the platform\u2019s exact slide dimensions and count rules.' },
            { title: 'Check the seam preview', detail: 'The preview shows each slide with its boundary marked so nothing important gets sliced through mid-word.' },
            { title: 'Export the deck', detail: 'Download all slides numbered in posting order, ready to upload as a carousel in one session.' },
        ],
        useCases: [
            { title: 'Turning a blog post into an Instagram carousel', detail: 'The highest-engagement repurposing format: each section becomes one slide, and the carousel reads top to bottom.' },
            { title: 'LinkedIn step-by-step guides', detail: 'Swipeable documents outperform image posts on LinkedIn — slice a process diagram into a 10-slide walkthrough.' },
            { title: 'Panoramic photography', detail: 'Split a wide landscape into a seamless swipe panorama that reconstructs the full scene.' },
        ],
        faqs: [
            { q: 'What image size should I design at?', a: 'Design at your slide size times the slide count: for a 10-slide Instagram square carousel, that is 10800×1080. The slicer accepts any width and tells you the exact slide dimensions it will produce.' },
            { q: 'Do the slides really line up seamlessly?', a: 'Yes — slices are cut at exact pixel boundaries with no resampling, so content that crosses a boundary continues on the next slide at the same scale. The seam preview exists to help you keep words and faces off the boundaries.' },
            { q: 'How many slides can Instagram carousels have?', a: 'Currently up to 20 frames per post. The slicer\u2019s presets stay within each platform\u2019s limits so uploads never bounce.' },
            { q: 'Can I slice a photo, or only graphics?', a: 'Anything you can load as an image — panoramas, long screenshots, stitched charts. Graphics just benefit most, since the slide boundaries can be designed in.' },
            { q: 'Does it upload my images anywhere?', a: 'No. Slicing happens in your browser and the slides download directly to your device.' },
        ],
        related: [
            { label: 'Social Platform Resizer', href: '/resizer', note: 'Format single posts' },
            { label: 'Text Behind Image', href: '/text-behind', note: 'Design the slides first' },
        ],
    },

    '/background-replace': {
        heading: 'About the Background Remover & Cutout',
        intro: [
            'The Background Remover separates your subject from its background and hands you a transparent PNG in seconds. Run it on-device when your browser supports the local model, or use the server mode for heavier images — either way the cutout is yours: no signup, no credits, no watermark.',
            'The real power is what happens after the cut. One-click hand-offs send the transparent PNG straight into Text Behind Image for depth posters, the Thumbnail Lab for CTR testing, or Batch Watermark for protection — the remover is the front door of a full edit, not a dead-end download.',
        ],
        steps: [
            { title: 'Drop your photo', detail: 'Any portrait, product shot or graphic with a clear subject. The tool previews it instantly.' },
            { title: 'Remove the background', detail: 'On-device mode processes locally; server mode handles large or tricky images. Edges stay crisp around hair and fine detail.' },
            { title: 'Check the edges', detail: 'Preview against checkerboard, white or custom backgrounds to spot halos before exporting.' },
            { title: 'Export or hand off', detail: 'Download the transparent PNG, or send it directly to Text Behind Image, Thumbnail Lab or Watermark without re-uploading.' },
        ],
        useCases: [
            { title: 'Product photos for a shop', detail: 'Clean transparent cutouts drop straight into any storefront template or marketplace listing.' },
            { title: 'Team photos without a studio', detail: 'Cut people out of casual shots for consistent website and deck portraits.' },
            { title: 'Meme and poster raw material', detail: 'A clean cutout is step one of every text-behind-subject and collage style trending now.' },
        ],
        faqs: [
            { q: 'Is background removal really free and unlimited?', a: 'Yes. On-device mode costs nothing to run at any volume, and there is no account, credit system or watermark. Server mode exists for convenience on heavy images, not as a paywall.' },
            { q: 'Which photos work best?', a: 'Clear separation between subject and background — good lighting, distinct colors. Fine hair against a busy background is the hardest case for any tool; a plain wall makes a noticeable difference.' },
            { q: 'Do my photos get uploaded?', a: 'Only if you explicitly choose server mode. On-device mode never transmits the image — processing happens in your browser. The choice is yours on every run.' },
            { q: 'What do I get as output?', a: 'A PNG with a transparent alpha channel at the original resolution — ready for design tools, storefronts or the next CreatorsKit tool.' },
            { q: 'Can it replace the background instead of removing it?', a: 'Yes — pair the cutout with Text Behind Image or drop it onto any background you like after export. The tool\u2019s job is the clean separation; compositing is where you take it.' },
        ],
        related: [
            { label: 'Text Behind Image', href: '/text-behind', note: 'Turn cutouts into posters' },
            { label: 'Batch Watermark', href: '/watermark', note: 'Protect the cutout' },
        ],
    },

    '/palette-extractor': {
        heading: 'About the Color Palette Extractor',
        intro: [
            'The Palette Extractor pulls the exact colors out of any photo and hands you a copy-ready palette: HEX codes, swatches and proportions, sampled from the pixels that actually define the image. Drop in your product shot, brand photo or a frame from your last video, and the palette that comes back is the one your thumbnails, captions and covers should use to match.',
            'The palette feeds directly into the Gradient & Palette Studio, so the jump from "these are my colors" to "this is my gradient, tested on a real page" is one click instead of a manual transcription session.',
        ],
        steps: [
            { title: 'Drop the photo', detail: 'Any image works — the extractor samples the actual pixels, no account or upload.' },
            { title: 'Read the palette', detail: 'Swatches appear with HEX codes in frequency order: the dominant color first, accents after. Click any swatch to copy its code.' },
            { title: 'Tune the count', detail: 'Need three brand colors, not eight? Adjust how many the extractor keeps, from a tight core palette to a full scheme.' },
            { title: 'Send it to the Gradient Studio', detail: 'One click carries the palette into the Gradient & Palette Studio to build and test gradients on a live page preview.' },
        ],
        useCases: [
            { title: 'Building a thumbnail color system', detail: 'Extract the palette from your best-performing thumbnail and reuse it — consistent color is why channels feel recognizable.' },
            { title: 'Matching a shop to its product photos', detail: 'Your product photos already have a palette; the extractor makes it explicit so covers and banners agree with the products.' },
            { title: 'Designing from a mood image', detail: 'Found a photo with the exact mood you want? Extract, copy the HEX codes, and design everything else from it.' },
        ],
        faqs: [
            { q: 'What is a HEX color code?', a: 'The six-digit code (like #FFE500) that specifies an exact color on the web. Design tools, CSS and most apps accept it — copy the code from any swatch here and paste it anywhere.' },
            { q: 'Why do extracted palettes look better than my guesses?', a: 'Because they come from real pixels with real proportions. Photos that feel harmonious already contain a balanced palette; extracting it preserves relationships your eye likes but your memory does not.' },
            { q: 'How many colors should a palette have?', a: 'Three to five for a working brand palette: one dominant, one or two supports, one accent. The extractor\u2019s frequency ordering tells you which is which.' },
            { q: 'Does it work with logos and graphics?', a: 'Yes — flat graphics actually extract cleanest, since their colors are already few and distinct.' },
            { q: 'Can I use the palettes commercially?', a: 'Yes. Colors themselves are not copyrightable, and the extraction runs on your own images on your own device.' },
        ],
        related: [
            { label: 'Gradient & Palette Studio', href: '/color-gradient', note: 'Build gradients from it' },
            { label: 'Brand Kit', href: '/brand-kit', note: 'Save your palette' },
        ],
    },

    '/sync-slate': {
        heading: 'About the Sync Slate & Clapper',
        intro: [
            'The Sync Slate is a film-style clapper board for creators shooting multi-take and multi-camera content: it gives you a loud, sharp sync clap with take logging, so aligning angles and audio in the edit takes seconds instead of guesswork. Mic-level meters show whether your audio is actually recording before you commit the take.',
            'Run it on a phone or tablet next to your main camera — the slate numbers each take, marks the good ones, and its clap spike lines up perfectly on every recorder\u2019s waveform. It pairs naturally with the Teleprompter on shoot day: script on one device, slate on the other.',
        ],
        steps: [
            { title: 'Set the production details', detail: 'Name the project, scene and take — the slate displays them large enough for any camera to read.' },
            { title: 'Watch the meters', detail: 'Mic level meters confirm audio is live and healthy before you call action, killing the silent-failure takes.' },
            { title: 'Clap and log', detail: 'Trigger the clap spike at each take start; mark good takes as you go so the editor (future you) knows which to pull.' },
            { title: 'Sync in the edit', detail: 'Line up the clap spike across your recordings — every angle and audio track locks instantly at that frame.' },
        ],
        useCases: [
            { title: 'Two-phone interviews', detail: 'Wide on one phone, close on the other, plus a recorder — the clap spike syncs all three in one pass.' },
            { title: 'Multi-take solo shoots', detail: 'Take numbers on the slate mean the 30-second best take is findable without watching everything back.' },
            { title: 'Separate audio recorder workflows', detail: 'Camera mic for reference, recorder for quality: the clap gives the editor the exact alignment point.' },
        ],
        faqs: [
            { q: 'Why use a slate when cameras record audio anyway?', a: 'Because aligning separate recorders by drift and guesswork is misery, and a sharp clap spike is unambiguous on every waveform. Slate once and every track locks at the same frame.' },
            { q: 'Does the slate make sound, or just show a visual?', a: 'Both — the clap produces a sharp audio spike for recorders and a visual stick closure for cameras, so you can sync on whichever signal your gear captured.' },
            { q: 'Can it replace my camera\u2019s audio?', a: 'No, and it is not meant to. The slate is the alignment reference; your microphones do the recording. The level meters simply confirm your recorder is capturing before the take starts.' },
            { q: 'Does it work on a phone screen in daylight?', a: 'Yes — the display uses high-contrast large type designed to read on camera outdoors. The classic trick of tilting the slate to catch light still helps in direct sun.' },
            { q: 'Is take logging saved?', a: 'Yes, on your device — the session\u2019s take list with good/bad marks is there when you wrap, ready for the edit.' },
        ],
        related: [
            { label: 'Studio Teleprompter', href: '/teleprompter', note: 'Script and slate together' },
            { label: 'Auto Captions', href: '/auto-captions', note: 'Caption the synced edit' },
        ],
    },

    '/color-gradient': {
        heading: 'About the Gradient & Palette Studio',
        intro: [
            'The Gradient & Palette Studio builds gradients and color schemes and — the part every other tool skips — lets you test them live on a real website preview before you commit. Adjust stops and angles, then watch your gradient applied to a hero section, buttons and cards, because a gradient that looks perfect in a swatch can fall apart the moment text sits on it.',
            'Palettes can arrive from the Palette Extractor in one click or be built by hand with contrast-safe suggestions. Export CSS the moment it looks right — the code you copy is the code you previewed.',
        ],
        steps: [
            { title: 'Start a gradient or palette', detail: 'Pick colors manually or import a palette extracted from a photo in the Palette Extractor.' },
            { title: 'Shape it', detail: 'Move stops, change angles, build mesh-style blends — the preview updates instantly as you work.' },
            { title: 'Test it on a real page', detail: 'The live website preview applies your gradient to a hero, buttons and cards so contrast and mood are judged in context, not in isolation.' },
            { title: 'Export the CSS', detail: 'Copy production-ready CSS for the exact gradient you previewed — no translating from a screenshot.' },
        ],
        useCases: [
            { title: 'Brand look for a landing page', detail: 'Build the hero gradient, check real text contrast on it, and ship the CSS — the full loop in one screen.' },
            { title: 'Matching video covers to a channel brand', detail: 'Settle on one gradient, reuse it across thumbnails and covers for a channel that looks intentional.' },
            { title: 'Client mood boards', detail: 'Show palettes on a realistic page instead of floating swatches — decisions get faster when clients see context.' },
        ],
        faqs: [
            { q: 'Why test gradients on a page preview?', a: 'Because contrast and perception change with context: a gradient that reads elegantly in a swatch can render text unreadable on a hero. Testing in context catches that before your users do.' },
            { q: 'What is a mesh gradient?', a: 'A multi-point gradient blend that flows in more than one direction, producing the soft, cloud-like backgrounds popular in modern design. The studio\u2019s mesh controls create them without hand-writing CSS.' },
            { q: 'Does it check accessibility contrast?', a: 'The preview makes contrast visible with real text, which is the practical check designers use; pair it with your platform\u2019s audit tool for formal WCAG numbers.' },
            { q: 'Can I use these gradients commercially?', a: 'Yes — exported CSS is yours, no attribution, no license terms. Gradients and color schemes are not copyrightable.' },
            { q: 'How do palettes from the extractor get here?', a: 'One click in the Palette Extractor sends its palette into the studio — the colors arrive as editable stops, not a screenshot to copy from.' },
        ],
        related: [
            { label: 'Palette Extractor', href: '/palette-extractor', note: 'Pull colors from photos' },
            { label: 'Brand Kit', href: '/brand-kit', note: 'Save your scheme' },
        ],
    },

    '/brand-kit': {
        heading: 'About the Brand Kit',
        intro: [
            'The Brand Kit is your creator identity, saved once and applied everywhere: logo, brand colors, fonts, mobile-money and bank details. Fill it in a single time and every consuming tool — invoices, receipts, watermarks, resizer exports — opens pre-filled with your details instead of asking for them again.',
            'The kit lives on your device in browser storage, travels with the suite\u2019s device-transfer feature, and is fully viewable and deletable at /your-data. It is plumbing, deliberately: you should ever think about it exactly twice — when you set it up, and never again.',
        ],
        steps: [
            { title: 'Open the Brand Kit', detail: 'From the Business Suite or /your-data — no account, no email, nothing to sign.' },
            { title: 'Save your identity', detail: 'Logo, colors, default fonts, and the payment details that belong on invoices: MoMo merchant info, bank accounts.' },
            { title: 'Use any tool', detail: 'Invoices, receipts, watermarks and resizer exports read the kit automatically — pre-filled is the default state.' },
            { title: 'Update it once', detail: 'Change your handle or bank details in the kit and every tool picks it up on the next use — no per-tool editing.' },
        ],
        useCases: [
            { title: 'Freelancers who invoice regularly', detail: 'Payment details appear on every invoice without retyping — the difference between sending the invoice in 2 minutes or 20.' },
            { title: 'Teams with consistent branding', detail: 'Set the colors and logo once; every watermark, export and document matches without a brand manual.' },
            { title: 'Device migration', detail: 'The kit rides the suite\u2019s device-transfer flow, so a new phone starts where the old one stopped.' },
        ],
        faqs: [
            { q: 'Where is my Brand Kit stored?', a: 'In your browser\u2019s local storage on your own device. It is never uploaded, and you can view, export or delete every byte of it at /your-data.' },
            { q: 'Do I need an account?', a: 'No. The suite has no accounts at all — the kit is device-local by design, which is also why it can be honest about privacy.' },
            { q: 'Which tools read the Brand Kit?', a: 'The Business Suite documents (invoices, receipts, letterheads) and the watermark and resizer export tools. More tools adopt it as they grow pre-fill support.' },
            { q: 'Is my payment information safe?', a: 'The details the kit stores are the ones you already print on every invoice — name, MoMo number, bank account. They sit on your device and only ever appear in documents you export.' },
            { q: 'Can I have separate identities for separate brands?', a: 'The kit holds one active identity at a time; switching brands means updating the kit, which every tool then follows. Multi-profile support is on the roadmap.' },
        ],
        related: [
            { label: 'Business & Legal Suite', href: '/business', note: 'The kit\u2019s biggest consumer' },
            { label: 'Your Data', href: '/your-data', note: 'See and manage storage' },
        ],
    },
};

/** Lookup helper — returns content for an exact tool href, else undefined. */
export function contentForTool(pathname: string | null): ToolContent | undefined {
    if (!pathname) return undefined;
    return TOOL_CONTENT[pathname.split('?')[0]];
}
