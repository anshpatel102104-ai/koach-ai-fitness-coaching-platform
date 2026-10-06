import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Download } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Panel, PanelHeader, Segmented } from '@/components/kit';
import { selectClass } from './MarketingLinksSection';

// The QR image is rendered by a third-party API, so colours are plain hex values.
const DEFAULT_FG = '#111318';
const DEFAULT_BG = '#ffffff';

export default function QRCodeGenerator({ coachId }) {
  const [selectedLink, setSelectedLink] = useState(null);
  const [fgColor, setFgColor] = useState(DEFAULT_FG);
  const [bgColor, setBgColor] = useState(DEFAULT_BG);
  const [size, setSize] = useState('medium');

  const { data: links = [] } = useQuery({
    queryKey: ['marketing-links', coachId],
    queryFn: () => db.entities.MarketingLink.filter({ coach_id: coachId }, '-created_at'),
    enabled: !!coachId,
  });

  const sizes = { small: '200px', medium: '400px', large: '800px' };

  const generateQRUrl = (url) => {
    const px = sizes[size] || '400px';
    const sizeNum = parseInt(px, 10);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${sizeNum}x${sizeNum}&data=${encodeURIComponent(url)}&color=${fgColor.replace('#', '')}&bgcolor=${bgColor.replace('#', '')}`;
  };

  const qrUrl = selectedLink ? generateQRUrl(selectedLink.full_url) : null;

  return (
    <Panel>
      <PanelHeader title="QR codes" subtitle="For business cards, flyers, email signatures and the wall at your gym." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-5 sm:px-6 pb-6">
        <div className="space-y-5">
          <div>
            <Label htmlFor="qr-link">Link</Label>
            <select id="qr-link" value={selectedLink?.id || ''} onChange={(e) => setSelectedLink(links.find(l => l.id === e.target.value))} className={`${selectClass} mt-1.5`}>
              <option value="">Choose a link</option>
              {links.map(link => <option key={link.id} value={link.id}>{link.link_name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="qr-fg">Code colour</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <input id="qr-fg" type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="w-10 h-10 rounded-md border border-input cursor-pointer bg-card" />
                <span className="text-sm text-muted-foreground font-mono">{fgColor}</span>
              </div>
            </div>
            <div>
              <Label htmlFor="qr-bg">Background</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <input id="qr-bg" type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-10 h-10 rounded-md border border-input cursor-pointer bg-card" />
                <span className="text-sm text-muted-foreground font-mono">{bgColor}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-1.5">Size</p>
            <Segmented size="sm" value={size} onChange={setSize} options={Object.keys(sizes).map(s => ({ value: s, label: `${s.charAt(0).toUpperCase() + s.slice(1)}, ${parseInt(sizes[s], 10)} px` }))} />
          </div>
        </div>

        <div>
          {qrUrl ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center p-6 rounded-lg bg-secondary">
                <img src={qrUrl} alt={`QR code for ${selectedLink.link_name}`} className="max-w-full w-[240px] rounded-sm" style={{ background: bgColor }} />
              </div>
              <a href={qrUrl} download="qr-code.png" className="inline-flex w-full items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/85">
                <Download className="w-4 h-4" /> Download PNG
              </a>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center rounded-lg border border-dashed border-input text-sm text-muted-foreground px-6 text-center">
              Choose a link and the code appears here.
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
