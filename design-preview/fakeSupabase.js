/**
 * In-memory fake of the supabase-js client surface used by
 * src/api/supabaseClient.js (and src/lib/storageUrls.js).
 *
 * Design-preview only — never imported by the production app. Injected via the
 * facade's `__setSupabaseClientForTests(client)` seam in design-preview/main.jsx.
 *
 *   createFakeSupabase({ store, persona, users, functionHandlers })
 *
 * - store: { [table]: row[] } — mutated in place by insert/update/delete so UI
 *   interactions (mark read, save, create) behave.
 * - persona: { kind: 'coach'|'client'|'anon', userId, clientId }
 *   'client' applies a tiny RLS-like scope: client-scoped tables only return
 *   that client's rows (mirrors what the portal would see).
 * - users: { [userId]: authUser } — used by getUser/getSession.
 */

// Portal views read through to their base tables.
const VIEW_ALIASES = {
  check_ins_portal_view: 'check_ins',
  coaching_sessions_portal_view: 'coaching_sessions',
  clients_portal_view: 'clients',
};

const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

let idCounter = 0;
export function fakeUuid() {
  idCounter += 1;
  const rand = Math.random().toString(16).slice(2, 14).padEnd(12, '0');
  return `f0000000-0000-4000-8000-${(rand + idCounter.toString(16)).slice(-12)}`;
}

