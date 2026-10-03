import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Copy, Eye } from 'lucide-react';
import { toast } from 'sonner';

const TEMPLATES = [
  {
    type: 'newsletter',
    name: 'Monthly Newsletter',
    subject: 'Your Monthly Coaching Update',
    use: 'Monthly update with wins and tips',
  },
  {
    type: 'launch',
    name: 'New Package Launch',
    subject: 'I\'ve Created Something Exciting For You',
    use: 'Announce new package or program',
  },
  {
    type: 'limited_spots',
    name: 'Limited Spots Available',
    subject: 'Last Spots Open - [Package Name]',
    use: 'Create urgency with limited capacity',
  },
  {
    type: 'consultation_offer',
    name: 'Free Consultation Offer',
    subject: 'Let\'s Find the Right Plan For You',
    use: 'Reach out to prospects',
  },
  {
    type: 'reengagement',
    name: 'Re-engagement Campaign',
    subject: 'We Miss You! Here\'s What\'s New',
    use: 'Win back inactive clients',
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
      toast.error('Please fill all required fields');
      return;
    }
    saveMutation.mutate(editData);
  };

  const handleCopyHtml = (html) => {
    navigator.clipboard.writeText(html);
    toast.success('HTML copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {!selectedTemplate ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TEMPLATES.map((template) => {
            const exists = userTemplates.find(t => t.template_type === template.type);
            return (
              <button key={template.type} onClick={() => handleSelectTemplate(template)}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  exists
                    ? 'border-success bg-success/10'
                    : 'border-border bg-card hover:border-primary'
                }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground">{template.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{template.use}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-2 line-clamp-1">{template.subject}</p>
                  </div>
                  {exists && <span className="text-xs font-bold text-success whitespace-nowrap ml-2">✓ Saved</span>}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border p-6">
          <button onClick={() => setSelectedTemplate(null)}
            className="text-sm font-bold text-primary hover:text-primary mb-4">
            ← Back to Templates
          </button>

          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-1">Template Name</label>
                <input
                  type="text"
                  value={editData?.template_name || ''}
                  onChange={(e) => setEditData({ ...editData, template_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-1">Subject Line</label>
                <input
                  type="text"
                  value={editData?.subject_line || ''}
                  onChange={(e) => setEditData({ ...editData, subject_line: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-1">HTML Content</label>
                <textarea
                  value={editData?.html_content || ''}
                  onChange={(e) => setEditData({ ...editData, html_content: e.target.value })}
                  rows={10}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-2">
                <button onClick={handleSaveTemplate} disabled={saveMutation.isPending}
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary disabled:opacity-50">
                  Save Template
                </button>
                <button onClick={() => setEditMode(false)}
                  className="px-6 py-2 rounded-lg bg-border text-foreground font-bold hover:bg-border">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-bold text-foreground">{selectedTemplate.template_name}</h3>
              <p className="text-sm text-muted-foreground">{selectedTemplate.use_case}</p>
              <div className="p-4 rounded-lg bg-muted border border-border">
                <p className="text-xs text-muted-foreground font-bold mb-2">Subject: </p>
                <p className="text-sm text-foreground">{selectedTemplate.subject_line}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleCopyHtml(selectedTemplate.html_content)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground font-bold hover:bg-muted">
                  <Copy className="w-4 h-4" /> Copy HTML
                </button>
                <button onClick={() => setEditMode(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary">
                  <Eye className="w-4 h-4" /> Edit Template
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}