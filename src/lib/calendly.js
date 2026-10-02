const CALENDLY_API = 'https://api.calendly.com';

// SECURITY (S3): the Calendly Personal Access Token must NEVER be read in the
// browser — VITE_* vars are inlined into the production bundle, so reading
// VITE_CALENDLY_TOKEN here shipped a full-account Calendly credential to every
// visitor. There is no server-side Calendly proxy yet, so the direct-from-
// browser integration is disabled until one exists (tracked in
// REMEDIATION_PLAN Phase 9 / integrations). Build a `calendlyProxy` edge
// function (holding CALENDLY_TOKEN in server env, caller-auth + ownership
// scoped) and route these calls through it.
const calendlyRequest = async (_endpoint, _method = 'GET', _body = null) => {
  throw new Error(
    'Calendly is not connected. A server-side Calendly proxy is required — ' +
    'the access token can no longer be used from the browser.',
  );
};

export const getCalendlyUser = () => calendlyRequest('/users/me');

export const getEventTypes = (userUri) =>
  calendlyRequest(`/event_types?user=${encodeURIComponent(userUri)}&active=true`);

export const getScheduledEvents = (userUri, minTime, maxTime) =>
  calendlyRequest(
    `/scheduled_events?user=${encodeURIComponent(userUri)}&min_start_time=${minTime}&max_start_time=${maxTime}&status=active`
  );

export const getEventInvitees = (eventUri) => {
  const uuid = eventUri.split('/').pop();
  return calendlyRequest(`/scheduled_events/${uuid}/invitees`);
};

export const createSingleUseLink = (eventTypeUri, maxUses = 1) =>
  calendlyRequest('/scheduling_links', 'POST', {
    max_event_count: maxUses,
    owner: eventTypeUri,
    owner_type: 'EventType',
  });

// Disabled until a server-side proxy exists (S3). No secret is read in the browser.
export const isCalendlyEnabled = () => false;