// ---- value comparison helpers ----------------------------------------------
function cmp(a, b) {
  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' || typeof b === 'boolean') return Number(a) - Number(b);
  return String(a).localeCompare(String(b));
}
const looseEq = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a === 'boolean' || typeof b === 'boolean') return String(a) === String(b);
  return String(a) === String(b);
};
const likeToRegex = (pattern, flags) =>
  new RegExp('^' + String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', flags);

function parseOrExpr(expr) {
  // "name.ilike.%foo%,email.eq.x" -> list of predicates (OR'd)
  return String(expr).split(',').map((part) => {
    const [col, op, ...rest] = part.split('.');
    const val = rest.join('.');
    return (row) => applyOp(row[col], op, val);
  });
}

function applyOp(v, op, val) {
  switch (op) {
    case 'eq': return looseEq(v, val);
    case 'neq': return !looseEq(v, val);
    case 'gt': return v != null && cmp(v, val) > 0;
    case 'gte': return v != null && cmp(v, val) >= 0;
    case 'lt': return v != null && cmp(v, val) < 0;
    case 'lte': return v != null && cmp(v, val) <= 0;
    case 'like': return v != null && likeToRegex(val).test(String(v));
    case 'ilike': return v != null && likeToRegex(val, 'i').test(String(v));
    case 'is': return val === null || val === 'null' ? v == null : looseEq(v, val);
    case 'in': {
      const arr = Array.isArray(val) ? val : String(val).replace(/^\(|\)$/g, '').split(',');
      return arr.some((x) => looseEq(v, x));
    }
    case 'cs':
    case 'contains': {
      const want = Array.isArray(val) ? val : [val];
      return Array.isArray(v) && want.every((w) => v.some((x) => looseEq(x, w)));
    }
    case 'ov':
    case 'overlaps': {
      const want = Array.isArray(val) ? val : [val];
      return Array.isArray(v) && want.some((w) => v.some((x) => looseEq(x, w)));
    }
    default:
      return true;
  }
}

// ---- query builder -----------------------------------------------------------
function createBuilder(ctx, rawTable) {
  const table = VIEW_ALIASES[rawTable] || rawTable;
  const state = {
    op: 'select',
    filters: [],
    orders: [],
    limit: null,
    range: null,
    single: false,
    maybe: false,
    payload: null,
    returning: false,
    count: null,
    head: false,
    upsert: false,
    onConflict: null,
  };

  const addFilter = (fn) => { state.filters.push(fn); return api; };

  const api = {
    select(_cols, opts = {}) {
      if (state.op !== 'select') state.returning = true;
      if (opts.count) state.count = opts.count;
      if (opts.head) state.head = true;
      return api;
    },
    insert(payload) { state.op = 'insert'; state.payload = payload; return api; },
    upsert(payload, opts = {}) { state.op = 'insert'; state.upsert = true; state.onConflict = opts.onConflict || 'id'; state.payload = payload; return api; },
    update(payload) { state.op = 'update'; state.payload = payload; return api; },
    delete() { state.op = 'delete'; return api; },

    eq: (c, v) => addFilter((r) => applyOp(r[c], 'eq', v)),
    neq: (c, v) => addFilter((r) => applyOp(r[c], 'neq', v)),
    gt: (c, v) => addFilter((r) => applyOp(r[c], 'gt', v)),
    gte: (c, v) => addFilter((r) => applyOp(r[c], 'gte', v)),
    lt: (c, v) => addFilter((r) => applyOp(r[c], 'lt', v)),
    lte: (c, v) => addFilter((r) => applyOp(r[c], 'lte', v)),
    like: (c, v) => addFilter((r) => applyOp(r[c], 'like', v)),
    ilike: (c, v) => addFilter((r) => applyOp(r[c], 'ilike', v)),
    is: (c, v) => addFilter((r) => applyOp(r[c], 'is', v)),
    in: (c, v) => addFilter((r) => applyOp(r[c], 'in', v)),
    contains: (c, v) => addFilter((r) => applyOp(r[c], 'contains', v)),
    overlaps: (c, v) => addFilter((r) => applyOp(r[c], 'overlaps', v)),
    match: (obj) => { for (const [c, v] of Object.entries(obj || {})) addFilter((r) => looseEq(r[c], v)); return api; },
    filter: (c, op, v) => addFilter((r) => applyOp(r[c], op, v)),
    not: (c, op, v) => addFilter((r) => !applyOp(r[c], op, v)),
    or: (expr) => { const preds = parseOrExpr(expr); return addFilter((r) => preds.some((p) => p(r))); },
    textSearch: (c, q) => addFilter((r) => String(r[c] ?? '').toLowerCase().includes(String(q).toLowerCase())),

    order(col, { ascending = true, nullsFirst } = {}) {
      state.orders.push({ col, ascending, nullsFirst: nullsFirst ?? !ascending });
      return api;
    },
    limit(n) { state.limit = n; return api; },
    range(from, to) { state.range = [from, to]; return api; },
    single() { state.single = true; return api; },
    maybeSingle() { state.maybe = true; return api; },
    abortSignal() { return api; },
    returns() { return api; },
    csv() { return api; },

    then(resolve, reject) {
      let result;
      try {
        result = execute(ctx, table, state);
      } catch (e) {
        result = { data: null, error: { message: e.message, code: 'FAKE' }, count: null, status: 500 };
      }
      // Resolve async like a network call so React Query behaves realistically.
      return new Promise((r) => setTimeout(() => r(result), ctx.latencyMs)).then(resolve, reject);
    },
    catch(reject) { return api.then(undefined, reject); },
    finally(fn) { return api.then((v) => { fn?.(); return v; }, (e) => { fn?.(); throw e; }); },
  };
  return api;
}

function scopeRows(ctx, table, rows) {
  const p = ctx.persona;
  if (!p || p.kind !== 'client' || !p.clientId) return rows;
  if (table === 'clients') return rows.filter((r) => r.id === p.clientId);
  if (table === 'notifications') return rows.filter((r) => r.recipient_id === p.userId);
  if (rows.length && Object.prototype.hasOwnProperty.call(rows[0], 'client_id')) {
    // client-scoped table — portal sees only its own rows
    return rows.filter((r) => r.client_id === p.clientId || r.client_id == null);
  }
  return rows;
}

function sortRows(rows, orders) {
  if (!orders.length) return rows;
  return [...rows].sort((a, b) => {
    for (const { col, ascending, nullsFirst } of orders) {
      const av = a[col];
      const bv = b[col];
      if (av == null && bv == null) continue;
      if (av == null) return nullsFirst ? -1 : 1;
      if (bv == null) return nullsFirst ? 1 : -1;
      const c = cmp(av, bv);
      if (c !== 0) return ascending ? c : -c;
    }
    return 0;
  });
}

function finish(state, rows) {
  const count = rows.length;
  let out = rows;
  if (state.range) out = out.slice(state.range[0], state.range[1] + 1);
  if (state.limit != null) out = out.slice(0, state.limit);
  out = clone(out);
  if (state.head) return { data: null, error: null, count, status: 200 };
  if (state.single) {
    if (out.length !== 1) {
      return { data: null, error: { message: `JSON object requested, multiple (or no) rows returned (${out.length})`, code: 'PGRST116' }, count, status: 406 };
    }
    return { data: out[0], error: null, count, status: 200 };
  }
  if (state.maybe) {
    if (out.length > 1) return { data: null, error: { message: 'multiple rows returned', code: 'PGRST116' }, count, status: 406 };
    return { data: out[0] ?? null, error: null, count, status: 200 };
  }
  return { data: out, error: null, count: state.count ? count : null, status: 200 };
}

function execute(ctx, table, state) {
  const store = ctx.store;
  if (!store[table]) store[table] = [];
  const all = store[table];
  const now = new Date().toISOString();
  const match = (r) => state.filters.every((f) => f(r));

  if (state.op === 'select') {
    const rows = sortRows(scopeRows(ctx, table, all).filter(match), state.orders);
    return finish(state, rows);
  }

  if (state.op === 'insert') {
    const payloads = Array.isArray(state.payload) ? state.payload : [state.payload];
    const created = [];
    for (const p of payloads) {
      const key = state.onConflict || 'id';
      const existing = state.upsert && p?.[key] != null ? all.find((r) => looseEq(r[key], p[key])) : null;
      if (existing) {
        Object.assign(existing, clone(p), { updated_at: now });
        created.push(existing);
        ctx.emit(table, 'UPDATE', existing);
      } else {
        const row = {
          id: fakeUuid(),
          created_at: now,
          updated_at: now,
          created_by: ctx.persona?.userId ?? null,
          ...clone(p),
        };
        all.unshift(row);
        created.push(row);
        ctx.emit(table, 'INSERT', row);
      }
    }
    ctx.onWrite?.(table, 'insert', created);
    return finish({ ...state, single: state.single, maybe: state.maybe }, state.returning || state.single || state.maybe ? created : []);
  }

  if (state.op === 'update') {
    const rows = scopeRows(ctx, table, all).filter(match);
    for (const r of rows) {
      Object.assign(r, clone(state.payload), { updated_at: now });
      ctx.emit(table, 'UPDATE', r);
    }
    ctx.onWrite?.(table, 'update', rows);
    return finish(state, state.returning || state.single || state.maybe ? rows : []);
  }

  if (state.op === 'delete') {
    const rows = scopeRows(ctx, table, all).filter(match);
    store[table] = all.filter((r) => !rows.includes(r));
    for (const r of rows) ctx.emit(table, 'DELETE', r);
    ctx.onWrite?.(table, 'delete', rows);
    return finish(state, state.returning ? rows : []);
  }

  return { data: null, error: { message: `unsupported op ${state.op}` } };
}

// ---- storage -------------------------------------------------------------------
function placeholderImage(label = 'Photo', hue = 215) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue},18%,86%)"/><stop offset="1" stop-color="hsl(${hue},14%,70%)"/></linearGradient></defs>
<rect width="600" height="800" fill="url(#g)"/>
<g fill="hsl(${hue},10%,58%)"><circle cx="300" cy="230" r="70"/><path d="M180 760c0-170 40-330 120-330s120 160 120 330z"/></g>
<text x="300" y="70" font-family="system-ui,sans-serif" font-size="30" font-weight="600" text-anchor="middle" fill="hsl(${hue},12%,40%)">${label}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function signedUrlFor(path) {
  const p = String(path || '').toLowerCase();
  if (/\.(mp4|mov|webm)$/.test(p)) return 'data:video/mp4;base64,';
  if (/\.pdf$/.test(p)) return 'data:application/pdf;base64,';
  const label = p.includes('front') ? 'Front' : p.includes('side') ? 'Side' : p.includes('back') ? 'Back' : 'Photo';
  const hue = label === 'Front' ? 210 : label === 'Side' ? 160 : label === 'Back' ? 30 : 260;
  return placeholderImage(label, hue);
}

