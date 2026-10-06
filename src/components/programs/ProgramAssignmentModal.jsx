import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/kit';
import ClientPickerStep from './assignment/ClientPickerStep';
import ProgramSettingsStep from './assignment/ProgramSettingsStep';
import NotificationsStep from './assignment/NotificationsStep';
import ReviewStep from './assignment/ReviewStep';
import SmartSuggestions from './assignment/SmartSuggestions';

const STEPS = [
  { id: 1, label: 'Clients', title: 'Who is this program for?' },
  { id: 2, label: 'Start', title: 'When it starts and how fast it moves.' },
  { id: 3, label: 'Notify', title: 'Tell them it is ready, and book a kickoff if you want one.' },
  { id: 4, label: 'Review', title: 'Check it over, then assign.' }
];

export default function ProgramAssignmentModal({ 
  open, 
  onOpenChange, 
  program, 
  allClients, 
  onAssign 
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedClients, setSelectedClients] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const [repeatProgram, setRepeatProgram] = useState(false);
  const [pace, setPace] = useState('standard');
  const [customMessage, setCustomMessage] = useState('');
  const [showCustomMessage, setShowCustomMessage] = useState(false);
  const [notifyClient, setNotifyClient] = useState(true);
  const [scheduleKickoff, setScheduleKickoff] = useState(false);
  const [kickoffSession, setKickoffSession] = useState(null);

  // Draft auto-save
  useEffect(() => {
    if (!program) return;
    if (selectedClients.length > 0 || customMessage) {
      const draft = {
        selectedClients,
        startDate,
        repeatProgram,
        pace,
        customMessage,
        showCustomMessage,
        notifyClient,
        scheduleKickoff,
        kickoffSession,
        currentStep,
      };
      localStorage.setItem(`assignment_draft_${program.id}`, JSON.stringify(draft));
    }
  }, [selectedClients, startDate, repeatProgram, pace, customMessage, showCustomMessage, notifyClient, scheduleKickoff, kickoffSession, currentStep, program]);

  // Load draft on mount
  useEffect(() => {
    if (!program) return;
    const draft = localStorage.getItem(`assignment_draft_${program.id}`);
    if (draft) {
      try {
        const data = JSON.parse(draft);
        setSelectedClients(data.selectedClients);
        setStartDate(data.startDate);
        setRepeatProgram(data.repeatProgram);
        setPace(data.pace);
        setCustomMessage(data.customMessage);
        setShowCustomMessage(data.showCustomMessage);
        setNotifyClient(data.notifyClient);
        setScheduleKickoff(data.scheduleKickoff);
        setKickoffSession(data.kickoffSession);
        setCurrentStep(data.currentStep);
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [program, open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAssign = async () => {
    await onAssign({
      selectedClients,
      startDate,
      repeatProgram,
      pace,
      customMessage: showCustomMessage ? customMessage : null,
      notifyClient,
      kickoffSession: scheduleKickoff ? kickoffSession : null,
    });
    
    // Clear draft
    if (program) {
      localStorage.removeItem(`assignment_draft_${program.id}`);
    }
    handleClose();
  };

  const isStep1Valid = selectedClients.length > 0;
  const isStep2Valid = true;
  const isStep3Valid = !scheduleKickoff || kickoffSession;

  const canProceed = {
    1: isStep1Valid,
    2: isStep2Valid,
    3: isStep3Valid,
    4: true,
  }[currentStep];

  if (!program) return null;

  const clientCount = selectedClients.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl sm:p-0 sm:flex sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <p className="mb-1 text-sm font-medium text-muted-foreground">
            {[program.category && program.category.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()), program.difficulty, program.duration_weeks && `${program.duration_weeks} weeks`].filter(Boolean).join(', ')}
          </p>
          <DialogTitle className="pr-8 text-[26px]">Assign {program.title}</DialogTitle>
          <DialogDescription className="mt-1">{STEPS[currentStep - 1].title}</DialogDescription>
          <Segmented
            size="sm"
            className="mt-4"
            options={STEPS.map(step => ({ value: step.id, label: `${step.id}. ${step.label}` }))}
            value={currentStep}
            onChange={setCurrentStep}
          />
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {currentStep === 1 && (
            <ClientPickerStep
              selectedClients={selectedClients}
              onSelectClients={setSelectedClients}
              allClients={allClients}
            />
          )}

          {currentStep === 2 && (
            <ProgramSettingsStep
              startDate={startDate}
              onStartDateChange={setStartDate}
              repeatProgram={repeatProgram}
              onRepeatChange={setRepeatProgram}
              pace={pace}
              onPaceChange={setPace}
              showCustomMessage={showCustomMessage}
              onShowCustomMessageChange={setShowCustomMessage}
              customMessage={customMessage}
              onCustomMessageChange={setCustomMessage}
            />
          )}

          {currentStep === 3 && (
            <NotificationsStep
              notifyClient={notifyClient}
              onNotifyClientChange={setNotifyClient}
              program={program}
              customMessage={showCustomMessage ? customMessage : null}
              startDate={startDate}
              selectedClients={selectedClients}
              scheduleKickoff={scheduleKickoff}
              onScheduleKickoffChange={setScheduleKickoff}
              kickoffSession={kickoffSession}
              onKickoffSessionChange={setKickoffSession}
              allClients={allClients}
            />
          )}

          {currentStep === 4 && (
            <ReviewStep
              selectedClients={selectedClients}
              program={program}
              startDate={startDate}
              repeatProgram={repeatProgram}
              pace={pace}
              customMessage={showCustomMessage ? customMessage : null}
              notifyClient={notifyClient}
              kickoffSession={scheduleKickoff ? kickoffSession : null}
              allClients={allClients}
            />
          )}

          {/* Things to check before assigning */}
          <SmartSuggestions
            selectedClients={selectedClients}
            program={program}
            allClients={allClients}
          />
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>Back</Button>
            )}
            <button onClick={handleClose} className="text-sm font-semibold text-foreground underline underline-offset-4">
              Cancel
            </button>
          </div>

          {currentStep < 4 ? (
            <Button onClick={handleNext} disabled={!canProceed}>
              {currentStep === 1 && clientCount > 0 ? `Next, ${clientCount} selected` : 'Next'}
            </Button>
          ) : (
            <Button onClick={handleAssign}>
              {clientCount === 1 ? 'Assign to 1 client' : `Assign to ${clientCount} clients`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
