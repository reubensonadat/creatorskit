import { redirect } from 'next/navigation';

export default function ReceiptPage() {
  redirect('/business?tab=receipt');
}
