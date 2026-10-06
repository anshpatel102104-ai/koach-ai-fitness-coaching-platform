import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { Panel, Segmented, EmptyState } from '@/components/kit';
import { Button } from '@/components/ui/button';
import PackageCard, { PackageListHeader } from './PackageCard';
import PackageFormModal from './PackageFormModal';
import ShareLinkModal from './ShareLinkModal';

/** Package table with active/archived filter, form and share dialog. Used by /packages and /business. */
export default function PackagesWorkspace({ showForm, setShowForm, editingPkg, setEditingPkg }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState('active');
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
      toast.success('Package created');
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
    toast.success('Duplicated as an inactive draft');
    refresh();
  };

  return (
    <>
      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-border">
          <Segmented
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'active', label: 'Active', count: active.length },
              { value: 'archived', label: 'Archived', count: archived.length },
            ]}
          />
          <p className="hidden sm:block text-[13px] text-muted-foreground">Clients sign up from each package's link.</p>
        </div>

        {isLoading ? (
          <p className="px-6 py-10 text-sm text-muted-foreground">Loading packages…</p>
        ) : displayed.length === 0 ? (
          tab === 'archived'
            ? <EmptyState title="Nothing archived" body="Packages you archive stay here and can be restored." />
            : <EmptyState
                title="No packages yet"
                body="A package bundles what you offer at a price, with a page clients can sign up from."
                action={<Button onClick={() => { setEditingPkg(null); setShowForm(true); }}>Create a package</Button>}
              />
        ) : (
          <>
            <PackageListHeader />
            {displayed.map(pkg => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                onEdit={() => { setEditingPkg(pkg); setShowForm(true); }}
                onDuplicate={() => handleDuplicate(pkg)}
                onArchive={() => (tab === 'archived' ? handleUnarchive(pkg) : handleArchive(pkg))}
                onDelete={() => handleDelete(pkg)}
                onToggleActive={() => handleToggleActive(pkg)}
                onShare={() => setSharingPkg(pkg)}
              />
            ))}
          </>
        )}
      </Panel>

      {showForm && (
        <PackageFormModal
          pkg={editingPkg}
          onClose={() => { setShowForm(false); setEditingPkg(null); }}
          onSave={handleSave}
        />
      )}

      {sharingPkg && <ShareLinkModal pkg={sharingPkg} onClose={() => setSharingPkg(null)} />}
    </>
  );
}
