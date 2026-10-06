import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';

export default function PageNotFound() {
  const location = useLocation();
  const { me } = useAuth();
  const pageName = location.pathname.substring(1);

  const { data: authData, isFetched } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const user = await me();
        return { user, isAuthenticated: true };
      } catch {
        return { user: null, isAuthenticated: false };
      }
    }
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="bg-sidebar px-5 py-4 sm:px-8">
        <img src="/koach-logo-white.png" alt="KOACH" className="h-6 w-auto" />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        <p className="num text-[64px] leading-none text-muted-foreground/40">404</p>
        <h1 className="mt-3 text-[32px] leading-tight text-foreground">There's no page here.</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          <span className="font-mono text-[13px] text-foreground">/{pageName}</span> doesn't exist. The link may be old or mistyped.
        </p>

        {/* Admin note */}
        {isFetched && authData?.isAuthenticated && authData.user?.role === 'admin' && (
          <div className="panel mt-6 p-4">
            <p className="text-sm font-semibold text-foreground">Admin note</p>
            <p className="mt-0.5 text-sm text-muted-foreground">This page hasn't been built yet.</p>
          </div>
        )}

        <button
          onClick={() => window.location.href = '/'}
          className="mt-6 inline-flex h-11 w-fit items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/85"
        >
          Go to Today
        </button>
      </main>
    </div>
  );
}
