import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Download } from 'lucide-react';

export default function QRCodeGenerator({ coachId }) {
  const [selectedLink, setSelectedLink] = useState(null);
  const [fgColor, setFgColor] = useState('var(--tc-primary)');
  const [bgColor, setBgColor] = useState('var(--tc-card)');
  const [size, setSize] = useState('medium');

  const { data: links = [] } = useQuery({
    queryKey: ['marketing-links', coachId],
    queryFn: () => db.entities.MarketingLink.filter({ coach_id: coachId }, '-created_at'),
    enabled: !!coachId,
  });

  const sizes = { small: '200px', medium: '400px', large: '800px' };

  // Demo QR code using QR API
  const generateQRUrl = (url) => {
    const size = sizes[size] || '400px';
    const sizeNum = parseInt(size);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${sizeNum}x${sizeNum}&data=${encodeURIComponent(url)}&color=${fgColor.replace('#', '')}&bgcolor=${bgColor.replace('#', '')}`;
  };

  const qrUrl = selectedLink ? generateQRUrl(selectedLink.full_url) : null;

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h2 className="text-lg font-black text-foreground mb-6">QR Code Generator</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Select Link</label>
            <select
              value={selectedLink?.id || ''}
              onChange={(e) => setSelectedLink(links.find(l => l.id === e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Choose a link...</option>
              {links.map(link => (
                <option key={link.id} value={link.id}>{link.link_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Foreground Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)}
                className="w-12 h-10 rounded-lg border border-border cursor-pointer" />
              <span className="text-sm text-muted-foreground font-mono">{fgColor}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Background Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                className="w-12 h-10 rounded-lg border border-border cursor-pointer" />
              <span className="text-sm text-muted-foreground font-mono">{bgColor}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Size</label>
            <div className="flex gap-2">
              {Object.keys(sizes).map(s => (
                <button key={s} onClick={() => setSize(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    size === s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground hover:bg-border'
                  }`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-3">Use cases:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Business cards</li>
              <li>• Flyers & posters</li>
              <li>• Email signatures</li>
              <li>• Gym walls</li>
            </ul>
          </div>
        </div>

        {/* Preview & Download */}
        <div className="space-y-4">
          {qrUrl ? (
            <>
              <div className="flex items-center justify-center p-8 rounded-lg border border-border" style={{ background: bgColor }}>
                <img src={qrUrl} alt="QR Code" className="max-w-full" style={{ width: sizes[size] }} />
              </div>
              <div className="flex gap-2">
                <a href={qrUrl} download="qr-code.png"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary">
                  <Download className="w-4 h-4" /> Download PNG
                </a>
              </div>
            </>
          ) : (
            <div className="h-80 flex items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground">
              <p className="text-center">Select a link to generate QR code</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}