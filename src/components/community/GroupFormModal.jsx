import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, X, Check, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Initials } from '@/components/kit';
import { SignedImg } from '@/components/shared/SignedImage';


export default function GroupFormModal({ open, onOpenChange, group, currentUser }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');

  const isEdit = !!group;

  useEffect(() => {
    if (group) {
      setName(group.name || '');
      setDescription(group.description || '');
      setSelectedIds(group.member_ids || []);
      setCoverUrl(group.cover_image_url || '');
    } else {
      setName(''); setDescription(''); setSelectedIds([]); setCoverUrl('');
    }
  }, [group, open]);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list('name'),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit
      ? db.entities.CommunityGroup.update(group.id, data)
      : db.entities.CommunityGroup.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-groups'] });
      onOpenChange(false);
    },
  });

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await db.uploadFile({ file, scope: 'shared' });
    setCoverUrl(file_url);
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      name,
      description,
      member_ids: selectedIds,
      coach_id: currentUser?.id,
      cover_image_url: coverUrl,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit group' : 'New group'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-1">
          {/* Name */}
          <div>
            <Label>Name</Label>
            <Input className="mt-1" required value={name} onChange={e => setName(e.target.value)} placeholder="HYROX crew" />
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Input className="mt-1" value={description} onChange={e => setDescription(e.target.value)} placeholder="Who it's for, in one line" />
          </div>

          {/* Cover image */}
          <div>
            <Label>Cover image, optional</Label>
            <div className="mt-1 flex items-center gap-3">
              {coverUrl ? (
                <div className="relative w-20 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <SignedImg src={coverUrl} alt="cover" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setCoverUrl('')}
                    className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center" aria-label="Remove cover">
                    <X className="w-3 h-3 text-primary-foreground" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <label className="cursor-pointer text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2">
                {uploading ? 'Uploading…' : 'Upload photo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          {/* Member picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Members</Label>
              {selectedIds.length > 0 && (
                <span className="text-[13px] text-muted-foreground">{selectedIds.length} selected</span>
              )}
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Find a client"
                className="w-full h-10 pl-8 pr-3 text-sm border border-input rounded-md bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-border border border-border rounded-lg bg-card">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground px-3 py-4">No client matches that.</p>
              ) : filtered.map(c => {
                const selected = selectedIds.includes(c.id);
                return (
                  <button key={c.id} type="button" onClick={() => toggle(c.id)}
                    className={cn('w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left',
                      selected ? 'bg-accent' : 'hover:bg-accent/50')} aria-pressed={selected}>
                    <Initials name={c.name || ''} size={30} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                      <p className="text-[13px] text-muted-foreground truncate">{c.email}</p>
                    </div>
                    {selected && <Check className="w-4 h-4 text-foreground flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending || !name.trim()}>
              {saveMutation.isPending ? 'Saving' : isEdit ? 'Save changes' : 'Create group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}