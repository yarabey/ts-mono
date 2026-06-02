import { useUiStore } from '../stores/ui-store';
import { useGreeting } from '@acme/sample-data-access';
import { formatGreeting } from '@acme/sample-domain';

export function GreetingPage() {
  const { name, locale, setName } = useUiStore();
  const { data, isLoading, isError } = useGreeting(name, locale);
  const localGreeting = formatGreeting('Hello from browser, {name}!', name);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Sample Walking Skeleton</h1>

      <section>
        <h2>Local (in-browser) Greeting</h2>
        <p>{localGreeting}</p>
      </section>

      <section>
        <h2>Backend (Postgres-backed) Greeting</h2>
        <div style={{ marginBottom: '1rem' }}>
          <label>
            Name:{' '}
            <input
              data-testid="name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        </div>
        {isLoading && <p>Loading...</p>}
        {isError && <p role="alert">Something went wrong.</p>}
        {data && <p data-testid="backend-greeting">{data.message}</p>}
      </section>
    </div>
  );
}
