import React from 'react';
import { RotateCcw, Eye, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Panel, PanelHeader } from '@/components/kit';
import { Button } from '@/components/ui/button';

export default function WLPublish({ s, onPublish, onSaveDraft, onRollback, onPreview, publishing, saving }) {
  const history = s.publish_history || [];

  return (
    <Panel>
      <PanelHeader
        title="Publish"
        subtitle={s.is_published && s.published_at
          ? `Live since ${format(new Date(s.published_at), 'MMM d, yyyy h:mm a')}. Clients see the last published version.`
          : 'Nothing is live yet. Clients see KOACH defaults until you publish.'}
      />
      <div className="space-y-4 px-5 pb-5 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={onPublish} disabled={publishing} className="sm:flex-1">
            {publishing && <Loader2 className="animate-spin" />} Publish changes
          </Button>
          <Button variant="outline" onClick={onSaveDraft} disabled={saving} className="sm:flex-1">
            {saving && <Loader2 className="animate-spin" />} Save as draft
          </Button>
          <Button variant="outline" onClick={onPreview} className="lg:hidden">
            <Eye /> Preview
          </Button>
        </div>

        {history.length > 0 && (
          <div className="border-t border-border pt-4">
            <p className="mb-1 text-[13px] font-semibold text-muted-foreground">Version history</p>
            <div className="divide-y divide-border">
              {history.slice(0, 5).map((v, i) => (
                <div key={v.version || i} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Version {v.version}</p>
                    <p className="text-[13px] text-muted-foreground">{v.published_at ? format(new Date(v.published_at), 'MMM d, h:mm a') : 'Draft'}</p>
                  </div>
                  <Button variant="link" size="sm" onClick={() => onRollback(v)}>
                    <RotateCcw /> Restore
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
