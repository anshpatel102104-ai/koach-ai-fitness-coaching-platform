import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Copy, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Panel, PanelHeader, KeyValue } from '@/components/kit';
import { toast } from 'sonner';

const TEMPLATES = [
  {
    type: 'newsletter',
    name: 'Monthly newsletter',
    subject: 'Your monthly coaching update',
    use: 'Client wins, one tip, what is coming next month',
  },
  {
    type: 'launch',
    name: 'New package launch',
    subject: 'A new way to work with me',
    use: 'Announce a new package or program',
  },
  {
    type: 'limited_spots',
    name: 'Limited spots',
    subject: 'Last spots open for [package name]',
    use: 'When you have a few places left',
  },
  {
    type: 'consultation_offer',
    name: 'Free consultation offer',
    subject: 'Let\'s find the right plan for you',
    use: 'For people who asked but have not signed up',
  },
  {
    type: 'reengagement',
    name: 'Re-engagement',
    subject: 'Here\'s what changed since you left',
    use: 'For past clients who went quiet',
  },
];

export default function EmailTemplateLibrary({ coachId }) {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(null);

  const { data: userTemplates = [] } = useQuery({
    queryKey: ['email-templates', coachId],
    queryFn: () => db.entities.EmailTemplate.filter({ coach_id: coachId }),
    enabled: !!coachId,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (data.id) {
        return db.entities.EmailTemplate.update(data.id, data);
      } else {
        return db.entities.EmailTemplate.create({ ...data, coach_id: coachId });
      }
    },
    onSuccess: () => {
      toast.success('Template saved');
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ['email-templates', coachId] });
    },
  });

  const handleSelectTemplate = (template) => {
    const existing = userTemplates.find(t => t.template_type === template.type);
    if (existing) {
      setSelectedTemplate(existing);
    } else {
      setSelectedTemplate(template);
      setEditData({
        template_type: template.type,
        template_name: template.name,
        subject_line: template.subject,
        use_case: template.use,
        html_content: `<html><body><p>Your email content here...</p></body></html>`,
      });
      setEditMode(true);
    }
  };

  const handleSaveTemplate = () => {
    if (!editData.template_name || !editData.subject_line) {
      toast.error('Add a name and a subject line');
      return;
    }
    saveMutation.mutate(editData);
  };

  const handleCopyHtml = (html) => {
    navigator.clipboard.writeText(html);
    toast.success('HTML copied to clipboard');
  };

  if (!selectedTemplate) {
    return (
      <Panel>
        <PanelHeader title="Email templates" subtitle="Starting points for the emails coaches send most. Save one to make it yours." />
        <ul className="divide-y divide-border px-5 sm:px-6 pb-1">
          {TEMPLATES.map((template) => {
            const exists = userTemplates.find(t => t.template_type === template.type);
            return (
              <li key={template.type} className="flex flex-col sm:flex-row sm:items-center gap-3 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-foreground">{template.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{template.use}</p>
                  <p className="text-[13px] text-muted-foreground mt-1">Subject: {exists?.subject_line || template.subject}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {exists && <span className="text-sm font-medium text-success">Saved</span>}
                  <Button size="sm" variant="outline" onClick={() => handleSelectTemplate(template)}>{exists ? 'Open' : 'Use'}</Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    );
  }

  return (
    <Panel className="p-5 sm:p-6">
      <button onClick={() => setSelectedTemplate(null)} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="w-4 h-4" /> All templates
      </button>

      {editMode ? (
        <div className="space-y-4 max-w-3xl">
          <h2 className="text-[22px] text-foreground">{editData?.template_name || 'Template'}</h2>
          <div>
            <Label htmlFor="et-name">Template name</Label>
            <Input id="et-name" className="mt-1.5" value={editData?.template_name || ''} onChange={(e) => setEditData({ ...editData, template_name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="et-subject">Subject line</Label>
            <Input id="et-subject" className="mt-1.5" value={editData?.subject_line || ''} onChange={(e) => setEditData({ ...editData, subject_line: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="et-html">HTML</Label>
            <Textarea id="et-html" className="mt-1.5 font-mono text-[13px]" rows={12} value={editData?.html_content || ''} onChange={(e) => setEditData({ ...editData, html_content: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveTemplate} disabled={saveMutation.isPending}>Save template</Button>
            <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 max-w-3xl">
          <div>
            <h2 className="text-[22px] text-foreground">{selectedTemplate.template_name}</h2>
            {selectedTemplate.use_case && <p className="text-sm text-muted-foreground mt-1">{selectedTemplate.use_case}</p>}
          </div>
          <KeyValue label="Subject" value={selectedTemplate.subject_line} />
          <div className="flex gap-2">
            <Button onClick={() => { setEditData(selectedTemplate); setEditMode(true); }}>Edit template</Button>
            <Button variant="outline" onClick={() => handleCopyHtml(selectedTemplate.html_content)}><Copy /> Copy HTML</Button>
          </div>
        </div>
      )}
    </Panel>
  );
}
