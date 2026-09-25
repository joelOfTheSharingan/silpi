import { useState } from 'react';
import { supabase } from '../supabaseClient.js';

export default function SignIn({ onBack }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const google = async () => {
    setErr(null); setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setErr(error.message);
    setBusy(false);
  };

  const magic = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setErr(null); setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) setErr(error.message);
    else setSent(true);
    setBusy(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-page)', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--surface-card)', border: '1px solid var(--border-hairline)', padding: 'clamp(18px, 4vw, 32px)' }}>
        <div style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)' }}>silpi Architects</div>
        <h1 style={{ font: '500 28px var(--font-serif-display)', color: 'var(--text-heading)', margin: '6px 0 8px' }}>Sign in</h1>
        <p style={{ font: '13px var(--font-sans)', color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
          Use the Google account enabled in Supabase → Auth → Providers. Magic link works without extra config.
        </p>

        <button onClick={google} disabled={busy} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#fff', color: '#1a1a1a', border: '1px solid rgba(44,34,27,0.18)', padding: '12px 16px', minHeight: 44, font: '600 13px var(--font-sans)', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
          <span style={{ fontSize: 16 }}>G</span> Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0', color: 'var(--text-muted)', font: '11px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <span style={{ flex: 1, height: 1, background: 'var(--border-hairline)' }} /> or <span style={{ flex: 1, height: 1, background: 'var(--border-hairline)' }} />
        </div>

        <form onSubmit={magic} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" type="email" style={{ font: '16px var(--font-sans)', padding: '11px 12px', border: '1px solid rgba(44,34,27,0.18)', background: '#fff', color: 'var(--text-heading)', width: '100%' }} />
          <button type="submit" disabled={busy || !email.trim()} style={{ background: 'var(--clay-600)', color: 'var(--cream-50)', border: 'none', padding: '12px 16px', minHeight: 44, font: '600 12px var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            Send magic link
          </button>
        </form>

        {sent && <div style={{ marginTop: 12, background: '#eef6ee', border: '1px solid #c2e0c2', padding: '10px 12px', font: '13px var(--font-sans)', color: '#2a5a2a' }}>Check your email for the sign-in link.</div>}
        {err && <div style={{ marginTop: 12, background: '#fdf1ec', border: '1px solid #e8b4a0', padding: '10px 12px', font: '13px var(--font-sans)', color: '#7a2e1a' }}>{err}</div>}

        <div style={{ marginTop: 18, font: '12px var(--font-sans)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Supabase → Settings → API: Exposed schemas = <code>public</code> only.<br />
          Supabase → Auth → URL Configuration: Site URL = <code>{typeof window !== 'undefined' ? window.location.origin : ''}</code> and add it to Redirect URLs.
        </div>

        {onBack && <button onClick={onBack} style={{ marginTop: 16, background: 'transparent', border: 'none', color: 'var(--accent)', font: '600 12px var(--font-sans)', cursor: 'pointer' }}>← Back (dev: view without sign-in)</button>}
      </div>
    </div>
  );
}
