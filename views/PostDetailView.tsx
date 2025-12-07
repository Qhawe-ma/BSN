import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, MessageSquare, Heart, Share2, Repeat, ShieldCheck, Send, Loader, X, Check, ImagePlus } from 'lucide-react';
import { Post, Comment, User } from '../types';
import { DataService, BlockchainService, formatAddress } from '../services';
import { GlassCard, Button, Avatar } from '../components/UIComponents';
import { BadgeIcon } from '../components/BadgeIcon';
import { FirebaseService } from '../firebaseService';
import { Portal } from '../components/Portal';
import { LazyImage } from '../components/LazyImage';

interface PostDetailViewProps {
  postId: string;
  currentUser?: User;
  onBack: () => void;
  onUserClick: (user: User) => void;
}

export const PostDetailView: React.FC<PostDetailViewProps> = ({
  postId,
  currentUser,
  onBack,
  onUserClick
}) => {
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsCount, setCommentsCount] = useState(0);
  const [repostsCount, setRepostsCount] = useState(0);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [showRepostConfirm, setShowRepostConfirm] = useState(false);
  const [hasReposted, setHasReposted] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared'>('idle');
  
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const commentImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadPost = async () => {
      setError(null);
      
      try {
        // FAST LOADING: Try cached feed first for instant render
        let posts = DataService.getCachedFeed();
        let foundPost = posts?.find(p => p.tokenId === postId);
        
        if (foundPost) {
          // Instant render with cached data
          setPost(foundPost);
          setLikesCount(foundPost.likes);
          setCommentsCount(foundPost.commentsCount);
          setRepostsCount(foundPost.repostsCount || 0);
          setIsLoading(false);
          
          // Parallel fetch: fresh author profile, comments, and user interactions
          const [freshAuthorProfile, fetchedComments] = await Promise.all([
            FirebaseService.getUserProfile(foundPost.author.address),
            DataService.getComments(foundPost.internalId)
          ]);
          
          // Update post with fresh author data (avatar, badge)
          if (freshAuthorProfile) {
            const updatedPost = {
              ...foundPost,
              author: {
                ...foundPost.author,
                avatarUrl: freshAuthorProfile.avatarUrl || foundPost.author.avatarUrl,
                activeBadge: freshAuthorProfile.activeBadge,
                ens: freshAuthorProfile.ens || foundPost.author.ens
              }
            };
            setPost(updatedPost);
          }
          
          setComments(fetchedComments);
          
          // Fetch user interactions in parallel
          if (currentUser) {
            const [liked, reposted] = await Promise.all([
              DataService.isPostLiked(foundPost.internalId, currentUser.address),
              FirebaseService.hasReposted(foundPost.internalId, currentUser.address)
            ]);
            setIsLiked(liked);
            setHasReposted(reposted);
          }
        } else {
          // No cache, fetch fresh
          setIsLoading(true);
          posts = await DataService.getFeed(false);
          foundPost = posts.find(p => p.tokenId === postId);
          
          if (foundPost) {
            // Fetch fresh author profile
            const freshAuthorProfile = await FirebaseService.getUserProfile(foundPost.author.address);
            if (freshAuthorProfile) {
              foundPost = {
                ...foundPost,
                author: {
                  ...foundPost.author,
                  avatarUrl: freshAuthorProfile.avatarUrl || foundPost.author.avatarUrl,
                  activeBadge: freshAuthorProfile.activeBadge,
                  ens: freshAuthorProfile.ens || foundPost.author.ens
                }
              };
            }
            
            setPost(foundPost);
            setLikesCount(foundPost.likes);
            setCommentsCount(foundPost.commentsCount);
            setRepostsCount(foundPost.repostsCount || 0);
            
            const fetchedComments = await DataService.getComments(foundPost.internalId);
            setComments(fetchedComments);
            
            if (currentUser) {
              const [liked, reposted] = await Promise.all([
                DataService.isPostLiked(foundPost.internalId, currentUser.address),
                FirebaseService.hasReposted(foundPost.internalId, currentUser.address)
              ]);
              setIsLiked(liked);
              setHasReposted(reposted);
            }
          } else {
            setError('Post not found');
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading post:', err);
        setError('Failed to load post');
        setIsLoading(false);
      }
    };

    loadPost();
  }, [postId, currentUser]);

  // Real-time subscription to post stats
  useEffect(() => {
    if (!post) return;
    const unsubscribe = FirebaseService.subscribeToPostStats(post.internalId, (stats) => {
      setLikesCount(stats.likes);
      setCommentsCount(stats.comments);
      setRepostsCount(stats.reposts);
    });
    return () => unsubscribe();
  }, [post?.internalId]);

  // Real-time subscription to comments
  useEffect(() => {
    if (!post) return;
    const unsubscribe = FirebaseService.subscribeToComments(post.internalId, (updatedComments) => {
      setComments(updatedComments);
    });
    return () => unsubscribe();
  }, [post?.internalId]);

  const handleLike = async () => {
    if (!currentUser || !post || isLiking) return;
    
    // Optimistic update - instant UI response
    const wasLiked = isLiked;
    const prevCount = likesCount;
    setIsLiked(!wasLiked);
    setLikesCount(wasLiked ? prevCount - 1 : prevCount + 1);
    
    setIsLiking(true);
    try {
      const result = await DataService.toggleLike(post.internalId, currentUser.address);
      // Sync with actual server state
      setIsLiked(result.liked);
      setLikesCount(result.likes);
    } catch (error) {
      // Revert on error
      setIsLiked(wasLiked);
      setLikesCount(prevCount);
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleCommentImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      setCommentImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setCommentImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearCommentImage = () => {
    setCommentImage(null);
    setCommentImagePreview(null);
    if (commentImageInputRef.current) commentImageInputRef.current.value = '';
  };

  const handlePostComment = async () => {
    if ((!newComment.trim() && !commentImage) || !currentUser || !post) return;
    
    const commentText = newComment.trim();
    const tempId = `temp_${Date.now()}`;
    
    const optimisticComment: Comment = {
      id: tempId,
      postId: parseInt(post.tokenId),
      author: currentUser,
      content: commentText,
      timestamp: Date.now(),
      imageUrl: commentImagePreview || undefined
    };
    
    setComments(prev => [...prev, optimisticComment]);
    setNewComment("");
    const savedImage = commentImage;
    clearCommentImage();
    setCommentsCount(prev => prev + 1);
    setIsPostingComment(true);
    
    try {
      let imageUrl: string | undefined;
      if (savedImage) {
        const formData = new FormData();
        formData.append('image', savedImage);
        const response = await fetch('/api/upload/comment-image', { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) imageUrl = data.imageUrl;
      }
      const comment = await DataService.postComment(post.internalId, commentText, currentUser, imageUrl);
      setComments(prev => prev.map(c => c.id === tempId ? comment : c));
    } catch (error) {
      console.error('Error posting comment:', error);
      setComments(prev => prev.filter(c => c.id !== tempId));
      setCommentsCount(prev => Math.max(0, prev - 1));
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleShare = async () => {
    if (!post) return;
    
    const postUrl = `${window.location.origin}/post/${post.tokenId}`;
    const shareText = `Check out this post by ${post.author.ens || formatAddress(post.author.address)} on BSC Social`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'BSC Social Post',
          text: shareText,
          url: postUrl
        });
        setShareStatus('shared');
      } else {
        await navigator.clipboard.writeText(postUrl);
        setShareStatus('copied');
      }
      
      setTimeout(() => setShareStatus('idle'), 2000);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(postUrl);
          setShareStatus('copied');
          setTimeout(() => setShareStatus('idle'), 2000);
        } catch (clipError) {
          console.error('Failed to copy:', clipError);
        }
      }
    }
  };

  const handleRepostClick = () => {
    if (!currentUser) {
      alert('Please connect your wallet to repost');
      return;
    }
    
    if (hasReposted) {
      alert('You have already reposted this post');
      return;
    }
    
    setShowRepostConfirm(true);
  };

  const handleConfirmRepost = async () => {
    if (!currentUser || !post || isReposting) return;
    
    setIsReposting(true);
    try {
      await BlockchainService.repostPost(post);
      setHasReposted(true);
      setRepostsCount(prev => prev + 1);
      setShowRepostConfirm(false);
    } catch (error: any) {
      console.error('Repost error:', error);
      alert(error.message || 'Failed to repost. Please try again.');
    } finally {
      setIsReposting(false);
    }
  };

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Feed</span>
        </button>
        <GlassCard className="p-8 text-center">
          <p className="text-gray-400 text-lg">{error || 'Post not found'}</p>
          <Button onClick={onBack} className="mt-4">
            Go Back
          </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pt-4 pb-20 md:pb-0 px-4 md:px-0">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
      >
        <ArrowLeft size={18} />
        <span className="text-sm">Back to Feed</span>
      </button>

      <GlassCard className="mb-4 md:mb-6">
        {post.isRepost && post.originalAuthor && (
          <div className="px-4 md:px-6 pt-3 flex items-center gap-2 text-gray-500 text-xs">
            <Repeat size={12} />
            <span>
              <span 
                onClick={() => onUserClick(post.author)} 
                className="font-semibold hover:underline cursor-pointer"
              >
                {post.author.ens || formatAddress(post.author.address)}
              </span>
              {' '}reposted from{' '}
              <span 
                onClick={() => onUserClick(post.originalAuthor!)} 
                className="font-semibold hover:underline cursor-pointer"
              >
                {post.originalAuthor.ens || formatAddress(post.originalAuthor.address)}
              </span>
            </span>
          </div>
        )}
        
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-3">
              <div onClick={() => onUserClick(post.author)} className="cursor-pointer hover:opacity-80 transition-opacity">
                <Avatar url={post.author.avatarUrl} size="md" />
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <span 
                    onClick={() => onUserClick(post.author)}
                    className="font-bold text-white text-sm md:text-base hover:underline cursor-pointer hover:text-primary transition-colors"
                  >
                    {post.author.ens || formatAddress(post.author.address)}
                  </span>
                  {post.author.activeBadge && post.author.activeBadge.status === 'active' && (
                    <BadgeIcon badgeType={post.author.activeBadge.badgeType} size="sm" />
                  )}
                  <span className="text-gray-500 text-xs md:text-sm">· {timeAgo(post.timestamp)}</span>
                </div>
                <span className="text-gray-500 text-xs font-mono">{formatAddress(post.author.address)}</span>
              </div>
            </div>
          </div>

          <div className="pl-0 md:pl-[3.5rem]">
            <p className="text-gray-100 leading-relaxed text-sm md:text-[15px] mb-4 whitespace-pre-wrap break-words">
              {post.content}
            </p>

            {post.attachmentUrl && (
              <div className="mb-4 rounded-2xl overflow-hidden border border-white/5 shadow-lg">
                <img src={post.attachmentUrl} alt="Attachment" className="w-full h-auto object-contain" />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 text-[10px] font-mono text-gray-600">
              <a 
                href={`https://bscscan.com/token/${post.contractAddress || import.meta.env.VITE_BSC_CONTRACT_ADDRESS}?a=${post.tokenId}#inventory`} 
                target="_blank" 
                rel="noreferrer" 
                className="bg-white/5 px-2 py-1 rounded-md border border-white/5 hover:text-primary hover:border-primary/30 transition-colors"
              >
                Token ID: #{post.tokenId}
              </a>
              {post.txHash && (
                <a href={`https://bscscan.com/tx/${post.txHash}#eventlog`} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                  Tx: {post.txHash.substring(0,8)}...
                </a>
              )}
              <span className="flex items-center gap-1 text-green-500/60 ml-auto">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                On-Chain
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-400 max-w-md mt-2">
              <button 
                className="group flex items-center gap-2 hover:text-blue-400 transition-colors text-sm"
              >
                <div className="p-2 rounded-full group-hover:bg-blue-400/10 transition-colors -ml-2">
                  <MessageSquare size={18} />
                </div>
                <span>{commentsCount || ''}</span>
              </button>
              
              <button 
                onClick={handleRepostClick}
                disabled={isReposting || hasReposted}
                className={`group flex items-center gap-2 transition-colors text-sm ${
                  hasReposted ? 'text-green-400' : 'hover:text-green-400'
                } ${isReposting ? 'opacity-50' : ''}`}
              >
                <div className={`p-2 rounded-full transition-colors ${hasReposted ? '' : 'group-hover:bg-green-400/10'}`}>
                  {isReposting ? (
                    <Loader size={18} className="animate-spin" />
                  ) : (
                    <Repeat size={18} />
                  )}
                </div>
                <span>{repostsCount || ''}</span>
              </button>

              <button 
                onClick={handleLike}
                className={`group flex items-center gap-2 transition-colors text-sm ${isLiked ? 'text-pink-500' : 'hover:text-pink-500'}`}
              >
                <div className={`p-2 rounded-full transition-colors ${isLiked ? '' : 'group-hover:bg-pink-500/10'}`}>
                  <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                </div>
                <span>{likesCount || ''}</span>
              </button>

              <button 
                onClick={handleShare}
                className={`group flex items-center gap-2 transition-colors text-sm ${
                  shareStatus !== 'idle' ? 'text-primary' : 'hover:text-primary'
                }`}
              >
                <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                  {shareStatus === 'copied' || shareStatus === 'shared' ? (
                    <Check size={18} />
                  ) : (
                    <Share2 size={18} />
                  )}
                </div>
                {shareStatus === 'copied' && <span className="text-xs">Copied!</span>}
              </button>
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-4 md:p-6">
        <h3 className="text-sm font-bold text-white mb-4">Comments</h3>
        
        {currentUser && (
          <div className="mb-4 pb-4 border-b border-white/5">
            {commentImagePreview && (
              <div className="mb-3 relative inline-block">
                <img src={commentImagePreview} alt="Preview" className="max-h-32 rounded-xl border border-white/10" />
                <button onClick={clearCommentImage} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600">
                  <X size={12} />
                </button>
              </div>
            )}
            <div className="flex gap-3 items-center">
              <Avatar url={currentUser.avatarUrl} size="sm" />
              <div className="flex-1 relative flex items-center gap-2">
                <input type="file" ref={commentImageInputRef} onChange={handleCommentImageSelect} accept="image/*" className="hidden" />
                <button onClick={() => commentImageInputRef.current?.click()} className="p-2 text-gray-400 hover:text-primary hover:bg-white/5 rounded-full transition-all" title="Add image">
                  <ImagePlus size={18} />
                </button>
                <input 
                  type="text" 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handlePostComment()}
                  disabled={isPostingComment}
                  placeholder="Write a comment..." 
                  className="flex-1 bg-white/5 border border-white/10 rounded-full pl-4 pr-12 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                />
                <button 
                  onClick={handlePostComment}
                  disabled={(!newComment.trim() && !commentImage) || isPostingComment}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-black rounded-full disabled:opacity-50"
                >
                  {isPostingComment ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-4 text-sm">No comments yet. Be the first to comment!</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <div onClick={() => onUserClick(comment.author)} className="cursor-pointer">
                  <Avatar url={comment.author.avatarUrl} size="sm" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline mb-1">
                    <div className="flex items-center gap-1.5">
                      <span 
                        onClick={() => onUserClick(comment.author)}
                        className="text-sm font-bold text-gray-200 cursor-pointer hover:text-primary"
                      >
                        {comment.author.ens || formatAddress(comment.author.address)}
                      </span>
                      {comment.author.activeBadge && comment.author.activeBadge.status === 'active' && (
                        <BadgeIcon badgeType={comment.author.activeBadge.badgeType} size="sm" />
                      )}
                    </div>
                    <span className="text-xs text-gray-600">{timeAgo(comment.timestamp)}</span>
                  </div>
                  {comment.content && <p className="text-sm text-gray-400">{comment.content}</p>}
                  {comment.imageUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-white/5 max-w-xs">
                      <LazyImage src={comment.imageUrl} alt="Comment attachment" className="w-full h-auto" />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      {showRepostConfirm && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Confirm Repost</h3>
                <button 
                  onClick={() => setShowRepostConfirm(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-300 mb-4">
                  Reposting will mint a new post on the blockchain. This action requires a wallet transaction and gas fees.
                </p>
                
                <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar url={post.author.avatarUrl} size="sm" />
                    <span className="text-sm font-semibold text-white">
                      {post.author.ens || formatAddress(post.author.address)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-3">{post.content}</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRepostConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRepost}
                  disabled={isReposting}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-yellow-400 text-black font-bold transition-all hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isReposting ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <Repeat size={16} />
                      Repost
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};
