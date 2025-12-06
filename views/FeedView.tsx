import React, { useEffect, useState, useRef } from 'react';
import { MessageSquare, Heart, Share2, Repeat, MoreHorizontal, ShieldCheck, Send, Loader, X, Check, Flag, AlertTriangle } from 'lucide-react';
import { Post, Comment, User } from '../types';
import { DataService, BlockchainService, FeedEvents, formatAddress, generateAvatar } from '../services';
import { GlassCard, Button, Avatar, Badge } from '../components/UIComponents';
import { FirebaseService } from '../firebaseService';
import { Portal } from '../components/Portal';
import { BadgeIcon } from '../components/BadgeIcon';

const PostItem: React.FC<{ post: Post; onUserClick: (user: User) => void; onPostClick: (postId: string) => void; currentUser?: User }> = ({ post, onUserClick, onPostClick, currentUser }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [repostsCount, setRepostsCount] = useState(post.repostsCount || 0);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [showRepostConfirm, setShowRepostConfirm] = useState(false);
  const [hasReposted, setHasReposted] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared'>('idle');
  
  // Comment Input State
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  
  // Menu and Report State
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check if current user has liked this post and has reposted
  useEffect(() => {
    if (currentUser) {
      DataService.isPostLiked(post.tokenId, currentUser.address).then(setIsLiked);
      FirebaseService.hasReposted(post.tokenId, currentUser.address).then(setHasReposted);
    }
  }, [currentUser, post.tokenId]);

  const handleLike = async () => {
    if (!currentUser || isLiking) return;
    
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

  const toggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setIsLoadingComments(true);
      const fetched = await DataService.getComments(post.tokenId);
      setComments(fetched);
      setIsLoadingComments(false);
    }
    setShowComments(!showComments);
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    
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
    if (!currentUser || isReposting) return;
    
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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Handle report submission
  const handleReport = async () => {
    if (!reportReason.trim()) return;
    
    setIsReporting(true);
    try {
      await FirebaseService.reportPost(
        post.tokenId,
        currentUser?.address || 'anonymous',
        reportReason,
        post.content,
        post.author.ens || post.author.address
      );
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportReason('');
        setReportSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error reporting post:', error);
      alert('Failed to report post. Please try again.');
    } finally {
      setIsReporting(false);
    }
  };

  // Format time nicely
  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <GlassCard className="mb-4 md:mb-6 hover:border-white/10 transition-all duration-300">
      {/* Repost Indicator */}
      {post.isRepost && post.originalAuthor && (
        <div className="px-4 md:px-6 pt-3 flex items-center gap-2 text-gray-500 text-xs">
          <Repeat size={12} />
          <span className="flex items-center gap-1 flex-wrap">
            <span 
              onClick={() => onUserClick(post.author)} 
              className="font-semibold hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              {post.author.ens || formatAddress(post.author.address)}
              {post.author.activeBadge && post.author.activeBadge.status === 'active' && (
                <BadgeIcon badgeType={post.author.activeBadge.badgeType} size="sm" />
              )}
            </span>
            {' '}reposted from{' '}
            <span 
              onClick={() => onUserClick(post.originalAuthor!)} 
              className="font-semibold hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              {post.originalAuthor.ens || formatAddress(post.originalAuthor.address)}
              {post.originalAuthor.activeBadge && post.originalAuthor.activeBadge.status === 'active' && (
                <BadgeIcon badgeType={post.originalAuthor.activeBadge.badgeType} size="sm" />
              )}
            </span>
          </span>
        </div>
      )}
      
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-3">
            <div onClick={() => onUserClick(post.author)} className="cursor-pointer hover:opacity-80 transition-opacity">
              <Avatar url={post.author.avatarUrl} size="md" address={post.author.address} />
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
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
            >
              <MoreHorizontal size={20} />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-8 w-48 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowReportModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-400 hover:bg-red-500/10 transition-colors text-sm"
                >
                  <Flag size={16} />
                  Report Post
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content - Clickable to view post details */}
        <div className="pl-0 md:pl-[3.5rem]">
          <div 
            onClick={() => onPostClick(post.tokenId)}
            className="cursor-pointer"
          >
            <p className="text-gray-100 leading-relaxed text-sm md:text-[15px] mb-4 whitespace-pre-wrap break-words hover:text-white transition-colors">
              {post.content}
            </p>

            {post.attachmentUrl && (
              <div className="mb-4 rounded-2xl overflow-hidden border border-white/5 shadow-lg hover:border-white/10 transition-colors">
                <img src={post.attachmentUrl} alt="Attachment" className="w-full h-auto object-contain" />
              </div>
            )}
          </div>

          {/* Token Metadata (Subtle) */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 text-[10px] font-mono text-gray-600">
             <a 
               href={`https://bscscan.com/token/${import.meta.env.VITE_BSC_CONTRACT_ADDRESS}?a=${post.tokenId}`} 
               target="_blank" 
               rel="noreferrer" 
               className="bg-white/5 px-2 py-1 rounded-md border border-white/5 hover:text-primary hover:border-primary/30 transition-colors"
             >
               Token ID: #{post.tokenId}
             </a>
             {post.txHash && (
               <a href={`https://bscscan.com/tx/${post.txHash}`} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                 Tx: {post.txHash.substring(0,8)}...
               </a>
             )}
             <span className="flex items-center gap-1 text-green-500/60 ml-auto">
               <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
               On-Chain
             </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between text-gray-400 max-w-md mt-2">
            <button 
              onClick={toggleComments}
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
              } ${isReposting ? 'opacity-50 cursor-wait' : ''}`}
            >
               <div className="p-2 rounded-full group-hover:bg-green-400/10 transition-colors">
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
               <div className="p-2 rounded-full group-hover:bg-pink-500/10 transition-colors">
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

      {/* Repost Confirmation Modal - Using Portal to render outside post container */}
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
                    <Avatar url={post.author.avatarUrl} size="sm" address={post.author.address} />
                    <div>
                      <span className="text-sm font-semibold text-white">
                        {post.author.ens || formatAddress(post.author.address)}
                      </span>
                    </div>
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
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-yellow-400 text-black font-bold transition-all hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

      {/* Report Modal */}
      {showReportModal && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              {reportSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} className="text-green-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Report Submitted</h3>
                  <p className="text-gray-400 text-sm">Thank you for helping keep our community safe.</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                        <AlertTriangle size={20} className="text-red-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white">Report Post</h3>
                    </div>
                    <button 
                      onClick={() => {
                        setShowReportModal(false);
                        setReportReason('');
                      }}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-gray-400 text-sm mb-4">
                      Why are you reporting this post? Your report will be reviewed by our moderation team.
                    </p>
                    
                    <div className="space-y-2 mb-4">
                      {['Spam or misleading', 'Harassment or hate speech', 'Inappropriate content', 'Scam or fraud', 'Other'].map((reason) => (
                        <button
                          key={reason}
                          onClick={() => setReportReason(reason)}
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                            reportReason === reason 
                              ? 'bg-red-500/20 border-red-500/50 text-white' 
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                    
                    {reportReason === 'Other' && (
                      <textarea
                        value={reportReason === 'Other' ? '' : reportReason}
                        onChange={(e) => setReportReason(e.target.value || 'Other')}
                        placeholder="Please describe the issue..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 resize-none h-24"
                      />
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowReportModal(false);
                        setReportReason('');
                      }}
                      className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReport}
                      disabled={!reportReason.trim() || isReporting}
                      className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-bold transition-all hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isReporting ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Flag size={16} />
                          Submit Report
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Portal>
      )}

      {/* Comments Section */}
      {showComments && (
        <div className="bg-black/20 border-t border-white/5 p-4 md:p-6 md:pl-[5rem]">
          {isLoadingComments ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3 animate-in fade-in duration-300">
                  <div onClick={() => onUserClick(comment.author)} className="cursor-pointer">
                    <Avatar url={comment.author.avatarUrl} size="sm" bordered={false} address={comment.author.address} />
                  </div>
                  <div className="flex-1">
                      <div className="flex justify-between items-baseline mb-1">
                         <div className="flex items-center gap-1.5">
                           <span 
                            onClick={() => onUserClick(comment.author)}
                            className="text-sm font-bold text-gray-200 cursor-pointer hover:text-primary hover:underline"
                           >
                              {comment.author.ens || formatAddress(comment.author.address)}
                           </span>
                           {comment.author.activeBadge && comment.author.activeBadge.status === 'active' && (
                             <BadgeIcon badgeType={comment.author.activeBadge.badgeType} size="sm" />
                           )}
                         </div>
                         <span className="text-[10px] text-gray-600">{timeAgo(comment.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-400">{comment.content}</p>
                  </div>
                </div>
              ))}
              
              {/* Comment Input */}
              {currentUser ? (
                  <div className="flex gap-3 pt-4 items-center">
                     <Avatar url={currentUser.avatarUrl} size="sm" address={currentUser.address} />
                     <div className="relative flex-1 group">
                       <input 
                          type="text" 
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                          disabled={isPostingComment}
                          placeholder="Write your reply..." 
                          className="w-full bg-white/5 border border-white/10 rounded-full pl-4 pr-12 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
                       />
                       <button 
                         onClick={handlePostComment}
                         disabled={!newComment.trim() || isPostingComment}
                         className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-black rounded-full hover:shadow-lg hover:shadow-primary/20 disabled:opacity-0 disabled:pointer-events-none transition-all"
                       >
                          {isPostingComment ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
                       </button>
                     </div>
                  </div>
              ) : (
                  <div className="pt-4 text-center">
                      <p className="text-sm text-gray-500">Connect wallet to reply</p>
                  </div>
              )}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
};

const POSTS_PER_PAGE = 4;

export const FeedView: React.FC<{ type: 'global' | 'following'; onUserClick: (user: User) => void; onPostClick: (postId: string) => void; currentUser?: User }> = ({ type, onUserClick, onPostClick, currentUser }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedType, setFeedType] = useState<'forYou' | 'following'>('forYou');
  const [followingAddresses, setFollowingAddresses] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadFollowing = async () => {
      if (currentUser) {
        const following = await FirebaseService.getFollowing(currentUser.address);
        setFollowingAddresses(following);
      }
    };
    loadFollowing();
  }, [currentUser]);

  const loadFeed = async (forceRefresh = false) => {
    // Try to show cached posts immediately (no loading skeleton)
    const cached = DataService.getCachedFeed();
    if (cached && cached.length > 0) {
      setPosts(cached);
      setLoading(false);
      
      // If not forcing refresh and cache is valid, we're done
      if (!forceRefresh && DataService.isCacheValid()) {
        console.log('📦 Using cached feed');
        return;
      }
    }
    
    // If no cache, show loading skeleton
    if (!cached || cached.length === 0) {
      setLoading(true);
    }
    
    // Fetch fresh data (in background if we have cached posts)
    const data = await DataService.getFeed(forceRefresh);
    setPosts(data);
    setLoading(false);
  };

  useEffect(() => {
    loadFeed(false); // Use cache on navigation
  }, [type]);

  // Subscribe to feed updates (e.g., after minting a new post)
  useEffect(() => {
    const unsubscribe = FeedEvents.subscribe(() => {
      console.log('📡 Feed update received, refreshing...');
      loadFeed(true); // Force refresh after minting
    });
    return unsubscribe;
  }, []);

  const filteredPosts = feedType === 'following' && currentUser
    ? posts.filter(post => followingAddresses.includes(post.author.address))
    : posts;

  // Reset visible count when switching tabs
  useEffect(() => {
    setVisibleCount(POSTS_PER_PAGE);
  }, [feedType]);

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && visibleCount < filteredPosts.length) {
          setLoadingMore(true);
          setTimeout(() => {
            setVisibleCount(prev => Math.min(prev + POSTS_PER_PAGE, filteredPosts.length));
            setLoadingMore(false);
          }, 300);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [visibleCount, filteredPosts.length, loadingMore]);

  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPosts.length;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto pt-4 md:pt-8 space-y-6 px-4 md:px-0">
        {[1, 2, 3].map(i => (
           <GlassCard key={i} className="mb-4 md:mb-6 border-white/5">
            <div className="p-4 md:p-6 animate-pulse">
              {/* Header Skeleton */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3 w-full">
                  <div className="w-11 h-11 rounded-full bg-white/10 shrink-0" />
                  <div className="flex flex-col justify-center gap-2">
                    <div className="h-4 bg-white/10 rounded w-32" />
                    <div className="h-3 bg-white/5 rounded w-24" />
                  </div>
                </div>
              </div>

              {/* Content Skeleton */}
              <div className="pl-0 md:pl-[3.5rem] space-y-3">
                <div className="h-4 bg-white/5 rounded w-full" />
                <div className="h-4 bg-white/5 rounded w-11/12" />
                <div className="h-4 bg-white/5 rounded w-4/6" />
                
                {/* Media Placeholder */}
                <div className="mt-4 h-48 md:h-64 w-full bg-white/5 rounded-2xl border border-white/5" />

                {/* Actions Skeleton */}
                <div className="flex justify-between max-w-md mt-6 opacity-50">
                     <div className="flex gap-2">
                        <div className="h-5 w-5 bg-white/10 rounded-full" />
                        <div className="h-5 w-8 bg-white/10 rounded" />
                     </div>
                     <div className="h-5 w-5 bg-white/10 rounded-full" />
                     <div className="flex gap-2">
                        <div className="h-5 w-5 bg-white/10 rounded-full" />
                        <div className="h-5 w-8 bg-white/10 rounded" />
                     </div>
                     <div className="h-5 w-5 bg-white/10 rounded-full" />
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pt-4 pb-20 md:pb-0 px-4 md:px-0">
      {/* Feed Header with Toggle */}
      <div className="mb-6">
        {/* Tab Toggle */}
        <div className="border-b border-white/10 flex">
          <button
            onClick={() => setFeedType('forYou')}
            className={`flex-1 py-3 text-sm font-bold transition-all relative ${
              feedType === 'forYou'
                ? 'text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            For You
            {feedType === 'forYou' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full"></div>
            )}
          </button>
          
          <button
            onClick={() => setFeedType('following')}
            className={`flex-1 py-3 text-sm font-bold transition-all relative ${
              feedType === 'following'
                ? 'text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Following
            {feedType === 'following' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full"></div>
            )}
          </button>
        </div>
      </div>

      {/* Posts */}
      {filteredPosts.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={24} className="text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {feedType === 'following' ? 'No posts yet' : 'Feed is empty'}
            </h3>
            <p className="text-gray-400 text-sm max-w-sm">
              {feedType === 'following'
                ? 'Follow some users to see their posts here!'
                : 'Be the first to mint a post on the blockchain!'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {visiblePosts.map(post => (
            <PostItem key={post.id} post={post} onUserClick={onUserClick} onPostClick={onPostClick} currentUser={currentUser} />
          ))}
          
          {/* Infinite scroll trigger */}
          {hasMore && (
            <div ref={loadMoreRef} className="py-8 flex justify-center">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader size={20} className="animate-spin" />
                  <span className="text-sm">Loading more...</span>
                </div>
              ) : (
                <div className="h-8" />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};