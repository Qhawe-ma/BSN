import React, { useEffect, useState } from 'react';
import { ArrowLeft, MessageSquare, Heart, Share2, Repeat, ShieldCheck, Send, Loader, X, Check } from 'lucide-react';
import { Post, Comment, User } from '../types';
import { DataService, BlockchainService, formatAddress } from '../services';
import { GlassCard, Button, Avatar } from '../components/UIComponents';
import { FirebaseService } from '../firebaseService';
import { Portal } from '../components/Portal';

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

  useEffect(() => {
    const loadPost = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const posts = await DataService.getFeed(true);
        const foundPost = posts.find(p => p.tokenId === postId);
        
        if (foundPost) {
          setPost(foundPost);
          setLikesCount(foundPost.likes);
          setCommentsCount(foundPost.commentsCount);
          setRepostsCount(foundPost.repostsCount || 0);
          
          const fetchedComments = await DataService.getComments(foundPost.tokenId);
          setComments(fetchedComments);
          
          if (currentUser) {
            const liked = await DataService.isPostLiked(foundPost.tokenId, currentUser.address);
            setIsLiked(liked);
            const reposted = await FirebaseService.hasReposted(foundPost.tokenId, currentUser.address);
            setHasReposted(reposted);
          }
        } else {
          setError('Post not found');
        }
      } catch (err) {
        console.error('Error loading post:', err);
        setError('Failed to load post');
      } finally {
        setIsLoading(false);
      }
    };

    loadPost();
  }, [postId, currentUser]);

  const handleLike = async () => {
    if (!currentUser || !post || isLiking) return;
    
    setIsLiking(true);
    try {
      const result = await DataService.toggleLike(post.tokenId, currentUser.address);
      setIsLiked(result.liked);
      setLikesCount(result.likes);
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !currentUser || !post) return;
    
    setIsPostingComment(true);
    try {
      const comment = await DataService.postComment(post.tokenId, newComment, currentUser);
      setComments(prev => [...prev, comment]);
      setNewComment("");
      setCommentsCount(prev => prev + 1);
    } catch (error) {
      console.error('Error posting comment:', error);
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
    <div className="p-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Feed</span>
      </button>

      <GlassCard className="mb-4">
        {post.isRepost && post.originalAuthor && (
          <div className="px-6 pt-4 flex items-center gap-2 text-gray-500 text-xs">
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
        
        <div className="p-6">
          <div className="flex gap-4 mb-4">
            <div onClick={() => onUserClick(post.author)} className="cursor-pointer">
              <Avatar url={post.author.avatarUrl} size="lg" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span 
                  onClick={() => onUserClick(post.author)}
                  className="font-bold text-white text-lg hover:underline cursor-pointer"
                >
                  {post.author.ens || formatAddress(post.author.address)}
                </span>
                {post.author.ens && <ShieldCheck size={16} className="text-blue-400" />}
              </div>
              <span className="text-gray-500 text-sm">{timeAgo(post.timestamp)}</span>
            </div>
          </div>

          <p className="text-gray-100 text-lg leading-relaxed mb-4 whitespace-pre-wrap break-words">
            {post.content}
          </p>

          {post.attachmentUrl && (
            <div className="mb-4 rounded-2xl overflow-hidden border border-white/5">
              <img src={post.attachmentUrl} alt="Attachment" className="w-full h-auto" />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mb-4 text-xs font-mono text-gray-600">
            <a 
              href={`https://bscscan.com/token/${import.meta.env.VITE_BSC_CONTRACT_ADDRESS}?a=${post.tokenId}`} 
              target="_blank" 
              rel="noreferrer" 
              className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 hover:text-primary transition-colors"
            >
              Token ID: #{post.tokenId}
            </a>
            {post.txHash && (
              <a href={`https://bscscan.com/tx/${post.txHash}`} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                Tx: {post.txHash.substring(0,10)}...
              </a>
            )}
            <span className="flex items-center gap-1 text-green-500/60 ml-auto">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              On-Chain
            </span>
          </div>

          <div className="flex items-center justify-around border-t border-white/5 pt-4 text-gray-400">
            <button 
              className="flex items-center gap-2 hover:text-blue-400 transition-colors"
            >
              <MessageSquare size={20} />
              <span>{commentsCount}</span>
            </button>
            
            <button 
              onClick={handleRepostClick}
              disabled={isReposting || hasReposted}
              className={`flex items-center gap-2 transition-colors ${
                hasReposted ? 'text-green-400' : 'hover:text-green-400'
              } ${isReposting ? 'opacity-50' : ''}`}
            >
              {isReposting ? (
                <Loader size={20} className="animate-spin" />
              ) : (
                <Repeat size={20} />
              )}
              <span>{repostsCount}</span>
            </button>

            <button 
              onClick={handleLike}
              className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-pink-500' : 'hover:text-pink-500'}`}
            >
              <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
              <span>{likesCount}</span>
            </button>

            <button 
              onClick={handleShare}
              className={`flex items-center gap-2 transition-colors ${
                shareStatus !== 'idle' ? 'text-primary' : 'hover:text-primary'
              }`}
            >
              {shareStatus === 'copied' || shareStatus === 'shared' ? (
                <Check size={20} />
              ) : (
                <Share2 size={20} />
              )}
              {shareStatus === 'copied' && <span className="text-xs">Copied!</span>}
            </button>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-lg font-bold text-white mb-4">Comments</h3>
        
        {currentUser && (
          <div className="flex gap-3 mb-6 pb-6 border-b border-white/5">
            <Avatar url={currentUser.avatarUrl} size="sm" />
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                disabled={isPostingComment}
                placeholder="Write a comment..." 
                className="w-full bg-white/5 border border-white/10 rounded-full pl-4 pr-12 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
              />
              <button 
                onClick={handlePostComment}
                disabled={!newComment.trim() || isPostingComment}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-black rounded-full disabled:opacity-50"
              >
                {isPostingComment ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <div onClick={() => onUserClick(comment.author)} className="cursor-pointer">
                  <Avatar url={comment.author.avatarUrl} size="sm" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline mb-1">
                    <span 
                      onClick={() => onUserClick(comment.author)}
                      className="text-sm font-bold text-gray-200 cursor-pointer hover:text-primary"
                    >
                      {comment.author.ens || formatAddress(comment.author.address)}
                    </span>
                    <span className="text-xs text-gray-600">{timeAgo(comment.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-400">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      {showRepostConfirm && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
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
                
                <div className="bg-black/30 rounded-xl p-4 border border-white/5">
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
                  className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRepost}
                  disabled={isReposting}
                  className="flex-1 px-4 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
