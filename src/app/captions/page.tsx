import { permanentRedirect } from 'next/navigation';

// permanentRedirect (308) instead of redirect (307): /captions is a legacy
// alias of /auto-captions — search engines should consolidate every signal
// on the canonical tool URL, not keep re-fetching a temporary hop.
export default function CaptionsRedirectPage() {
    permanentRedirect('/auto-captions');
}
