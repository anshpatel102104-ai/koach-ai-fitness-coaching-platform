import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabasePortal as base44 } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, MoreHorizontal, Flag, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { SignedImg } from '@/components/shared/SignedImage';

const REACTIONS = [
  { emoji: '🔥', key: 'fire' },
  { emoji: '💪', key: 'muscle' },
  { emoji: '❤️', key: 'heart' },
  { emoji: '🏆', key: 'trophy' },
  { emoji: '👏', key: 'clap' },
];

function Avatar({ name, isCoach, isAnon, size = 9 }) {
  const initials = isAnon ? '?' : (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0`}
      style={{
        background: isAnon ? 'rgb(var(--muted-foreground))' : isCoach ? 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' : 'linear-gradient(135deg, rgb(var(--success)), rgb(var(--success)))',
        width: size * 4, height: size * 4,
      }}>
      {initials}
    </div>
  );
}

function CommentItem({ comment }) {
  return (
    <div className="flex gap-2.5 py-2">
      <Avatar name={comment.author_name} isCoach={comment.is_coach} isAnon={!comment.author_name} size={8} />
      <div className="flex-1 min-w-0">
        <div className="bg-muted rounded-2xl px-3 py-2">
          <p className="text-foreground text-xs font-bold">{comment.author_name || 'Community Member'}
            {comment.is_coach && <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[8px] font-black text-white" style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }}>COACH</span>}
          </p>
          <p className="text-foreground text-xs mt-0.5 leading-relaxed">{comment.content}</p>
        </div>
        <p className="text-border text-[9px] mt-1 ml-2">
          {comment.created_date ? formatDistanceToNow(new Date(comment.created_date), { addSuffix: true }) : ''}
        </p>
      </div>
    </div>
  );
}

export default function PostCard({ post, user, myClient, queryClient }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);

  const userId = user?.id || myClient?.id || '';

  const { data: comments = [] } = useQuery({
    queryKey: ['post-comments', post.id],
    queryFn: () => base44.entities.PostComment.filter({ post_id: post.id }, 'created_date', 100),
    enabled: showComments,
  });

  const reactMutation = useMutation({
    mutationFn: async ({ key }) => {
      const reactions = { ...(post.reactions || {}) };
      const arr = reactions[key] || [];
      if (arr.includes(userId)) {
        reactions[key] = arr.filter(id => id !== userId);
      } else {
        reactions[key] = [...arr, userId];
      }
      return base44.entities.CommunityPost.update(post.id, { reactions });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-posts'] }),
  });

  const addComment = useMutation({
    mutationFn: (content) => base44.entities.PostComment.create({
      post_id: post.id,
      author_id: userId,
      author_name: user?.full_name || myClient?.name || 'Member',
      content,
      is_coach: false,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', post.id] });
      setCommentText('');
    },
  });

  const hidePost = useMutation({
    mutationFn: () => base44.entities.CommunityPost.update(post.id, { is_hidden: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-posts'] }),
  });

  const displayName = post.is_anonymous ? 'Community Member' : (post.author_name || 'Member');
  const timeAgo = post.created_date ? formatDistanceToNow(new Date(post.created_date), { addSuffix: true }) : '';
  const totalReactions = Object.values(post.reactions || {}).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  return (
    <div className="bg-card mx-4 mb-3 rounded-2xl overflow-hidden"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgb(var(--muted))' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Avatar name={displayName} isCoach={post.is_coach} isAnon={post.is_anonymous} size={9} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-foreground font-bold text-sm">{displayName}</p>
            {post.is_coach && (
              <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black text-white"
                style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }}>COACH</span>
            )}
            {post.type === 'milestone' && (
              <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black text-warning bg-warning/10">MILESTONE</span>
            )}
          </div>
          <p className="text-muted-foreground text-[10px]">{timeAgo}</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="absolute right-0 top-8 bg-card rounded-2xl shadow-xl border border-border z-10 min-w-[140px] overflow-hidden">
                <button onClick={() => { setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-muted">
                  <Flag className="w-3.5 h-3.5 text-destructive" /> Report
                </button>
                <button onClick={() => { hidePost.mutate(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-muted">
                  <span className="text-muted-foreground text-sm">👁</span> Hide post
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-foreground text-sm leading-relaxed">{post.content}</p>
      </div>

      {/* Media */}
      {post.media_urls?.length > 0 && (
        <div className="px-4 pb-3">
          <SignedImg src={post.media_urls[0]} alt="post media"
            onClick={() => setImageExpanded(!imageExpanded)}
            className={`w-full rounded-2xl object-cover cursor-pointer transition-all ${imageExpanded ? 'max-h-96' : 'max-h-52'}`} />
        </div>
      )}

      {/* Reactions */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {REACTIONS.map(r => {
            const count = (post.reactions?.[r.key] || []).length;
            const reacted = (post.reactions?.[r.key] || []).includes(userId);
            return (
              <motion.button key={r.key} whileTap={{ scale: 0.85 }}
                onClick={() => reactMutation.mutate({ key: r.key })}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{
                  background: reacted ? 'rgb(var(--accent))' : 'rgb(var(--muted))',
                  border: `1.5px solid ${reacted ? 'rgb(var(--accent))' : 'rgb(var(--muted))'}`,
                  color: reacted ? 'rgb(var(--primary))' : 'rgb(var(--muted-foreground))',
                }}>
                <span>{r.emoji}</span>
                {count > 0 && <span>{count}</span>}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-border">
        <button onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-muted-foreground text-xs font-semibold hover:bg-muted flex-1 justify-center">
          <MessageCircle className="w-3.5 h-3.5" />
          {comments.length > 0 || showComments ? `${comments.length} comments` : 'Comment'}
        </button>
      </div>

      {/* Comments section */}
      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-border overflow-hidden">
            <div className="px-4 py-2">
              {comments.map(c => <CommentItem key={c.id} comment={c} />)}
            </div>
            {/* Comment input */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
              <Avatar name={user?.full_name} isCoach={false} isAnon={false} size={8} />
              <div className="flex-1 flex items-center gap-2 bg-muted rounded-2xl px-3 py-2 border border-border">
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && commentText.trim() && addComment.mutate(commentText.trim())}
                  placeholder="Add a comment..."
                  className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder-border"
                />
                <button onClick={() => commentText.trim() && addComment.mutate(commentText.trim())}
                  disabled={!commentText.trim()}
                  className="w-6 h-6 rounded-full flex items-center justify-center disabled:opacity-30"
                  style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }}>
                  <Send className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}