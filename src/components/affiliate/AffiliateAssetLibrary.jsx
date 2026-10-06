import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel, PanelHeader, InkPanel } from '@/components/kit';

const ASSETS_BY_TYPE = {
  banners: [
    { name: 'Square post', sizes: '1080×1080', formats: 'PNG, JPG' },
    { name: 'Story', sizes: '1080×1920', formats: 'PNG, JPG' },
    { name: 'Facebook link image', sizes: '1200×628', formats: 'PNG, JPG' },
  ],
  videos: [
    { name: 'App demo', duration: '15 seconds', format: 'MP4' },
    { name: 'Feature highlight', duration: '30 seconds', format: 'MP4' },
    { name: 'Full overview', duration: '60 seconds', format: 'MP4' },
  ],
  copy: [
    { name: 'Instagram captions', count: '5 templates' },
    { name: 'Posts for X', count: '10 templates' },
    { name: 'Email newsletter', count: '1 template' },
    { name: 'YouTube descriptions', count: '1 template' },
    { name: 'LinkedIn posts', count: '1 template' },
    { name: 'Blog post outline', count: '1 template' },
  ],
  talking_points: [
    { name: 'Key features', desc: 'The ten features coaches ask about' },
    { name: 'Compared with other apps', desc: 'Side-by-side with the usual alternatives' },
    { name: 'Common objections', desc: 'What people push back on, and honest answers' },
    { name: 'Pricing', desc: 'How to talk about cost and value' },
  ],
};

export default function AffiliateAssetLibrary({ tier }) {
  const isGoldPlus = ['gold', 'platinum'].includes(tier);

  const downloadAsset = (name) => {
    // Placeholder - in real app would download from CDN
    alert(`Downloading: ${name}`);
  };

  const Group = ({ title, items, detail, action = 'Download' }) => (
    <Panel>
      <PanelHeader title={title} />
      <ul className="divide-y divide-border px-5 sm:px-6 pb-1">
        {items.map((asset) => (
          <li key={asset.name} className="flex items-center gap-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-foreground">{asset.name}</p>
              <p className="text-[13px] text-muted-foreground">{detail(asset)}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => downloadAsset(asset.name)}>
              {action === 'Download' && <Download />}{action}
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      <Group title="Banners and images" items={ASSETS_BY_TYPE.banners} detail={(a) => `${a.sizes}, ${a.formats}`} />
      <Group title="Videos" items={ASSETS_BY_TYPE.videos} detail={(a) => `${a.duration}, ${a.format}`} />
      <Group title="Copy templates" items={ASSETS_BY_TYPE.copy} detail={(a) => a.count} action="View" />
      <Group title="Talking points" items={ASSETS_BY_TYPE.talking_points} detail={(a) => a.desc} action="View" />
      <Group title="Logo" items={[{ name: 'KOACH AI logo' }]} detail={() => 'PNG, SVG and AI files, plus usage guidelines'} />

      {isGoldPlus && (
        <InkPanel title="Custom assets" footer={<Button className="bg-ai-foreground text-ai hover:bg-ai-foreground/90">Request custom assets</Button>}>
          <p>As a {tier} affiliate you can ask us for co-branded posts with your logo, a custom landing page, or personalised video.</p>
        </InkPanel>
      )}
    </div>
  );
}
