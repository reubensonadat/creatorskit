import { redirect } from 'next/navigation';

export default function AgreementPage() {
  redirect('/business?tab=agreement');
}
