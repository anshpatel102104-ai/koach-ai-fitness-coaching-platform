// Supabase Edge Function: savePushSubscription  (Migration Step 5e)
// See _shared/pushSubscription.js for the reconciliation of Base44's
// duplicate save/store pair into one real handler.
import { handleSaveSubscription } from '../_shared/pushSubscription.js';
import { serve } from '../_shared/observe.js';

serve('savePushSubscription', handleSaveSubscription);
