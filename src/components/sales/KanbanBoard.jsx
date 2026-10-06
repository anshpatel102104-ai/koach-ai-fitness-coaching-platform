import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { sourceLabel, money, daysInStage, isFollowUpOverdue, shortDate } from './leadMeta';

export const KANBAN_STAGES = [
  { key: 'new_lead',      label: 'New lead' },
  { key: 'dmd',           label: "DM'd" },
  { key: 'call_booked',   label: 'Call booked' },
  { key: 'proposal_sent', label: 'Proposal sent' },
  { key: 'closed_won',    label: 'Won' },
  { key: 'lost',          label: 'Lost' },
];

export const stageLabel = (key) => KANBAN_STAGES.find(s => s.key === key)?.label || key;

function KanbanLeadCard({ lead, index, onView }) {
  const days = daysInStage(lead);
  const overdue = isFollowUpOverdue(lead);
  const followUp = shortDate(lead.follow_up_date);
  const meta = [sourceLabel(lead.source), days === null ? null : days === 0 ? 'moved here today' : `${days} ${days === 1 ? 'day' : 'days'} here`].filter(Boolean).join(' · ');

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onView(lead)}
          className={cn(
            'rounded-lg bg-secondary px-3 py-2.5 cursor-pointer select-none transition-colors hover:bg-accent',
            snapshot.isDragging && 'ring-1 ring-foreground/20 bg-card'
          )}
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[15px] font-semibold text-foreground leading-snug truncate">{lead.name}</p>
            {lead.deal_value > 0 && (
              <span className="num text-[15px] text-foreground flex-shrink-0">{money(lead.deal_value)}</span>
            )}
          </div>
          {meta && <p className="text-[13px] text-muted-foreground mt-0.5 truncate">{meta}</p>}
          {followUp && (
            <p className={cn('text-[13px] mt-1', overdue ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
              {overdue ? `Follow-up overdue, ${followUp}` : `Follow up ${followUp}`}
            </p>
          )}
        </div>
      )}
    </Draggable>
  );
}

function KanbanColumn({ stage, leads, onView, onAddLead }) {
  const total = leads.reduce((s, l) => s + (l.deal_value || 0), 0);
  const summary = `${leads.length} ${leads.length === 1 ? 'lead' : 'leads'}${total > 0 ? `, ${money(total)}/mo` : ''}`;

  return (
    <div className="panel flex-shrink-0 w-[236px] flex flex-col" style={{ maxHeight: 'calc(100vh - 300px)', minHeight: 360 }}>
      <div className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
        <p className="text-[13px] text-muted-foreground">{summary}</p>
        <h3 className="text-xl text-foreground leading-tight mt-0.5">{stage.label}</h3>
      </div>

      <Droppable droppableId={stage.key}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 overflow-y-auto p-3 space-y-2 min-h-[80px] transition-colors',
              snapshot.isDraggingOver && 'bg-accent/50'
            )}
          >
            {leads.map((lead, i) => (
              <KanbanLeadCard key={lead.id} lead={lead} index={i} onView={onView} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <div className="p-3 pt-0 flex-shrink-0">
        <button
          onClick={() => onAddLead(stage.key)}
          className="w-full h-10 rounded-lg border border-dashed border-input text-sm font-semibold text-foreground/80 hover:text-foreground hover:bg-accent/60 transition-colors"
        >
          Add lead
        </button>
      </div>
    </div>
  );
}

export default function KanbanBoard({ leads, onUpdate, onView, onAddLead }) {
  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newStage = destination.droppableId;
    const lead = leads.find(l => l.id === draggableId);
    if (!lead) return;

    onUpdate(draggableId, { stage: newStage, stage_changed_at: new Date().toISOString() });
    toast.success(`${lead.name} moved to ${stageLabel(newStage)}`);
  };

  const stageLeads = (stageKey) => leads.filter(l => l.stage === stageKey);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        {KANBAN_STAGES.map(stage => (
          <KanbanColumn
            key={stage.key}
            stage={stage}
            leads={stageLeads(stage.key)}
            onView={onView}
            onAddLead={onAddLead}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
