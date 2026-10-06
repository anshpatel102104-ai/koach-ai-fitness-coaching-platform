import React, { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import {
  Plus, X, Image as ImageIcon, EyeOff, Megaphone, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Initials, InkPanel } from '@/components/kit';
import { Sheet } from '@/components/portal/PortalUI';
import { formatDistanceToNow } from 'date-fns';
import PostCard from './PostCard';
import ChallengeCard from './ChallengeCard';
import { SignedImg } from '@/components/shared/SignedImage';

function PostComposer({ user, myClient, onPost, onClose, groupId }) {
  const [text, setText] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [mediaUrl, setMediaUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await portalDb.uploadFile({ file, scope: 'community' });
    setMediaUrl(file_url);
    setUploading(false);
  };

  const handlePost = () => {
    if (!text.trim()) return;
    onPost({
      author_id: user?.id || myClient?.id || 'unknown',
      author_name: anonymous ? 'Community Member' : (user?.full_name || myClient?.name || 'Member'),
      is_anonymous: anonymous,
      content: text.trim(),
      media_urls: mediaUrl ? [mediaUrl] : [],
      type: 'post',
      reactions: {},
      comment_count: 0,
      is_hidden: false,
      group_id: groupId || undefined,
    });
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title="New post"
      footer={(
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <ImageIcon /> {uploading ? 'Uploading' : 'Photo'}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <Button variant={anonymous ? 'default' : 'outline'} size="sm" onClick={() => setAnonymous(!anonymous)} aria-pressed={anonymous}>
            <EyeOff /> Anonymous
          </Button>
          <Button className="ml-auto" onClick={handlePost} disabled={!text.trim()}>Post</Button>
        </div>
      )}>
      <div className="flex items-center gap-3">
        <Initials name={anonymous ? '?' : (user?.full_name || myClient?.name || 'You')} size={36} />
        <p className="text-[15px] font-semibold text-foreground">
          {anonymous ? 'Posting anonymously' : (user?.full_name || myClient?.name || 'You')}
        </p>
      </div>
      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Share a win, ask a question, or say hello."
        className="mt-3 text-base"
        rows={5}
      />
      {mediaUrl && (
        <div className="relative mt-2 overflow-hidden rounded-lg">
          <SignedImg src={mediaUrl} alt="" className="max-h-40 w-full object-cover" />
          <button type="button" onClick={() => setMediaUrl(null)} aria-label="Remove photo"
            className="touch-compact absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </Sheet>
  );
}

export default function CommunityFeedTab({ user, myClient, posts, allClients, queryClient, groupId }) {
  const [showComposer, setShowComposer] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(
    () => localStorage.getItem('community_guidelines_accepted') === 'true'
  );

  const { data: challenges = [] } = useQuery({
    queryKey: ['challenges-active', groupId],
    queryFn: () => groupId
      ? portalDb.entities.Challenge.filter({ is_active: true, group_id: groupId }, '-created_date', 5)
      : portalDb.entities.Challenge.filter({ is_active: true }, '-created_date', 5),
  });

  const createPost = useMutation({
    mutationFn: (data) => portalDb.entities.CommunityPost.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-posts'] }),
  });

  const announcements = posts.filter(p => p.is_announcement && !p.is_hidden);
  const regularPosts = posts.filter(p => !p.is_announcement && !p.is_hidden);
  const activeChallenge = challenges[0];

  if (!guidelinesAccepted) {
    return (
      <section className="panel p-5">
        <h2 className="text-[24px] text-foreground">Before you post</h2>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
          This group is for people training with the same coach. Your coach can see and review every post.
        </p>
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {['Be supportive. Celebrate other people\'s wins.', 'Respect everyone\'s pace and starting point.', 'No spam or selling.', 'What\'s shared here stays with group members.'].map(g => (
            <li key={g} className="flex items-center gap-2.5 py-2.5 text-[15px] text-foreground">
              <Check className="h-4 w-4 flex-shrink-0 text-success" strokeWidth={3} /> {g}
            </li>
          ))}
        </ul>
        <Button size="lg" className="mt-4 w-full" onClick={() => { localStorage.setItem('community_guidelines_accepted', 'true'); setGuidelinesAccepted(true); }}>
          I agree, show the group
        </Button>
      </section>
    );
  }

  return (
    <div className="relative space-y-3">
      {announcements.map(post => (
        <InkPanel key={post.id} className="p-4 sm:p-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-ai-foreground/70">
            <Megaphone className="h-3.5 w-3.5" /> Announcement
          </p>
          <p className="text-[15px] font-semibold leading-relaxed text-ai-foreground">{post.content}</p>
          <p className="mt-2 text-[13px] text-ai-foreground/60">
            {post.created_date ? formatDistanceToNow(new Date(post.created_date), { addSuffix: true }) : ''}
          </p>
        </InkPanel>
      ))}

      {/* Active Challenge */}
      {activeChallenge && (
        <ChallengeCard challenge={activeChallenge} myClient={myClient} queryClient={queryClient} />
      )}

      {/* Feed */}
      {regularPosts.length === 0 ? (
        <section className="panel px-4 py-6">
          <p className="text-[15px] font-semibold text-foreground">No posts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Be the first. Say hello and what you're training for.</p>
          <Button className="mt-4" onClick={() => setShowComposer(true)}>Write a post</Button>
        </section>
      ) : (
        regularPosts.map(post => (
          <PostCard key={post.id} post={post} user={user} myClient={myClient} queryClient={queryClient} />
        ))
      )}

      {/* New post button */}
      <button type="button" onClick={() => setShowComposer(true)} aria-label="New post"
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md md:right-[calc(50%-224px)]">
        <Plus className="h-6 w-6" />
      </button>

      {showComposer && (
        <PostComposer user={user} myClient={myClient} groupId={groupId}
          onPost={(data) => createPost.mutate(data)}
          onClose={() => setShowComposer(false)} />
      )}
    </div>
  );
}
