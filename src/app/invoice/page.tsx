import { redirect } from 'next/navigation';

export default function InvoicePage() {
  redirect('/business?tab=invoice');
}
