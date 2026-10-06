import { QueryCache, QueryClient, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';
import { reportError } from '@/lib/errorReporting';
import { userMessage, withReference } from '@/lib/appErrors';

/**
 * Failures are never silent:
 *  - a mutation without its own onError gets a plain-language toast (most save
 *    buttons in the app relied on this never happening);
 *  - a background refetch that fails while data is already on screen gets a
 *    toast (the stale data stays visible); first-load failures are left to the
 *    screen's own error state.
 * Both are reported to error monitoring.
 */
export const queryClientInstance = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			reportError(error, { source: 'query', fn: String(query.queryKey?.[0] ?? '') });
			if (query.state.data !== undefined) {
				toast.error(withReference("Couldn't refresh. Showing the last data we loaded.", error));
			}
		},
	}),
	mutationCache: new MutationCache({
		onError: (error, _vars, _ctx, mutation) => {
			reportError(error, { source: 'mutation', fn: String(mutation.options.mutationKey?.[0] ?? '') });
			if (mutation.options.onError) return; // the screen handles it
			toast.error(withReference(userMessage(error, "We couldn't save that. Your changes are still here. Please try again."), error));
		},
	}),
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});
