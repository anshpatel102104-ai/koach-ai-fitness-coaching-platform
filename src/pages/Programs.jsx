import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Search, SlidersHorizontal, LayoutGrid, List, X } from 'lucide-react';
import { hasFeature } from '@/lib/subscription';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Page, PageHeader, Panel, Segmented, EmptyState } from '@/components/kit';
import { cn } from '@/lib/utils';
import ProgramCard from '../components/programs/ProgramCard';
import ProgramListRow, { PROGRAM_TABLE_COLS, CATEGORY_LABELS, estSessionMins } from '../components/programs/ProgramListRow';
import ProgramDetailModal from '../components/programs/ProgramDetailModal';
import ProgramCreationModal from '../components/programs/ProgramCreationModal';
import ProgramAssignmentModal from '../components/programs/ProgramAssignmentModal';
import IntelligenceBar from '@/components/intelligence/IntelligenceBar';
import LimitBanner from '@/components/subscription/LimitBanner';
import { useUpgradeModal } from '@/components/layout/AppLayout';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';

/* ── Filter options ── */
const DIFFICULTIES  = ['beginner', 'intermediate', 'advanced', 'elite'];
const CATEGORIES    = ['strength', 'hypertrophy', 'fat_loss', 'athletic', 'mobility', 'custom'];
const DURATIONS     = [{ value: '1-4', label: '1 to 4 weeks' }, { value: '5-8', label: '5 to 8 weeks' }, { value: '9-12', label: '9 to 12 weeks' }, { value: '12+', label: 'Over 12 weeks' }];
const FREQUENCIES   = [{ value: '2-3', label: '2 or 3 days' }, { value: '4-5', label: '4 or 5 days' }, { value: '6', label: '6 days' }];
const SESSION_LENS  = [{ value: '0-30', label: 'Under 30 min' }, { value: '30-45', label: '30 to 45 min' }, { value: '45-60', label: '45 to 60 min' }, { value: '60+', label: 'Over 60 min' }];
const SORTS         = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'alphabetical-az', label: 'Name, A to Z' },
  { value: 'alphabetical-za', label: 'Name, Z to A' },
  { value: 'duration-short', label: 'Shortest' },
  { value: 'duration-long', label: 'Longest' },
  { value: 'most-assigned', label: 'Most clients' },
];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ── Filter popover content ── */
function FiltersPanel({ filters, onChange }) {
  const { difficulty, categories, duration, frequency, sessionLength } = filters;

  const toggle = (key, val, multi = false) => {
    if (multi) {
      const arr = filters[key] || [];
      onChange({ [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] });
    } else {
      onChange({ [key]: filters[key] === val ? 'all' : val });
    }
  };

  const Section = ({ label, children }) => (
    <div>
      <p className="mb-2 text-[13px] text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );

  const Chip = ({ label, active, onClick }) => (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-8 rounded-md px-2.5 text-[13px] font-medium transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'border border-input bg-card text-foreground hover:bg-accent'
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="w-80 space-y-4 p-4">
      <Section label="Level">
        {DIFFICULTIES.map(d => (
          <Chip key={d} label={cap(d)} active={difficulty === d} onClick={() => toggle('difficulty', d)} />
        ))}
      </Section>
      <Section label="Goal">
        {CATEGORIES.map(c => (
          <Chip key={c} label={CATEGORY_LABELS[c]} active={(categories || []).includes(c)} onClick={() => toggle('categories', c, true)} />
        ))}
      </Section>
      <Section label="Length">
        {DURATIONS.map(d => (
          <Chip key={d.value} label={d.label} active={duration === d.value} onClick={() => toggle('duration', d.value)} />
        ))}
      </Section>
      <Section label="Days a week">
        {FREQUENCIES.map(f => (
          <Chip key={f.value} label={f.label} active={frequency === f.value} onClick={() => toggle('frequency', f.value)} />
        ))}
      </Section>
      <Section label="Session length">
        {SESSION_LENS.map(s => (
          <Chip key={s.value} label={s.label} active={sessionLength === s.value} onClick={() => toggle('sessionLength', s.value)} />
        ))}
      </Section>
    </div>
  );
}

/* ── Main Page ── */
export default function Programs() {
  const { me } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalMode, setCreateModalMode] = useState(null);

  const openCreateModal = (mode = null) => { setCreateModalMode(mode); setShowCreateModal(true); };
  const [assigningProgram, setAssigningProgram]   = useState(null);
  const [previewingProgram, setPreviewingProgram] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [difficulty, setDifficulty]     = useState('all');
  const [categories, setCategories]     = useState([]);
  const [duration, setDuration]         = useState('all');
  const [frequency, setFrequency]       = useState('all');
  const [sessionLength, setSessionLength] = useState('all');
  const [status, setStatus]             = useState('all');
  const [sort, setSort]                 = useState('newest');
  const [layout, setLayout]             = useState('list');
  const [filterOpen, setFilterOpen]     = useState(false);

  const queryClient = useQueryClient();
  const { openUpgradeModal } = useUpgradeModal();
  const navigate = useNavigate();

  useEffect(() => { me().then(setCurrentUser).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canUseTemplates = hasFeature(currentUser, 'program_templates');

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['programs'],
    queryFn: () => db.entities.WorkoutProgram.list('-created_date'),
  });
  const { data: allClients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list(),
  });
  const { data: allCheckIns = [] } = useQuery({
    queryKey: ['checkins-prog'],
    queryFn: () => db.entities.CheckIn.list('-date', 200),
  });

  // Programs are unlimited on all tiers — no cap enforced
  const atLimit = false;

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.WorkoutProgram.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['programs'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.WorkoutProgram.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['programs'] }); toast.success('Program deleted'); },
  });
  const archiveMutation = useMutation({
    mutationFn: (id) => db.entities.WorkoutProgram.update(id, { is_archived: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['programs'] }); toast.success('Program archived'); },
  });

  const duplicateProgram = (program) => {
    const { id, created_date, updated_date, created_by, ...rest } = program; // eslint-disable-line no-unused-vars
    createMutation.mutate({ ...rest, title: `${rest.title} (Copy)` });
    toast.success('Program duplicated');
  };

  const openBuilder = (program = null) => navigate('/program-builder', { state: { program } });

  const getClientsForProgram = (programId) => {
    const assigned = allClients.filter(c => c.assigned_program_id === programId);
    const inProgress = assigned.filter(c => allCheckIns.some(ci => ci.client_id === c.id));
    return { assigned, inProgress };
  };

  // Active filter count (the status filter lives in the segmented control)
  const activeFilterCount = [
    difficulty !== 'all',
    categories.length > 0,
    duration !== 'all',
    frequency !== 'all',
    sessionLength !== 'all',
  ].filter(Boolean).length;

  // Active filter chips for display
  const activeChips = [
    ...(difficulty !== 'all' ? [{ key: 'difficulty', label: cap(difficulty), onRemove: () => setDifficulty('all') }] : []),
    ...categories.map(c => ({ key: `cat-${c}`, label: CATEGORY_LABELS[c], onRemove: () => setCategories(cs => cs.filter(x => x !== c)) })),
    ...(duration !== 'all'      ? [{ key: 'duration',      label: DURATIONS.find(d => d.value === duration)?.label,        onRemove: () => setDuration('all') }] : []),
    ...(frequency !== 'all'     ? [{ key: 'frequency',     label: FREQUENCIES.find(f => f.value === frequency)?.label,      onRemove: () => setFrequency('all') }] : []),
    ...(sessionLength !== 'all' ? [{ key: 'sessionLength', label: SESSION_LENS.find(s => s.value === sessionLength)?.label, onRemove: () => setSessionLength('all') }] : []),
  ];

  const clearAll = () => {
    setSearchQuery(''); setDifficulty('all'); setCategories([]); setDuration('all');
    setFrequency('all'); setSessionLength('all'); setStatus('all');
  };

  const matchesStatus = (p, s) => {
    if (s === 'all') return true;
    const a = getClientsForProgram(p.id).assigned.length;
    if (s === 'active') return a > 0;
    if (s === 'unassigned') return a === 0;
    if (s === 'archived') return p.is_archived;
    if (s === 'templates') return p.is_template;
    return true;
  };

  const filteredPrograms = useMemo(() => {
    let f = [...programs];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      f = f.filter(p => p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
    }
    if (difficulty !== 'all') f = f.filter(p => p.difficulty === difficulty);
    if (categories.length > 0) f = f.filter(p => categories.includes(p.category));
    if (duration !== 'all') f = f.filter(p => {
      const w = p.duration_weeks || 0;
      if (duration === '1-4') return w >= 1 && w <= 4;
      if (duration === '5-8') return w >= 5 && w <= 8;
      if (duration === '9-12') return w >= 9 && w <= 12;
      if (duration === '12+') return w > 12;
      return true;
    });
    if (frequency !== 'all') f = f.filter(p => {
      const d = p.days_per_week || 0;
      if (frequency === '2-3') return d >= 2 && d <= 3;
      if (frequency === '4-5') return d >= 4 && d <= 5;
      if (frequency === '6') return d === 6;
      return true;
    });
    if (sessionLength !== 'all') f = f.filter(p => {
      const m = estSessionMins(p) || 0;
      if (sessionLength === '0-30') return m < 30;
      if (sessionLength === '30-45') return m >= 30 && m <= 45;
      if (sessionLength === '45-60') return m > 45 && m <= 60;
      if (sessionLength === '60+') return m > 60;
      return true;
    });
    if (status !== 'all') f = f.filter(p => matchesStatus(p, status));
    f.sort((a, b) => {
      if (sort === 'newest') return new Date(b.created_date) - new Date(a.created_date);
      if (sort === 'oldest') return new Date(a.created_date) - new Date(b.created_date);
      if (sort === 'alphabetical-az') return a.title.localeCompare(b.title);
      if (sort === 'alphabetical-za') return b.title.localeCompare(a.title);
      if (sort === 'duration-short') return (a.duration_weeks || 0) - (b.duration_weeks || 0);
      if (sort === 'duration-long') return (b.duration_weeks || 0) - (a.duration_weeks || 0);
      if (sort === 'most-assigned') return getClientsForProgram(b.id).assigned.length - getClientsForProgram(a.id).assigned.length;
      return 0;
    });
    return f;
  }, [programs, searchQuery, difficulty, categories, duration, frequency, sessionLength, status, sort, allClients, allCheckIns]); // eslint-disable-line react-hooks/exhaustive-deps

  const assignedClientCount = allClients.filter(c => c.assigned_program_id).length;
  const statusCount = (s) => programs.filter(p => matchesStatus(p, s)).length;
  const unassignedCount = statusCount('unassigned');
  const templateCount = statusCount('templates');
  const archivedCount = statusCount('archived');

  const statusOptions = [
    { value: 'all', label: 'All', count: programs.length },
    { value: 'active', label: 'Assigned', count: statusCount('active') },
    { value: 'unassigned', label: 'Unassigned', count: unassignedCount },
    ...(templateCount > 0 ? [{ value: 'templates', label: 'Templates', count: templateCount }] : []),
    ...(archivedCount > 0 || status === 'archived' ? [{ value: 'archived', label: 'Archived', count: archivedCount }] : []),
  ];

  const subtitle = programs.length === 0
    ? 'Build a program once, then assign it to as many clients as fit it.'
    : `${programs.length} program${programs.length !== 1 ? 's' : ''}, ${assignedClientCount} client${assignedClientCount !== 1 ? 's' : ''} on one.${unassignedCount > 0 ? ` ${unassignedCount} ${unassignedCount === 1 ? 'isn\'t' : 'aren\'t'} assigned to anyone.` : ''}`;

  const duplicateOrUpgrade = (program) => { if (!canUseTemplates) { openUpgradeModal('program_templates'); return; } duplicateProgram(program); };

  return (
    <Page>
      <PageHeader
        title="Programs"
        subtitle={subtitle}
        actions={
          <>
            <Button variant="outline" onClick={() => { if (atLimit) { openUpgradeModal('clients'); return; } openCreateModal('ai'); }}>
              Generate with AI
            </Button>
            <Button onClick={() => { if (atLimit) { openUpgradeModal('clients'); return; } openBuilder(); }}>
              New program
            </Button>
          </>
        }
      />

      <LimitBanner limitKey="max_programs" currentCount={programs.length} label="programs" featureKey="clients" className="mb-5" />

      {/* ── Toolbar: status segments left, search + filters right ── */}
      {programs.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Segmented options={statusOptions} value={status} onChange={setStatus} className="self-start" />

          <div className="flex min-w-0 items-center gap-2">
            <div className="relative min-w-0 flex-1 lg:w-72 lg:flex-none">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Name, goal or description"
                className="h-11 w-full rounded-lg bg-card pl-10 pr-8 text-[15px] text-foreground shadow-[0_0_0_1px_rgb(var(--border)/0.6)] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 flex-shrink-0 gap-2 px-3.5">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFilterCount > 0 && <span className="tabular-nums text-muted-foreground">{activeFilterCount}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0" sideOffset={6}>
                <FiltersPanel
                  filters={{ difficulty, categories, duration, frequency, sessionLength }}
                  onChange={patch => {
                    if ('difficulty'    in patch) setDifficulty(patch.difficulty);
                    if ('categories'    in patch) setCategories(patch.categories);
                    if ('duration'      in patch) setDuration(patch.duration);
                    if ('frequency'     in patch) setFrequency(patch.frequency);
                    if ('sessionLength' in patch) setSessionLength(patch.sessionLength);
                  }}
                />
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <span className="text-[13px] text-muted-foreground">Sort</span>
                  <Select value={sort} onValueChange={setSort}>
                    <SelectTrigger className="h-8 w-40 text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SORTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {activeFilterCount > 0 && (
                  <div className="px-4 pb-3">
                    <button onClick={() => { clearAll(); setFilterOpen(false); }} className="text-[13px] font-semibold text-foreground underline underline-offset-4">
                      Clear all filters
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <div className="hidden flex-shrink-0 sm:block">
              <Segmented
                size="sm"
                className="h-11"
                options={[
                  { value: 'list', label: <List className="h-4 w-4" aria-label="Table" /> },
                  { value: 'grid', label: <LayoutGrid className="h-4 w-4" aria-label="Cards" /> },
                ]}
                value={layout}
                onChange={setLayout}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Active filter chips ── */}
      {activeChips.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {activeChips.map(chip => (
            <span key={chip.key} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-card pl-2.5 pr-1.5 text-[13px] font-medium text-foreground shadow-[0_0_0_1px_rgb(var(--border)/0.6)]">
              {chip.label}
              <button onClick={chip.onRemove} className="rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label={`Remove ${chip.label}`}>
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <button onClick={clearAll} className="text-[13px] font-semibold text-foreground underline underline-offset-4">Clear all</button>
        </div>
      )}

      {/* ── Program list ── */}
      <section>
        {isLoading ? (
          <Panel className="divide-y divide-border">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-4 w-48 animate-pulse rounded bg-secondary" />
                <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
              </div>
            ))}
          </Panel>
        ) : programs.length === 0 ? (
          <Panel>
            <EmptyState
              title="No programs yet"
              body="Build one from scratch, or let AI draft it from a client's goals and equipment. You can edit every set afterwards."
              action={
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => openBuilder()}>New program</Button>
                  <Button variant="outline" onClick={() => openCreateModal('ai')}>Generate with AI</Button>
                </div>
              }
            />
          </Panel>
        ) : filteredPrograms.length === 0 ? (
          <Panel>
            <EmptyState
              title="No programs match"
              body="Nothing fits that search and those filters."
              action={<Button variant="outline" onClick={clearAll}>Clear filters</Button>}
            />
          </Panel>
        ) : layout === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredPrograms.map(program => {
              const { assigned } = getClientsForProgram(program.id);
              return (
                <ProgramCard
                  key={program.id}
                  program={program}
                  clientsAssigned={assigned}
                  onEdit={() => openBuilder(program)}
                  onDuplicate={() => duplicateOrUpgrade(program)}
                  onAssign={() => setAssigningProgram(program)}
                  onPreview={() => setPreviewingProgram(program)}
                  onArchive={() => archiveMutation.mutate(program.id)}
                  onDelete={() => deleteMutation.mutate(program.id)}
                  allClients={allClients}
                />
              );
            })}
            <button
              onClick={() => openBuilder()}
              className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-input text-sm font-semibold text-foreground transition-colors hover:bg-card"
            >
              New program
            </button>
          </div>
        ) : (
          <Panel className="overflow-hidden">
            <div className={`hidden border-b border-border px-6 pb-3 pt-4 text-[13px] text-muted-foreground ${PROGRAM_TABLE_COLS}`}>
              <span>Program</span>
              <span>Goal</span>
              <span>Length</span>
              <span>Clients</span>
              <span>Last edited</span>
              <span className="w-[108px]" aria-hidden />
            </div>
            {filteredPrograms.map(program => {
              const { assigned, inProgress } = getClientsForProgram(program.id);
              return (
                <ProgramListRow
                  key={program.id}
                  program={program}
                  clientsAssigned={assigned}
                  clientsInProgress={inProgress}
                  onEdit={() => openBuilder(program)}
                  onDuplicate={() => duplicateOrUpgrade(program)}
                  onAssign={() => setAssigningProgram(program)}
                  onPreview={() => setPreviewingProgram(program)}
                  onArchive={() => archiveMutation.mutate(program.id)}
                  onDelete={() => deleteMutation.mutate(program.id)}
                  allClients={allClients}
                />
              );
            })}
          </Panel>
        )}
      </section>

      {/* ── Intelligence (below the list) ── */}
      {allClients.length > 0 && !searchQuery && activeFilterCount === 0 && (
        <div className="mt-6">
          <IntelligenceBar clients={allClients} checkIns={allCheckIns} />
        </div>
      )}

      {/* ── Modals ── */}
      <ProgramAssignmentModal
        open={!!assigningProgram}
        onOpenChange={(open) => !open && setAssigningProgram(null)}
        program={assigningProgram}
        allClients={allClients}
        onAssign={async ({ selectedClients }) => {
          for (const clientId of selectedClients) {
            await db.entities.Client.update(clientId, { assigned_program_id: assigningProgram.id });
          }
          queryClient.invalidateQueries({ queryKey: ['clients'] });
          const names = selectedClients.map(id => allClients.find(c => c.id === id)?.name || 'Client').join(', ');
          toast.success(`${assigningProgram.title} assigned to ${names}`);
          setAssigningProgram(null);
        }}
      />

      <AnimatePresence>
        {previewingProgram && (
          <ProgramDetailModal
            program={previewingProgram}
            assignedClients={getClientsForProgram(previewingProgram.id).assigned}
            allClients={allClients}
            onClose={() => setPreviewingProgram(null)}
            onAssign={() => { setAssigningProgram(previewingProgram); setPreviewingProgram(null); }}
            onEdit={() => { openBuilder(previewingProgram); setPreviewingProgram(null); }}
          />
        )}
      </AnimatePresence>

      <ProgramCreationModal
        open={showCreateModal}
        initialMode={createModalMode}
        onOpenChange={setShowCreateModal}
        onProgramCreated={(program) => {
          queryClient.invalidateQueries({ queryKey: ['programs'] });
          setShowCreateModal(false);
          if (program?.id) {
            toast.success('Program created. Opening it in the builder.');
            openBuilder(program);
          } else {
            toast.success('Program created');
          }
        }}
      />
    </Page>
  );
}
