import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { AnimatePresence } from 'framer-motion';
import CheckInFormScreen from './CheckInFormScreen';
import CheckInReview from './CheckInReview';
import CheckInSuccessScreen from './CheckInSuccessScreen';

const DRAFT_KEY = 'checkin_draft';

export default function CheckInForm({ client, lastCheckIn, totalCheckIns, onSubmitted, onExit }) {
  const [view, setView] = useState('form'); // form | review | success
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    return saved ? JSON.parse(saved) : {};
  });
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Get check-in form (assume one assigned form)
  const { data: forms = [] } = useQuery({
    queryKey: ['checkin-forms'],
    queryFn: () => portalDb.entities.CheckInForm.filter({ is_active: true }, '-created_date', 1),
  });
  const form = forms[0];

  // Auto-save draft after each response
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(responses));
  }, [responses]);

  const handleResponseChange = (questionId, value) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
    // Auto-advance for single-choice questions
    const q = form?.questions?.find(x => x.id === questionId);
    if (q?.type === 'yes_no' || (q?.type === 'multiple_choice' && !q.options?.length > 2)) {
      setTimeout(() => {
        if (currentQuestion < form.questions.length - 1) {
          setCurrentQuestion(curr => curr + 1);
        } else {
          setView('review');
        }
      }, 400);
    }
  };

  const handleReview = () => {
    setView('review');
    setCurrentQuestion(0);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const checkIn = await portalDb.entities.CheckIn.create({
        client_id: client.id,
        client_name: client.name,
        date: new Date().toISOString().split('T')[0],
        form_id: form?.id,
        ...responses,
      });
      localStorage.removeItem(DRAFT_KEY);
      onSubmitted(checkIn);
      setView('success');
      queryClient.invalidateQueries({ queryKey: ['portal-checkins'] });
    } catch (err) {
      console.error('Submit failed:', err);
      setSubmitting(false);
    }
  };

  const handleExit = () => {
    if (Object.keys(responses).length > 0 && view === 'form') {
      const confirm = window.confirm('Your progress will be saved as a draft. Continue?');
      if (!confirm) return;
    }
    onExit();
  };

  if (!form) return null;

  return (
    <AnimatePresence mode="wait">
      {view === 'form' && (
        <CheckInFormScreen
          key="form"
          form={form}
          responses={responses}
          onResponseChange={handleResponseChange}
          onExit={handleExit}
          onReview={handleReview}
          onStep={setCurrentQuestion}
          currentQ={currentQuestion}
          lastCheckIn={lastCheckIn}
        />
      )}
      {view === 'review' && (
        <CheckInReview
          key="review"
          form={form}
          responses={responses}
          onBack={() => setView('form')}
          onSubmit={handleSubmit}
          submitting={submitting}
          lastCheckIn={lastCheckIn}
          onEditQuestion={(i) => { setCurrentQuestion(i); setView('form'); }}
          onExit={handleExit}
        />
      )}
      {view === 'success' && (
        <CheckInSuccessScreen
          key="success"
          streak={totalCheckIns + 1}
          onHome={onExit}
          onMessage={() => {}}
        />
      )}
    </AnimatePresence>
  );
}