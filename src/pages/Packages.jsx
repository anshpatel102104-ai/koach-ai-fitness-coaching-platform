import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus, Package, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import PackageCard from '@/components/packages/PackageCard';
import PackageFormModal from '@/components/packages/PackageFormModal';
import ShareLinkModal from '@/components/packages/ShareLinkModal';

function EmptyState({ archived }) {
  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--tc-foreground)', margin: '0 0 8px' }}>
        {archived ? 'No archived packages' : 'No packages yet'}
      </h3>
      <p style={{ fontSize: 14, color: 'var(--tc-muted-foreground)', margin: 0 }}>
        {archived ? 'Archived packages will appear here.' : 'Create your first coaching package to start selling your services.'}
      </p>
    </div>
  );
}

export default function Packages() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState('active');
  const [showForm, setShowForm] = useState(false);
  const [editingPkg, setEditingPkg] = useState(null);
  const [sharingPkg, setSharingPkg] = useState(null);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['coaching-packages'],
    queryFn: () => db.entities.CoachingPackage.list('-created_date', 100),
  });

  const active = packages.filter(p => !p.is_archived);
  const archived = packages.filter(p => p.is_archived);
  const displayed = tab === 'active' ? active : archived;

  const refresh = () => qc.invalidateQueries({ queryKey: ['coaching-packages'] });

  const handleSave = async (data) => {
    if (editingPkg?.id) {
      await db.entities.CoachingPackage.update(editingPkg.id, data);
      toast.success('Package updated');
    } else {
      await db.entities.CoachingPackage.create(data);
      toast.success('Package created! 🎉');
    }
    refresh();
    setShowForm(false);
    setEditingPkg(null);
  };

  const handleToggleActive = async (pkg) => {
    await db.entities.CoachingPackage.update(pkg.id, { is_active: !pkg.is_active });
    refresh();
  };

  const handleArchive = async (pkg) => {
    await db.entities.CoachingPackage.update(pkg.id, { is_archived: true, is_active: false });
    toast.success('Package archived');
    refresh();
  };

  const handleUnarchive = async (pkg) => {
    await db.entities.CoachingPackage.update(pkg.id, { is_archived: false });
    toast.success('Package restored');
    refresh();
  };

  const handleDelete = async (pkg) => {
    if (!confirm(`Delete "${pkg.name}"? This cannot be undone.`)) return;
    await db.entities.CoachingPackage.delete(pkg.id);
    toast.success('Package deleted');
    refresh();
  };

  const handleDuplicate = async (pkg) => {
    const { id, created_date, updated_date, created_by, enrolled_count, total_revenue, ...rest } = pkg;
    await db.entities.CoachingPackage.create({
      ...rest,
      name: `${rest.name} (Copy)`,
      is_active: false,
      slug: `${rest.slug || 'package'}-copy`,
    });
    toast.success('Package duplicated as inactive draft');
    refresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--tc-background)' }}>
      {/* Header */}
      <div style={{ background: 'var(--tc-card)', borderBottom: '1px solid var(--tc-muted)', padding: '16px 24px', flexShrink: 0 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => navigate('/business?tab=invoicing')}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--tc-muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <ArrowLeft size={14} /> Business
              </button>
              <span style={{ color: 'var(--tc-muted-foreground)' }}>›</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={18} color="var(--tc-primary)" />
                <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--tc-foreground)', margin: 0, letterSpacing: '-0.02em' }}>Coaching Packages</h1>
              </div>
            </div>
            <button onClick={() => { setEditingPkg(null); setShowForm(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, fontSize: 14, fontWeight: 700, background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))', color: 'var(--tc-primary-foreground)', border: 'none', cursor: 'pointer', boxShadow: '0 0 16px color-mix(in srgb, var(--tc-primary) 25%, transparent)' }}>
              <Plus size={16} /> Create Package
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--tc-muted-foreground)', margin: '6px 0 0 0' }}>
            Bundle your services, set your prices, and let clients enroll online.
          </p>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
            {[
              { key: 'active', label: `Active Packages`, count: active.length },
              { key: 'archived', label: 'Archived', count: archived.length },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ padding: '8px 16px', fontSize: 13, fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)', border: 'none', borderBottom: `2px solid ${tab === t.key ? 'var(--tc-primary)' : 'transparent'}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {t.label}
                {t.count > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 9999, background: tab === t.key ? 'var(--tc-accent)' : 'var(--tc-muted)', color: tab === t.key ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)' }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--tc-muted-foreground)', fontSize: 14 }}>Loading packages…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {displayed.length === 0 ? (
                <EmptyState archived={tab === 'archived'} />
              ) : displayed.map(pkg => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  onEdit={() => { setEditingPkg(pkg); setShowForm(true); }}
                  onDuplicate={() => handleDuplicate(pkg)}
                  onArchive={() => tab === 'archived' ? handleUnarchive(pkg) : handleArchive(pkg)}
                  onDelete={() => handleDelete(pkg)}
                  onToggleActive={() => handleToggleActive(pkg)}
                  onShare={() => setSharingPkg(pkg)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <PackageFormModal
          pkg={editingPkg}
          onClose={() => { setShowForm(false); setEditingPkg(null); }}
          onSave={handleSave}
        />
      )}

      {sharingPkg && (
        <ShareLinkModal pkg={sharingPkg} onClose={() => setSharingPkg(null)} />
      )}
    </div>
  );
}