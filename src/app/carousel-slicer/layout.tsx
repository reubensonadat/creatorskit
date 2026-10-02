import type { Metadata } from 'next';
import { toolMetadata, buildKeywords, softwareAppJsonLd, breadcrumbJsonLd, jsonLd } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'Carousel Slicer — Split Wide Images into Seamless Posts | CreatorsKit',
    description:
        'Slice wide panoramic graphics into perfectly seamless multi-slide Instagram and LinkedIn carousels. Free, instant, no signup.',
    path: '/carousel-slicer',
    keywords: buildKeywords(
        [
            'carousel maker',
            'instagram carousel',
            'carousel slicer',
            'split image into slides',
            'linkedin carousel',
            'seamless carousel post',
            'panorama splitter',
            'multi slide post maker',
            'slice image for instagram',
            'carousel post creator',
            'swipe post maker',
        ],
        [
            'split wide image instagram',
            'instagram carousel maker free',
            'linkedin document post maker',
            'seamless swipe post',
            'carousel grid splitter',
            'panorama to carousel',
            '1 slide to 5 slides',
            'image slicer online',
            'cut image into pieces instagram',
            'carousel no signup',
            'swipeable post maker',
            'engagement post maker',
            'instagram growth tool free',
            'batch carousel maker',
            'content creator carousel',
            'pdf carousel alternative',
            'photo strip maker',
            'slide post planner',
            'wide banner slicer',
            'thread image splitter',
            'continuous carousel design',
            'carousel cover slide',
            '10 slide carousel maker',
        ],
    ),
});

const lds = [
    softwareAppJsonLd({
        name: 'CreatorsKit Carousel Slicer',
        description:
            'Free tool that slices wide panoramic graphics into perfectly seamless multi-slide Instagram and LinkedIn carousel posts.',
        path: '/carousel-slicer',
        featureList: [
            'Wide image → multi-slide carousel',
            'Pixel-perfect seamless slides',
            'Instagram & LinkedIn presets',
            'Instant export of all slides',
            'Runs entirely in your browser',
        ],
    }),
    breadcrumbJsonLd('/carousel-slicer', 'Carousel Slicer'),
];

export default function CarouselSlicerLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
