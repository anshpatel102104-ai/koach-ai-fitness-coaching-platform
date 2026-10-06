import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus } from 'lucide-react';
import { Page, PageHeader } from '@/components/kit';
import { Button } from '@/components/ui/button';
import PackagesWorkspace from '@/components/packages/PackagesWorkspace';
import { BillingNav, plural } from '@/components/business/ui';

export default function Packages() {
  const [showForm, setShowForm] = useState(false);
  const [editingPkg, setEditingPkg] = useState(null);

  // Same query key as the workspace, so this is shared, not a second fetch.
  const { data: packages = [] } = useQuery({
    queryKey: ['coaching-packages'],
    queryFn: () => db.entities.CoachingPackage.list('-created_date', 100),
  });
  const selling = packages.filter(p => p.is_active && !p.is_archived);
  const enrolled = packages.reduce((s, p) => s + (p.enrolled_count || 0), 0);

  return (
    <Page>
      <PageHeader
        title="Billing"
        subtitle={packages.length
          ? `${plural(selling.length, 'package')} on sale, ${plural(enrolled, 'client')} enrolled.`
          : 'Bundle what you offer, set a price, and share one link.'}
        actions={(
          <Button onClick={() => { setEditingPkg(null); setShowForm(true); }}>
            <Plus /> New package
          </Button>
        )}
      />
      <BillingNav className="mb-5" />
      <PackagesWorkspace showForm={showForm} setShowForm={setShowForm} editingPkg={editingPkg} setEditingPkg={setEditingPkg} />
    </Page>
  );
}
