import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as base44 } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, X, Check, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignedImg } from '@/components/shared/SignedImage';

function avatarColor(name) {
  const colors = ['bg-accent text-primary', 'bg-ai/10 text-ai', 'bg-success/10 text-success', 'bg-warning/10 text-warning', 'bg-destructive/10 text-destructive'];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}

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
    queryFn: () => base44.entities.Client.list('name'),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit
      ? base44.entities.CommunityGroup.update(group.id, data)
      : base44.entities.CommunityGroup.create(data),
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
    const { file_url } = await base44.uploadFile({ file, scope: 'shared' });
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
          <DialogTitle className="text-foreground font-semibold">
            {isEdit ? 'Edit Group' : 'Create Community'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-1">
          {/* Name */}
          <div>
            <Label className="text-xs font-semibold text-foreground">Group Name *</Label>
            <Input className="mt-1" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. HYROX Crew, Fat Loss Group" />
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs font-semibold text-foreground">Description</Label>
            <Input className="mt-1" value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this group about?" />
          </div>

          {/* Cover image */}
          <div>
            <Label className="text-xs font-semibold text-foreground">Cover Image (optional)</Label>
            <div className="mt-1 flex items-center gap-3">
              {coverUrl ? (
                <div className="relative w-20 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <SignedImg src={coverUrl} alt="cover" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setCoverUrl('')}
                    className="absolute top-1 right-1 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center">
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-12 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <label className="flex-1 cursor-pointer text-xs font-semibold text-primary hover:text-primary">
                {uploading ? 'Uploading…' : 'Upload photo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          {/* Member picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold text-foreground">Members</Label>
              {selectedIds.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-primary">
                  {selectedIds.length} selected
                </span>
              )}
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search clients…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg bg-card p-2">
              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No clients found</p>
              ) : filtered.map(c => {
                const selected = selectedIds.includes(c.id);
                return (
                  <button key={c.id} type="button" onClick={() => toggle(c.id)}
                    className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left',
                      selected ? 'bg-accent/10 border border-accent' : 'hover:bg-background border border-transparent')}>
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0', avatarColor(c.name))}>
                      {c.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                    </div>
                    {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button type="button" onClick={() => onOpenChange(false)}
              className="px-4 py-2 border border-border text-sm font-semibold text-foreground rounded-lg hover:bg-background transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saveMutation.isPending || !name.trim()}
              className="px-4 py-2 text-sm font-semibold text-primary-foreground rounded-lg transition-colors disabled:opacity-40"
              style={{ background: 'var(--tc-primary)' }}>
              {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}