function createStorage(ctx) {
  return {
    from(bucket) {
      return {
        async upload(path, file) {
          ctx.uploads[`${bucket}/${path}`] = file;
          return { data: { path, id: fakeUuid(), fullPath: `${bucket}/${path}` }, error: null };
        },
        getPublicUrl(path) {
          const file = ctx.uploads[`${bucket}/${path}`];
          let publicUrl = signedUrlFor(path);
          try { if (file && typeof URL !== 'undefined' && URL.createObjectURL) publicUrl = URL.createObjectURL(file); } catch { /* ignore */ }
          return { data: { publicUrl } };
        },
        async createSignedUrl(path) {
          const file = ctx.uploads[`${bucket}/${path}`];
          let signedUrl = signedUrlFor(path);
          try { if (file && URL.createObjectURL) signedUrl = URL.createObjectURL(file); } catch { /* ignore */ }
          return { data: { signedUrl, path }, error: null };
        },
        async createSignedUrls(paths) {
          return { data: paths.map((path) => ({ path, signedUrl: signedUrlFor(path), error: null })), error: null };
        },
        async download(path) { return { data: ctx.uploads[`${bucket}/${path}`] ?? new Blob([]), error: null }; },
        async remove(paths) { for (const p of paths || []) delete ctx.uploads[`${bucket}/${p}`]; return { data: [], error: null }; },
        async list() { return { data: [], error: null }; },
      };
    },
  };
}

