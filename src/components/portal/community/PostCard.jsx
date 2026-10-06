import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { MessageCircle, MoreHorizontal, Flag, Send, EyeOff, Flame, Dumbbell, Heart, Trophy, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Initials } from '@/components/kit';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { SignedImg } from '@/components/shared/SignedImage';

const REACTIONS = [
  { icon: Flame, key: 'fire', label: 'Fire' },
  { icon: Dumbbell, key: 'muscle', label: 'Strong' },
  { icon: Heart, key: 'heart', label: 'Love' },
  { icon: Trophy, key: 'trophy', label: 'Win' },
  { icon: ThumbsUp, key: 'clap', label: 'Nice' },
];

function Avatar({ name, isCoach, isAnon, size = 9 }) {
  return <Initials name={isAnon ? '?' : (name || 'Member')} size={size * 4} tone={isCoach ? 'ink' : 'default'} />;
}

function CoachTag() {
  return <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">Coach</span>;
}

function CommentItem({ comment }) {
  return (
    <div className="flex gap-2.5 py-2">
      <Avatar name={comment.author_name} isCoach={comment.is_coach} isAnon={!comment.author_name} size={8} />
      <div className="min-w-0 flex-1">
        <div className="rounded-lg bg-secondary px-3 py-2">
          <p className="text-[13px] font-semibold text-foreground">{comment.author_name || 'Community member'}
            {comment.is_coach && <CoachTag />}
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-foreground">{comment.content}</p>
        </div>
        <p className="ml-1 mt-1 text-[12px] text-muted-foreground">
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
    queryFn: () => portalDb.entities.PostComment.filter({ post_id: post.id }, 'created_date', 100),
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
      return portalDb.entities.CommunityPost.update(post.id, { reactions });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-posts'] }),
  });

  const addComment = useMutation({
    mutationFn: (content) => portalDb.entities.PostComment.create({
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
    mutationFn: () => portalDb.entities.CommunityPost.update(post.id, { is_hidden: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-posts'] }),
  });

  const displayName = post.is_anonymous ? 'Community member' : (post.author_name || 'Member');
  const timeAgo = post.created_date ? formatDistanceToNow(new Date(post.created_date), { addSuffix: true }) : '';
  const totalReactions = Object.values(post.reactions || {}).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  return (
    <article className="panel">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Avatar name={displayName} isCoach={post.is_coach} isAnon={post.is_anonymous} size={9} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center text-[15px] font-semibold text-foreground">
            {displayName}
            {post.is_coach && <CoachTag />}
            {post.type === 'milestone' && <span className="ml-1.5 rounded-full bg-success-soft px-1.5 py-0.5 text-[11px] font-semibold text-success">Milestone</span>}
          </p>
          <p className="text-[13px] text-muted-foreground">{timeAgo}</p>
        </div>
        <div className="relative">
          <button type="button" onClick={() => setShowMenu(!showMenu)} aria-label="Post options"
            className="touch-compact flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-9 z-10 min-w-[150px] overflow-hidden rounded-lg border border-border bg-popover shadow-md">
              <button type="button" onClick={() => { setShowMenu(false); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-accent">
                <Flag className="h-3.5 w-3.5 text-destructive" /> Report
              </button>
              <button type="button" onClick={() => { hidePost.mutate(); setShowMenu(false); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-accent">
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> Hide post
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="px-4 pb-3 text-[15px] leading-relaxed text-foreground">{post.content}</p>

      {/* Media */}
      {post.media_urls?.length > 0 && (
        <div className="px-4 pb-3">
          <SignedImg src={post.media_urls[0]} alt=""
            onClick={() => setImageExpanded(!imageExpanded)}
            className={`w-full cursor-pointer rounded-lg object-cover ${imageExpanded ? 'max-h-96' : 'max-h-52'}`} />
        </div>
      )}

      {/* Reactions */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3">
        {REACTIONS.map(r => {
          const count = (post.reactions?.[r.key] || []).length;
          const reacted = (post.reactions?.[r.key] || []).includes(userId);
          return (
            <button key={r.key} type="button" aria-pressed={reacted} aria-label={r.label}
              onClick={() => reactMutation.mutate({ key: r.key })}
              className={cn('touch-compact inline-flex h-8 items-center gap-1 rounded-full !px-2.5 !py-0 text-[13px] font-semibold transition-colors',
                reacted ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground')}>
              <r.icon className="h-3.5 w-3.5" />
              {count > 0 && <span className="tabular-nums">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="border-t border-border px-4 py-2">
        <button type="button" onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <MessageCircle className="h-4 w-4" />
          {comments.length > 0 || showComments ? `${comments.length} comment${comments.length === 1 ? '' : 's'}` : 'Comment'}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="border-t border-border">
          {comments.length > 0 && (
            <div className="px-4 py-2">
              {comments.map(c => <CommentItem key={c.id} comment={c} />)}
            </div>
          )}
          <div className="flex items-center gap-2 border-t border-border px-4 py-3 first:border-t-0">
            <Avatar name={user?.full_name} isCoach={false} isAnon={false} size={8} />
            <Input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && commentText.trim() && addComment.mutate(commentText.trim())}
              placeholder="Add a comment"
              className="h-10 flex-1 text-base"
            />
            <Button size="icon" onClick={() => commentText.trim() && addComment.mutate(commentText.trim())}
              disabled={!commentText.trim()} aria-label="Post comment">
              <Send />
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
