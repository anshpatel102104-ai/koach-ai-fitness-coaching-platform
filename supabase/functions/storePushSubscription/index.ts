// Supabase Edge Function: storePushSubscription  (Migration Step 5e)
// Base44 duplicate of savePushSubscription (which stored nothing). The
// frontend calls both names; both serve the same shared handler.
import { handleSaveSubscription } from '../_shared/pushSubscription.js';
import { serve } from '../_shared/observe.js';

serve('storePushSubscription', handleSaveSubscription);
