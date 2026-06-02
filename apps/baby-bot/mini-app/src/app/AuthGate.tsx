import { useEffect, useState, type ReactNode } from 'react';
import {
  api,
  getStoredAccessCode,
  getToken,
  setStoredAccessCode,
  setToken,
  setUnauthorizedHandler,
} from '@acme/baby-bot-data-access';
import { AuthResponseSchema } from '@acme/baby-bot-domain';
import { LoadingButton } from '@acme/baby-bot-ui';

type Status = 'checking' | 'authed' | 'login';

/** Authenticates via Telegram initData or access code, attaches the JWT, and
 * falls back to the code form on 401 (re-auth) per the mini-app spec. */
export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const authWithCode = async (value: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = AuthResponseSchema.parse(await api.auth.code(value));
      setToken(res.token);
      setStoredAccessCode(value);
      setStatus('authed');
    } catch (e) {
      setError((e as Error).message || 'Неверный код');
      setStatus('login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    tg?.expand();
    setUnauthorizedHandler(() => setStatus('login'));

    void (async () => {
      const initData = tg?.initData;
      if (initData) {
        try {
          const res = AuthResponseSchema.parse(await api.auth.verify(initData));
          setToken(res.token);
          setStatus('authed');
          return;
        } catch {
          /* fall through to code */
        }
      }
      if (getToken()) {
        setStatus('authed');
        return;
      }
      const saved = getStoredAccessCode();
      if (saved) {
        await authWithCode(saved);
        return;
      }
      setStatus('login');
    })();
  }, []);

  if (status === 'authed') return <>{children}</>;
  if (status === 'checking') return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) void authWithCode(code.trim());
        }}
        style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <h1 style={{ textAlign: 'center' }}>Дневник 🐣</h1>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Код доступа"
          autoFocus
          style={{ minHeight: 44, padding: '0 14px', borderRadius: 12, border: '1px solid var(--bb-border)', fontSize: 16, textAlign: 'center' }}
        />
        {error && <p style={{ color: 'var(--bb-danger)', textAlign: 'center', margin: 0 }}>{error}</p>}
        <LoadingButton type="submit" loading={loading} disabled={!code.trim()}>
          Войти
        </LoadingButton>
      </form>
    </div>
  );
}
