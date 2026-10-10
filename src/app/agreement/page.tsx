import { permanentRedirect } from 'next/navigation';

// permanentRedirect (308): /agreement is a legacy alias of the Business
// Suite agreement tab — consolidate all ranking signals there.
export default function AgreementPage() {
  permanentRedirect('/business?tab=agreement');
}
