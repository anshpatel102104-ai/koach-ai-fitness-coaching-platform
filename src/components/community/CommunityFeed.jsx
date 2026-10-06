import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Heart, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Panel, Segmented, EmptyState, Initials } from '@/components/kit';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const POST_TYPES = [
  { key: 'post',      label: 'Post' },
  { key: 'win',       label: 'Win' },
  { key: 'milestone', label: 'Milestone' },
  { key: 'tip',       label: 'Tip' },
];
const TYPE_BADGE = { win: 'success', milestone: 'secondary', tip: 'secondary' };

const PLACEHOLDERS = {
  post: 'Write something for the group',
  win: 'What went well this week?',
  milestone: 'What did someone hit?',
  tip: 'Share something that helps',
};

function PostCard({ post, currentUserId, groupId }) {
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');

  const typeConfig = POST_TYPES.find(t => t.key === post.type) || POST_TYPES[0];

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
    <Panel as="article" className="p-5">
      <div className="flex items-center gap-3">
        <Initials name={post.author_name || ''} />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-foreground truncate">{post.author_name}</p>
          <p className="text-[13px] text-muted-foreground">{formatDistanceToNow(new Date(post.created_date || Date.now()), { addSuffix: true })}</p>
        </div>
        {post.type && post.type !== 'post' && <Badge variant={TYPE_BADGE[post.type] || 'secondary'}>{typeConfig.label}</Badge>}
      </div>

      <p className="text-[15px] leading-relaxed text-foreground mt-3 whitespace-pre-line">{post.content}</p>

      <div className="flex items-center gap-5 mt-4 pt-3 border-t border-border">
        <button onClick={() => likeMutation.mutate()} className={cn('flex items-center gap-1.5 text-sm font-medium transition-colors', liked ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')} aria-pressed={liked}>
          <Heart className={cn('w-4 h-4', liked && 'fill-foreground')} />
          {(post.likes || []).length > 0 ? (post.likes || []).length : 'Like'}
        </button>
        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <MessageCircle className="w-4 h-4" />
          {comments.length > 0 ? `${comments.length} comment${comments.length === 1 ? '' : 's'}` : 'Comment'}
        </button>
      </div>

      {showComments && (
        <div className="mt-3 space-y-3">
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-2.5">
              <Initials name={c.author_name || ''} size={28} />
              <div className="flex-1 bg-secondary rounded-lg px-3 py-2">
                <p className="text-[13px] font-semibold text-foreground">{c.author_name}</p>
                <p className="text-sm text-foreground">{c.content}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment" onKeyDown={e => e.key === 'Enter' && comment.trim() && commentMutation.mutate()} className="flex-1" aria-label="Comment" />
            <Button variant="outline" onClick={() => commentMutation.mutate()} disabled={!comment.trim()}>Reply</Button>
          </div>
        </div>
      )}
    </Panel>
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
      <Panel className="p-5">
        <Segmented size="sm" value={postType} onChange={setPostType} options={POST_TYPES.map(t => ({ value: t.key, label: t.label }))} />
        <Textarea value={newPost} onChange={e => setNewPost(e.target.value)} placeholder={PLACEHOLDERS[postType]} rows={3} className="mt-3" aria-label="New post" />
        <div className="flex justify-end mt-3">
          <Button disabled={!newPost.trim()} onClick={() => createPost.mutate()}>Post</Button>
        </div>
      </Panel>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 panel animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <Panel>
          <EmptyState title="No posts yet" body="Start the thread with a win from this week." />
        </Panel>
      ) : (
        posts.map(post => <PostCard key={post.id} post={post} currentUserId={currentUser?.id} groupId={groupId} />)
      )}
    </div>
  );
}
