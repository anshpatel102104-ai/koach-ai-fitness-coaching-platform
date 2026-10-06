import React, { useState, useRef, useEffect } from 'react';
import { db } from '@/api/supabaseClient';
import {
  Send, Tag, ChevronDown, Plus, X,
  Paperclip, Image, ClipboardList, Salad, CheckSquare, BarChart2,
  Mic, Video, Check, Link, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import FeatureLock from '@/components/subscription/FeatureLock';
import { TAG_LABELS } from './MessageTemplates';
import { differenceInDays } from 'date-fns';
import AIReplyAssistant from './AIReplyAssistant';
import { SignedAudio } from '@/components/shared/SignedImage';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const TAGS = ['general', 'check_in', 'urgent', 'nutrition', 'training', 'motivation'];

const TEMPLATE_CATEGORIES = [
  {
    key: 'onboarding', label: 'Onboarding',
    templates: [
      { label: 'Welcome', text: "Welcome aboard. Message me here any time you have a question, big or small." },
      { label: 'Getting started', text: "Your program and nutrition plan are set up. Start with day 1 whenever you're ready and I'll check in after." },
      { label: 'First check-in', text: "Quick reminder to send your first weekly check-in when you get a minute." },
    ]
  },
  {
    key: 'motivation', label: 'Motivation',
    templates: [
      { label: 'Good progress', text: "Your progress the last few weeks has been really solid. Keep doing exactly what you're doing." },
      { label: 'Milestone', text: "You hit a real milestone this week. This is what consistency looks like." },
      { label: 'Hard week', text: "Some weeks are harder than others. You kept showing up, and that's what counts." },
    ]
  },
  {
    key: 'checkin', label: 'Check-in',
    templates: [
      { label: 'Reminder', text: "Quick reminder to send in your weekly check-in when you get a minute." },
      { label: 'Good check-in', text: "Good check-in this week. The consistency is showing. Same plan, keep going." },
      { label: 'Follow-up', text: "I read your check-in and there are a couple of things I want to go over. Can you do a quick call this week?" },
    ]
  },
  {
    key: 'reengagement', label: 'Re-engagement',
    templates: [
      { label: 'Gone quiet', text: "It's been a bit quiet on your end. Everything okay? I'm here when you need me." },
      { label: 'Missed check-in', text: "I didn't get your check-in this week. Everything okay? Let me know if something came up." },
      { label: 'Win-back', text: "Whenever you're ready to pick back up, I'll have a fresh plan waiting. No judgment." },
    ]
  },
  {
    key: 'progress', label: 'Progress review',
    templates: [
      { label: 'Program update', text: "I've updated your training program based on your recent progress. Have a look and ask me anything." },
      { label: 'Nutrition adjustment', text: "Based on your last few check-ins I've adjusted your calories and macros a little. The changes are live in the app." },
      { label: 'Monthly review', text: "Time for a monthly review. Let's go over what's working, what to change, and the goal for next month." },
    ]
  },
];

const ATTACH_OPTIONS = [
  { icon: Paperclip,     label: 'Attach a file',          key: 'file' },
  { icon: Image,         label: 'Send a photo',           key: 'photo' },
  { icon: ClipboardList, label: 'Share program',          key: 'program' },
  { icon: Salad,         label: 'Share meal plan',        key: 'meal' },
  { icon: CheckSquare,   label: 'Ask for a check-in',     key: 'checkin' },
  { icon: BarChart2,     label: 'Share progress report',  key: 'progress' },
];

function getContextualChips(client, messages, checkIns = []) {
  const clientMessages = messages.filter(m => m.client_id === client?.id);
  const lastClientMsg = [...clientMessages].reverse().find(m => m.sender === 'client');
  const sortedCI = [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastCheckIn = sortedCI[0];
  const daysSinceCheckin = lastCheckIn ? differenceInDays(new Date(), new Date(lastCheckIn.date)) : 999;
  const daysSinceMessage = lastClientMsg ? differenceInDays(new Date(), new Date(lastClientMsg.created_date)) : 999;
  const hasRecentCheckin = daysSinceCheckin <= 2;
  const isInactive = daysSinceMessage > 5;
  const isNewClient = client?.start_date && differenceInDays(new Date(), new Date(client.start_date)) <= 7;

  if (hasRecentCheckin) return [
    { label: 'Good work this week', text: "Good work on this week's check-in. Keep that consistency going." },
    { label: 'Consistency is showing', text: "The consistency in your check-ins is making a real difference." },
    { label: 'Reviewing your numbers', text: "Thanks for checking in. I'll go through your numbers and get back to you today." },
  ];
  if (isNewClient) return [
    { label: "How's the program?", text: "How's the program feeling so far? Any questions on the workouts?" },
    { label: 'Any questions?', text: "Just checking in. Any questions on the workouts or the nutrition plan?" },
    { label: 'One day at a time', text: "Take it one day at a time. You're doing fine." },
  ];
  if (isInactive) return [
    { label: 'Just checking in', text: "Just checking in. How are things going?" },
    { label: 'How are things?', text: "How are things going? Haven't seen you in the app for a few days." },
    { label: 'Here if you need me', text: "Everything okay? I'm here if you need anything." },
  ];
  return [
    { label: 'Good work', text: 'Good work this week. Keep it up.' },
    { label: 'Check-in reminder', text: "Quick reminder to send in your weekly check-in." },
    { label: 'Stay consistent', text: "Stay consistent. Small things every day add up." },
    { label: 'How are you doing?', text: "Just checking in. How are you feeling this week?" },
  ];
}

const LINK_BTN = 'touch-compact flex flex-shrink-0 whitespace-nowrap items-center gap-1.5 h-8 px-2 rounded-md text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors';

function TemplatesDrawer({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(TEMPLATE_CATEGORIES[0].key);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editText, setEditText] = useState('');
  const [customTemplates, setCustomTemplates] = useState([]);
  const [saveText, setSaveText] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  const cat = TEMPLATE_CATEGORIES.find(c => c.key === activeCategory);
  const allTemplates = [...(cat?.templates || []), ...customTemplates.filter(t => t.category === activeCategory)];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgb(17_19_24/0.4)]" onClick={onClose}>
      <div className="w-full max-w-sm bg-card h-full flex flex-col overflow-hidden border-l border-border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-[22px] text-foreground">Templates</h2>
          <button onClick={onClose} aria-label="Close" className="touch-compact p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-4 px-5 border-b border-border overflow-x-auto scrollbar-hide">
          {TEMPLATE_CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setActiveCategory(c.key)}
              className={cn('touch-compact -mb-px whitespace-nowrap border-b-2 pb-2.5 text-[13px] font-medium transition-colors',
                activeCategory === c.key ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {allTemplates.map((t, i) => (
            <div key={i} className="px-5 py-4 border-b border-border">
              {editingIdx === i ? (
                <>
                  <textarea className="w-full text-[15px] rounded-md border border-input p-3 resize-none outline-none focus:border-foreground bg-card" rows={4} value={editText} onChange={e => setEditText(e.target.value)} />
                  <div className="flex items-center gap-3 mt-2">
                    <Button size="sm" onClick={() => { onSelect(editText, 'general'); onClose(); }}>Use this</Button>
                    <button onClick={() => setEditingIdx(null)} className="text-[13px] text-muted-foreground underline underline-offset-4">Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-foreground">{t.label}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{t.text}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => { onSelect(t.text, 'general'); onClose(); }}>Use</Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingIdx(i); setEditText(t.text); }}>Edit</Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-border p-4">
          {showSaveInput ? (
            <div className="space-y-2">
              <textarea className="w-full text-[15px] rounded-md border border-input p-3 resize-none outline-none focus:border-foreground bg-card" placeholder="Write the template" rows={3} value={saveText} onChange={e => setSaveText(e.target.value)} />
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={() => { if (saveText.trim()) { setCustomTemplates(prev => [...prev, { label: 'My template', text: saveText.trim(), category: activeCategory }]); setSaveText(''); setShowSaveInput(false); } }}>Save</Button>
                <button onClick={() => setShowSaveInput(false)} className="text-[13px] text-muted-foreground underline underline-offset-4">Cancel</button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setShowSaveInput(true)}>
              <Plus /> New template
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function AttachmentMenu({ onSelect, onClose }) {
  return (
    <div className="absolute bottom-full mb-2 left-0 z-30 w-56 rounded-xl bg-card ring-1 ring-border shadow-md p-1.5">
      {ATTACH_OPTIONS.map(opt => (
        <button key={opt.key} onClick={() => { onSelect(opt.key); onClose(); }}
          className="w-full flex items-center gap-2.5 px-2.5 h-9 rounded-md hover:bg-accent transition-colors text-left">
          <opt.icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-foreground">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Recording UI: active recording state ──
function VoiceRecorderActive({ seconds, onStop, onCancel }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/[0.06] px-3 h-11">
      <span className="w-2.5 h-2.5 rounded-full bg-destructive flex-shrink-0" />
      <span className="text-sm font-medium text-destructive">Recording</span>
      <span className="text-sm text-destructive tabular-nums">
        {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
      </span>
      <span className="flex-1" />
      <Button size="sm" variant="outline" onClick={onStop}>Stop</Button>
      <button onClick={onCancel} aria-label="Cancel recording" className="touch-compact p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ── Recording UI: playback/preview state ──
// uploadState: 'uploading' | 'done' | 'error'
function VoiceRecorderPreview({ audioUrl, uploadState, seconds, onDiscard, onRetryUpload, onSend }) {
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const canSend = uploadState === 'done' && !!audioUrl;

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-secondary px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className={cn('flex items-center gap-1.5 text-[13px] font-medium', uploadState === 'error' ? 'text-destructive' : 'text-foreground')}>
          {uploadState === 'uploading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {uploadState === 'done' && <Check className="w-3.5 h-3.5 text-success" />}
          {uploadState === 'uploading' && `Uploading voice note · ${fmt(seconds)}`}
          {uploadState === 'done' && `Voice note ready · ${fmt(seconds)}`}
          {uploadState === 'error' && 'Upload failed'}
        </span>
        <div className="flex items-center gap-3">
          {uploadState === 'error' && (
            <button onClick={onRetryUpload} className="text-[13px] font-semibold text-foreground underline underline-offset-4">Retry</button>
          )}
          <button onClick={onDiscard} className="text-[13px] font-medium text-muted-foreground hover:text-destructive transition-colors">Discard</button>
        </div>
      </div>
      {audioUrl && (
        <SignedAudio
          src={audioUrl}
          controls
          className="w-full"
          style={{ height: 32 }}
        />
      )}
      <Button onClick={onSend} disabled={!canSend} className="w-full">
        <Send /> {uploadState === 'uploading' ? 'Waiting for upload…' : 'Send voice note'}
      </Button>
    </div>
  );
}

function VideoLinkPopover({ clientName, onInsert, onClose }) {
  const [link] = useState(() => `https://meet.jit.si/koach-${Math.random().toString(36).slice(2, 8)}`);
  const [copied, setCopied] = useState(false);
  return (
    <div className="absolute bottom-full mb-2 right-0 z-30 w-72 rounded-xl bg-card ring-1 ring-border shadow-md p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-foreground">Video call link</p>
        <button onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-muted-foreground" /></button>
      </div>
      <p className="text-[13px] text-muted-foreground mb-3">Send this to {clientName?.split(' ')[0] || 'your client'} to start a call.</p>
      <div className="flex items-center gap-2 bg-secondary rounded-md px-2.5 h-9 mb-3">
        <span className="text-[13px] text-foreground flex-1 truncate font-mono">{link}</span>
        <button onClick={() => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }} aria-label="Copy link">
          {copied ? <Check className="w-4 h-4 text-success" /> : <Paperclip className="w-4 h-4 text-muted-foreground" />}
        </button>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={() => { onInsert(`Join the video call: ${link}`); onClose(); }}>Add to message</Button>
        <Button size="sm" variant="outline" asChild>
          <a href={link} target="_blank" rel="noopener noreferrer"><Link /> Open</a>
        </Button>
      </div>
    </div>
  );
}

export default function ComposeBar({ client, allMessages, checkIns = [], onSend, onSendVoice, selectedTag, setSelectedTag, value, onChange }) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  // recordingState: 'idle' | 'recording' | 'preview'
  const [recordingState, setRecordingState] = useState('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  // audioUrl: starts as blob:// for immediate playback, replaced by CDN URL after upload
  const [audioUrl, setAudioUrl] = useState(null);
  const [uploadState, setUploadState] = useState('uploading'); // 'uploading' | 'done' | 'error'
  const [showAI, setShowAI] = useState(false);
  const textareaRef = useRef(null);

  // All recording refs live here in ComposeBar (never in a child) so they
  // are always reachable by cancel/stop regardless of re-renders.
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  // Keep a ref to the current blob so we can retry upload without re-recording
  const recordedBlobRef = useRef(null);

  function releaseStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  function stopTimer() {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }

  async function uploadBlob(blob) {
    setUploadState('uploading');
    // Show blob URL immediately so coach can hear the recording while uploading
    const blobUrl = URL.createObjectURL(blob);
    setAudioUrl(blobUrl);
    setRecordingState('preview');
    try {
      // Determine file extension from MIME type
      const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : 'webm';
      // Convert blob to File so UploadFile gets the correct filename/content-type
      const file = new File([blob], `voice-message-${Date.now()}.${ext}`, { type: blob.type });
      const result = await db.uploadFile({ file, scope: client?.id ? { clientId: client.id } : undefined });
      // Replace blob URL with persistent CDN URL
      URL.revokeObjectURL(blobUrl);
      setAudioUrl(result.file_url);
      setUploadState('done');
    } catch (_err) {
      // Keep blob URL so playback still works; allow retry
      setUploadState('error');
    }
  }

  async function handleStartRecording() {
    // Clean up any previous recording
    if (recordedBlobRef.current) recordedBlobRef.current = null;
    if (audioUrl && audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    chunksRef.current = [];
    setRecordingSeconds(0);

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (_err) {
      alert('Microphone access denied. Please allow mic access and try again.');
      return;
    }

    streamRef.current = stream;

    // Pick best supported MIME type for broad browser compatibility
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', '']
      .find(m => m === '' || MediaRecorder.isTypeSupported(m));

    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    mediaRecorderRef.current = mr;

    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = () => {
      if (mediaRecorderRef.current?._cancelled) return;
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
      recordedBlobRef.current = blob;
      uploadBlob(blob);
    };

    mr.start(100);
    setRecordingState('recording');
    timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
  }

  function handleStopRecording() {
    stopTimer();
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr._cancelled = false;
      mr.stop();
    }
    releaseStream();
    // onstop fires → uploadBlob → transitions to 'preview'
  }

  function handleCancelRecording() {
    stopTimer();
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr._cancelled = true;
      mr.stop();
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    recordedBlobRef.current = null;
    releaseStream();
    if (audioUrl && audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingSeconds(0);
    setRecordingState('idle');
  }

  function handleDiscardPreview() {
    if (audioUrl && audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    recordedBlobRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setRecordingSeconds(0);
    setRecordingState('idle');
  }

  function handleRetryUpload() {
    if (recordedBlobRef.current) {
      uploadBlob(recordedBlobRef.current);
    }
  }

  function handleSendVoice() {
    if (uploadState !== 'done' || !audioUrl) return;
    onSendVoice?.({ audioUrl, durationSeconds: recordingSeconds });
    // Reset composer back to idle
    if (audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    recordedBlobRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setRecordingSeconds(0);
    setRecordingState('idle');
    setUploadState('uploading');
  }
  const isEmpty = !value.trim();

  // Detect if last message is from client (show AI suggestion)
  const clientMessages = allMessages.filter(m => m.client_id === client?.id);
  const lastMsg = [...clientMessages].sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
  const lastIsFromClient = lastMsg?.sender === 'client';
  const recentCheckIn = checkIns?.length > 0
    ? [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    : null;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isEmpty) onSend(); }
  };

  const handleAttachSelect = (key) => {
    const map = {
      file: '[Attaching file]',
      photo: '[Sending photo]',
      program: 'Your updated program is in the app. Have a look when you get a chance.',
      meal: 'Your meal plan is ready in the app. Have a look when you get a chance.',
      checkin: 'Time for your weekly check-in. Send it in when you get a minute.',
      progress: "I've put together a progress report for you. The full breakdown is in the app.",
    };
    onChange(map[key] || '');
    textareaRef.current?.focus();
  };

  const sortedConversation = [...clientMessages].sort((a, b) => new Date(a.created_date) - new Date(b.created_date)).slice(-8);

  const chips = getContextualChips(client, allMessages, checkIns);
  const first = client?.name?.split(' ')[0] || '';

  return (
    <div className="flex-shrink-0">
      {/* Suggested reply sits at the foot of the thread, on the canvas */}
      {recordingState === 'idle' && (lastIsFromClient || showAI) && (
        <div className="bg-background px-4 lg:px-6 pb-4">
          <AIReplyAssistant
            client={client}
            conversationMessages={sortedConversation}
            checkIn={recentCheckIn}
            onUse={(text) => { onChange(text); textareaRef.current?.focus(); }}
            onEditFirst={(text) => { onChange(text); textareaRef.current?.focus(); }}
            onDismiss={() => setShowAI(false)}
          />
        </div>
      )}

      <div className="border-t border-border bg-card px-4 lg:px-6 pt-3 pb-3">
        <div className="flex items-end gap-2">
          <div className="relative flex-shrink-0">
            <button
              onClick={() => { setShowAttach(!showAttach); setShowVideo(false); }}
              aria-label="Attach"
              className={cn('flex h-11 w-11 items-center justify-center rounded-lg border transition-colors',
                showAttach ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-input text-muted-foreground hover:text-foreground hover:bg-accent')}
            >
              <Plus className={cn('w-4 h-4 transition-transform', showAttach && 'rotate-45')} />
            </button>
            {showAttach && <AttachmentMenu onSelect={handleAttachSelect} onClose={() => setShowAttach(false)} />}
          </div>

          {recordingState === 'recording' ? (
            <div className="flex-1">
              <VoiceRecorderActive
                seconds={recordingSeconds}
                onStop={handleStopRecording}
                onCancel={handleCancelRecording}
              />
            </div>
          ) : recordingState === 'preview' ? (
            <div className="flex-1">
              <VoiceRecorderPreview
                audioUrl={audioUrl}
                uploadState={uploadState}
                seconds={recordingSeconds}
                onDiscard={handleDiscardPreview}
                onRetryUpload={handleRetryUpload}
                onSend={handleSendVoice}
              />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={value}
              onChange={e => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={first ? `Message ${first}` : 'Write a message'}
              rows={1}
              className="flex-1 resize-none rounded-lg border border-input bg-card px-4 py-[11px] text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground transition-colors leading-snug"
              style={{ maxHeight: 140, minHeight: 44 }}
            />
          )}

          {recordingState === 'idle' && (
            <Button onClick={onSend} disabled={isEmpty} className="h-11 px-5 flex-shrink-0">
              <span className="hidden sm:inline">Send</span>
              <Send className="sm:hidden" />
            </Button>
          )}
        </div>

        {recordingState === 'idle' && (
          <div className="flex items-center gap-0.5 mt-2 -ml-2 overflow-x-auto scrollbar-hide">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(LINK_BTN, selectedTag !== 'general' && (selectedTag === 'urgent' ? 'text-destructive' : 'text-foreground'))}>
                  <Tag className="w-3.5 h-3.5" />{TAG_LABELS[selectedTag] || selectedTag}<ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuLabel className="text-[13px] font-medium text-muted-foreground">Tag this message</DropdownMenuLabel>
                {TAGS.map(t => (
                  <DropdownMenuItem key={t} onClick={() => setSelectedTag(t)} className={cn(selectedTag === t && 'font-semibold')}>
                    {TAG_LABELS[t] || t}
                    {selectedTag === t && <Check className="ml-auto w-3.5 h-3.5" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={LINK_BTN}>Quick replies <ChevronDown className="w-3 h-3" /></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {chips.map((r, i) => (
                  <DropdownMenuItem key={i} onClick={() => { onChange(r.text); textareaRef.current?.focus(); }} className="flex-col items-start gap-0.5">
                    <span className="font-medium">{r.label}</span>
                    <span className="text-[13px] text-muted-foreground line-clamp-1">{r.text}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <button onClick={() => setShowTemplates(true)} className={LINK_BTN}>Templates</button>

            {!lastIsFromClient && !showAI && (
              <button onClick={() => setShowAI(true)} className={LINK_BTN}>Suggest a reply</button>
            )}

            <div className="flex-1" />

            <FeatureLock feature="voice_video_messages" className="rounded-md">
              <button onClick={handleStartRecording} className={LINK_BTN} title="Record a voice note" aria-label="Record a voice note">
                <Mic className="w-4 h-4" />
              </button>
            </FeatureLock>

            <FeatureLock feature="voice_video_messages" className="rounded-md">
              <div className="relative">
                <button
                  onClick={() => { setShowVideo(!showVideo); setShowAttach(false); }}
                  aria-label="Video call link"
                  className={cn(LINK_BTN, showVideo && 'text-foreground bg-accent')}
                >
                  <Video className="w-4 h-4" />
                </button>
                {showVideo && <VideoLinkPopover clientName={client?.name} onInsert={(text) => onChange(text)} onClose={() => setShowVideo(false)} />}
              </div>
            </FeatureLock>
          </div>
        )}
      </div>

      {showTemplates && <TemplatesDrawer onSelect={(text, tag) => { onChange(text); setSelectedTag(tag || 'general'); }} onClose={() => setShowTemplates(false)} />}
    </div>
  );
}
