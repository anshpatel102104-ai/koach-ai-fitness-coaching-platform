import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Heart, MessageCircle, Send, Trophy, Star, Lightbulb, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const POST_TYPES = [
  { key: 'post',      label: 'Post',      icon: MessageCircle, badge: 'bg-muted text-foreground' },
  { key: 'win',       label: 'Win',       icon: Trophy,        badge: 'bg-warning/10 text-warning' },
  { key: 'milestone', label: 'Milestone', icon: Star,          badge: 'bg-accent/10 text-primary' },
  { key: 'tip',       label: 'Tip',       icon: Lightbulb,     badge: 'bg-success/10 text-success' },
];

const PLACEHOLDERS = {
  post: "What's on your mind?",
  win: "Share a win with the community!",
  milestone: "Celebrate a milestone...",
  tip: "Share a helpful tip...",
};

function AvatarInitial({ name, size = 9 }) {
  const colors = ['bg-accent text-primary', 'bg-ai/10 text-ai', 'bg-success/10 text-success', 'bg-warning/10 text-warning', 'bg-destructive/10 text-destructive'];
  const idx = (name?.charCodeAt(0) || 0) % colors.length;
  return (
    <div className={cn(`w-${size} h-${size} rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0`, colors[idx])}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function PostCard({ post, currentUserId, groupId }) {
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');

  const typeConfig = POST_TYPES.find(t => t.key === post.type) || POST_TYPES[0];
  const TypeIcon = typeConfig.icon;

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', post.id],
    queryFn: () => db.entities.PostComment.filter({ post_id: post.id }, 'created_date'),
    enabled: showComments,
  });

  const likeMutation = useMutation({
    mutationFn: () => {
      const likes = post.likes || [];
      const hasLiked = likes.includes(currentUserId);
      const updated = hasLiked ? likes.filter(id => id !== currentUserId) : [...likes, currentUserId];
      return db.entities.CommunityPost.update(post.id, { likes: updated });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-posts', groupId] }),
  });

  const commentMutation = useMutation({
    mutationFn: () => db.entities.PostComment.create({ post_id: post.id, author_id: currentUserId, author_name: 'You', content: comment, coach_id: post.coach_id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['comments', post.id] }); setComment(''); },
  });

  const liked = (post.likes || []).includes(currentUserId);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* Win banner */}
      {post.type === 'win' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-warning/10 border border-[var(--kc-fef08a)] rounded-lg">
          <Trophy className="w-4 h-4 text-warning flex-shrink-0" />
          <span className="text-xs font-semibold text-warning">Celebrating a Win!</span>
        </div>
      )}
      {/* Milestone banner */}
      {post.type === 'milestone' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 border border-accent rounded-lg">
          <Star className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-xs font-semibold text-primary">Milestone Reached!</span>
        </div>
      )}

      {/* Author row */}
      <div className="flex items-center gap-3">
        <AvatarInitial name={post.author_name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-foreground">{post.author_name}</p>
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1', typeConfig.badge)}>
              <TypeIcon className="w-2.5 h-2.5" /> {typeConfig.label}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(post.created_date || Date.now()), { addSuffix: true })}</p>
        </div>
      </div>

      {/* Content */}
      <p className="text-sm leading-relaxed text-foreground">{post.content}</p>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-1 border-t border-muted">
        <button onClick={() => likeMutation.mutate()} className={cn('flex items-center gap-1.5 text-xs font-medium transition-colors', liked ? 'text-destructive' : 'text-muted-foreground hover:text-destructive')}>
          <Heart className={cn('w-4 h-4', liked && 'fill-destructive')} />
          {(post.likes || []).length > 0 && <span>{(post.likes || []).length}</span>}
        </button>
        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          <MessageCircle className="w-4 h-4" />
          {comments.length > 0 ? comments.length : 'Comment'}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="space-y-2 pt-2 border-t border-muted">
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-2">
              <AvatarInitial name={c.author_name} size={7} />
              <div className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5">
                <p className="text-xs font-semibold text-foreground">{c.author_name}</p>
                <p className="text-xs text-foreground">{c.content}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment…" onKeyDown={e => e.key === 'Enter' && commentMutation.mutate()} className="flex-1 text-xs bg-background border border-border rounded-lg px-3 py-1.5 outline-none focus:border-foreground transition-colors" />
            <button onClick={() => commentMutation.mutate()} disabled={!comment.trim()} className="p-1.5 text-foreground hover:text-foreground rounded-lg transition-colors disabled:opacity-40">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommunityFeed({ currentUser, groupId }) {
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState('post');
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['community-posts', groupId],
    queryFn: () => groupId
      ? db.entities.CommunityPost.filter({ group_id: groupId }, '-created_date', 50)
      : db.entities.CommunityPost.list('-created_date', 50),
  });

  const createPost = useMutation({
    mutationFn: () => db.entities.CommunityPost.create({
      author_id: currentUser?.id || 'anonymous',
      author_name: currentUser?.full_name || 'Anonymous',
      content: newPost,
      type: postType,
      likes: [],
      group_id: groupId || undefined,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['community-posts', groupId] }); setNewPost(''); setPostType('post'); },
  });

  return (
    <div className="space-y-4">
      {/* Compose */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {POST_TYPES.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setPostType(t.key)}
                className={cn('flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all',
                  postType === t.key ? 'bg-sidebar text-white border-foreground' : 'border-border text-foreground hover:border-foreground')}>
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>
        <textarea value={newPost} onChange={e => setNewPost(e.target.value)} placeholder={PLACEHOLDERS[postType]} rows={2}
          className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-foreground resize-none transition-colors placeholder:text-muted-foreground text-foreground" />
        <div className="flex justify-end">
          <button disabled={!newPost.trim()} onClick={() => createPost.mutate()}
            className="px-4 py-1.5 bg-sidebar text-white text-sm font-semibold rounded-lg hover:bg-black transition-colors disabled:opacity-40">
            Post
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-card border border-border rounded-xl animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Zap className="w-9 h-9 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">No posts yet</p>
          <p className="text-xs text-muted-foreground mt-1">Be the first to share something!</p>
        </div>
      ) : (
        posts.map(post => <PostCard key={post.id} post={post} currentUserId={currentUser?.id} groupId={groupId} />)
      )}
    </div>
  );
}