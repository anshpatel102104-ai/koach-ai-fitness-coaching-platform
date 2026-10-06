import React from 'react';
import { WLSection, WLRow, WLSelect, WLPlanNote } from './WLHelpers';

const FONTS = [
  { value: 'system', label: 'System default (SF Pro, Roboto)' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
];

const WEIGHTS = [
  { value: '400', label: 'Regular (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semibold (600)' },
  { value: '700', label: 'Bold (700)' },
  { value: '800', label: 'Extra bold (800)' },
];

const WEIGHT_MAP = { '400': 400, '500': 500, '600': 600, '700': 700, '800': 800 };

export default function WLTypography({ s, set, locked, enterpriseLocked }) {
  const font = s.font_primary === 'system' ? 'inherit' : (s.font_primary || 'Inter');
  const weight = WEIGHT_MAP[s.font_heading_weight || '700'];

  return (
    <WLSection title="Typography"
      description="The typeface clients read in your app." locked={locked}>

      <WLRow label="Primary font" hint="Used across the client app.">
        <WLSelect value={s.font_primary || 'Inter'} onChange={v => set('font_primary', v)} options={FONTS} />
      </WLRow>

      <WLRow label="Heading weight" hint="For titles and headings.">
        <WLSelect value={s.font_heading_weight || '700'} onChange={v => set('font_heading_weight', v)} options={WEIGHTS} />
      </WLRow>

      <WLRow label="Preview">
        <div className="rounded-lg bg-secondary p-5">
          <p className="mb-3 text-[13px] text-muted-foreground">{s.font_primary || 'Inter'}</p>
          <h2 className="text-2xl mb-1" style={{ fontFamily: font, fontWeight: weight }}>
            {s.business_name || 'Your coaching business'}
          </h2>
          <p className="text-base mb-1" style={{ fontFamily: font, fontWeight: 600 }}>Weekly check-in due</p>
          <p className="text-sm text-muted-foreground" style={{ fontFamily: font, fontWeight: 400 }}>
            Three workouts logged and steps up 12% on last week.
          </p>
          <div className="flex gap-2 mt-3">
            <span className="inline-flex h-9 items-center rounded-md px-4 text-sm text-white" style={{ fontFamily: font, fontWeight: 600, background: s.primary_color || '#0A5CFF' }}>
              Start workout
            </span>
            <span className="inline-flex h-9 items-center rounded-md border border-input bg-card px-4 text-sm text-foreground" style={{ fontFamily: font }}>
              View plan
            </span>
          </div>
        </div>
      </WLRow>

      {enterpriseLocked && (
        <WLRow label="Your own font files" hint="Upload a licensed font for your app.">
          <WLPlanNote>Enterprise plan</WLPlanNote>
        </WLRow>
      )}
    </WLSection>
  );
}