// ---- realtime -------------------------------------------------------------------
function createRealtime(ctx) {
  const channels = new Set();
  ctx.emit = (table, eventType, row) => {
    for (const ch of channels) {
      for (const h of ch.handlers) {
        if (h.filter?.table && h.filter.table !== table && VIEW_ALIASES[h.filter.table] !== table) continue;
        if (h.filter?.event && h.filter.event !== '*' && h.filter.event !== eventType) continue;
        const payload = {
          eventType,
          schema: 'public',
          table,
          new: eventType === 'DELETE' ? {} : clone(row),
          old: eventType === 'DELETE' ? clone(row) : {},
        };
        setTimeout(() => { try { h.cb(payload); } catch (e) { console.error(e); } }, 0);
      }
    }
  };
  return {
    channel(name) {
      const ch = {
        name,
        handlers: [],
        on(_type, filter, cb) { ch.handlers.push({ filter, cb }); return ch; },
        subscribe(cb) { channels.add(ch); setTimeout(() => cb?.('SUBSCRIBED'), 0); return ch; },
        unsubscribe() { channels.delete(ch); return Promise.resolve('ok'); },
        send() { return Promise.resolve('ok'); },
        track() { return Promise.resolve('ok'); },
        presenceState() { return {}; },
      };
      return ch;
    },
    removeChannel(ch) { channels.delete(ch); return Promise.resolve('ok'); },
    removeAllChannels() { channels.clear(); return Promise.resolve([]); },
    getChannels() { return [...channels]; },
  };
}

// ---- auth ------------------------------------------------------------------------
function createAuth(ctx) {
  const listeners = new Set();
  const currentUser = () => (ctx.persona?.userId ? ctx.users[ctx.persona.userId] ?? null : null);
  const session = () => {
    const user = currentUser();
    return user ? { user, access_token: 'fake-access-token', refresh_token: 'fake-refresh', expires_in: 3600, token_type: 'bearer' } : null;
  };
  const notify = (event) => { for (const cb of listeners) setTimeout(() => cb(event, session()), 0); };
  return {
    async getUser() { return { data: { user: currentUser() }, error: null }; },
    async getSession() { return { data: { session: session() }, error: null }; },
    onAuthStateChange(cb) {
      listeners.add(cb);
      return { data: { subscription: { id: fakeUuid(), unsubscribe: () => listeners.delete(cb) } } };
    },
    async signInWithPassword({ email }) {
      const found = Object.values(ctx.users).find((u) => u.email?.toLowerCase() === String(email || '').toLowerCase());
      const persona = ctx.setPersona?.(found?.app_metadata?.persona || 'coach');
      notify('SIGNED_IN');
      return { data: { user: currentUser(), session: session(), persona }, error: null };
    },
    async signUp({ email }) {
      return { data: { user: { id: fakeUuid(), email }, session: null }, error: null };
    },
    async signOut() {
      ctx.setPersona?.('anon');
      notify('SIGNED_OUT');
      return { error: null };
    },
    async resetPasswordForEmail() { return { data: {}, error: null }; },
    async updateUser(attrs) { return { data: { user: { ...currentUser(), ...attrs } }, error: null }; },
    async refreshSession() { return { data: { session: session() }, error: null }; },
    async exchangeCodeForSession() { return { data: { session: session() }, error: null }; },
    async setSession() { return { data: { session: session() }, error: null }; },
    async verifyOtp() { return { data: { session: session() }, error: null }; },
  };
}

// ---- functions -------------------------------------------------------------------
function createFunctions(ctx) {
  return {
    async invoke(name, { body } = {}) {
      await new Promise((r) => setTimeout(r, ctx.latencyMs * 3));
      const handler = ctx.functionHandlers?.[name];
      try {
        const data = typeof handler === 'function' ? await handler(body ?? {}, ctx) : (handler ?? {});
        return { data: clone(data), error: null };
      } catch (e) {
        return { data: null, error: { message: e.message, context: null } };
      }
    },
    setAuth() {},
  };
}

export function createFakeSupabase({ store, persona, users = {}, functionHandlers = {}, setPersona, onWrite, latencyMs = 15 } = {}) {
  const ctx = {
    store,
    persona,
    users,
    functionHandlers,
    uploads: {},
    latencyMs,
    onWrite,
    emit: () => {},
  };
  ctx.setPersona = (kind) => {
    const next = setPersona?.(kind);
    if (next) ctx.persona = next;
    return ctx.persona;
  };
  const realtime = createRealtime(ctx);
  const client = {
    from: (table) => createBuilder(ctx, table),
    schema: () => client,
    rpc: async (fn, args) => {
      const handler = functionHandlers[`rpc:${fn}`];
      const data = typeof handler === 'function' ? await handler(args ?? {}, ctx) : (handler ?? null);
      return { data: clone(data), error: null };
    },
    auth: createAuth(ctx),
    functions: createFunctions(ctx),
    storage: createStorage(ctx),
    channel: realtime.channel,
    removeChannel: realtime.removeChannel,
    removeAllChannels: realtime.removeAllChannels,
    getChannels: realtime.getChannels,
    realtime: { setAuth() {} },
    __ctx: ctx,
  };
  return client;
}
