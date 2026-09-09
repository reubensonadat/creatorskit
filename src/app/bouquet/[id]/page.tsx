import BouquetViewer from './bouquet-viewer';

export const runtime = 'edge';

export const metadata = {
    title: 'Digital Bouquet · 3D QR Gift | CreatorsKit',
    description: 'A personalized 3D scannable diorama gift card created with CreatorsKit.',
};

export default function BouquetPage() {
    return <BouquetViewer />;
}
