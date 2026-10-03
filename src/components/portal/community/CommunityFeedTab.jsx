import React, { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabasePortal as base44 } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Image as ImageIcon, EyeOff, Megaphone
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import PostCard from './PostCard';
import ChallengeCard from './ChallengeCard';
import { SignedImg } from '@/components/shared/SignedImage';

const REACTION_EMOJIS = ['🔥', '💪', '❤️', '🏆', '👏'];

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
    const { file_url } = await base44.uploadFile({ file, scope: 'community' });
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}>
      <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
        className="w-full bg-card rounded-t-3xl p-5 pb-8"
        style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.1)' }}
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground font-black text-base">Share with Community</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Author row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
            style={{ background: anonymous ? 'rgb(var(--muted-foreground))' : 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }}>
            {anonymous ? '?' : (user?.full_name || 'U')[0].toUpperCase()}
          </div>
          <p className="text-foreground font-semibold text-sm">
            {anonymous ? 'Posting anonymously' : (user?.full_name || myClient?.name || 'You')}
          </p>
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Share a win, ask a question, or say hello! 👋"
          className="w-full p-3 rounded-2xl bg-muted border border-border text-foreground text-sm resize-none focus:outline-none focus:border-primary"
          rows={4}
        />

        {mediaUrl && (
          <div className="relative mt-2 rounded-xl overflow-hidden">
            <SignedImg src={mediaUrl} alt="attachment" className="w-full max-h-40 object-cover" />
            <button onClick={() => setMediaUrl(null)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
              <ImageIcon size={16} />
              {uploading ? 'Uploading...' : 'Photo'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

            <button onClick={() => setAnonymous(!anonymous)}
              className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${anonymous ? 'text-primary' : 'text-muted-foreground'}`}>
              <EyeOff size={16} />
              Anonymous
            </button>
          </div>

          <button onClick={handlePost} disabled={!text.trim()}
            className="px-5 py-2 rounded-xl text-sm font-black text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }}>
            Post
          </button>
        </div>
      </motion.div>
    </motion.div>
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
      ? base44.entities.Challenge.filter({ is_active: true, group_id: groupId }, '-created_date', 5)
      : base44.entities.Challenge.filter({ is_active: true }, '-created_date', 5),
  });

  const createPost = useMutation({
    mutationFn: (data) => base44.entities.CommunityPost.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-posts'] }),
  });

  const announcements = posts.filter(p => p.is_announcement && !p.is_hidden);
  const regularPosts = posts.filter(p => !p.is_announcement && !p.is_hidden);
  const activeChallenge = challenges[0];

  if (!guidelinesAccepted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-3xl"
          style={{ background: 'linear-gradient(135deg, rgb(var(--accent)), rgb(var(--ai)))' }}>
          🤝
        </div>
        <h2 className="text-foreground font-black text-xl mb-2">Community Guidelines</h2>
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">
          Be kind, supportive, and respectful. Celebrate each other's wins. No negative comments, spam, or off-topic content. All posts may be reviewed by your coach.
        </p>
        <div className="text-left w-full max-w-xs space-y-2 mb-6">
          {['Be supportive and positive 🙌', 'Respect everyone\'s journey 💙', 'No spam or self-promotion 🚫', 'Content is private to members 🔒'].map(g => (
            <div key={g} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-success" />
              </div>
              <p className="text-muted-foreground text-sm">{g}</p>
            </div>
          ))}
        </div>
        <button onClick={() => { localStorage.setItem('community_guidelines_accepted', 'true'); setGuidelinesAccepted(true); }}
          className="w-full py-4 rounded-2xl font-black text-white text-base"
          style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }}>
          I Agree — Join Community
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="space-y-0 pb-4">
        {announcements.map(post => (
          <div key={post.id} className="mx-4 mt-4">
            <div className="rounded-2xl p-4 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))', boxShadow: '0 4px 20px rgb(var(--primary) / 0.25)' }}>
              <div className="flex items-start gap-2 mb-2">
                <Megaphone className="w-4 h-4 text-white/70 mt-0.5 flex-shrink-0" />
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Announcement</p>
              </div>
              <p className="text-white font-bold text-sm leading-relaxed">{post.content}</p>
              <p className="text-white/50 text-[10px] mt-2">
                {post.created_date ? formatDistanceToNow(new Date(post.created_date), { addSuffix: true }) : ''}
              </p>
            </div>
          </div>
        ))}

        {/* Active Challenge */}
        {activeChallenge && (
          <div className="mx-4 mt-4">
            <ChallengeCard challenge={activeChallenge} myClient={myClient} queryClient={queryClient} />
          </div>
        )}

        {/* Feed */}
        {regularPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-foreground font-black text-lg mb-2">Welcome to the Community!</h3>
            <p className="text-muted-foreground text-sm mb-6">Be the first to post and introduce yourself to the group.</p>
            <button onClick={() => setShowComposer(true)}
              className="px-6 py-3 rounded-2xl font-black text-white"
              style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }}>
              Say Hello 👋
            </button>
          </div>
        ) : (
          <div className="mt-4">
            {regularPosts.map(post => (
              <PostCard key={post.id} post={post} user={user} myClient={myClient} queryClient={queryClient} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowComposer(true)}
        className="fixed bottom-28 right-5 w-14 h-14 rounded-full flex items-center justify-center z-40"
        style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))', boxShadow: '0 4px 20px rgb(var(--primary) / 0.4)' }}>
        <Plus className="w-6 h-6 text-white" />
      </motion.button>

      <AnimatePresence>
        {showComposer && (
          <PostComposer user={user} myClient={myClient} groupId={groupId}
            onPost={(data) => createPost.mutate(data)}
            onClose={() => setShowComposer(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}