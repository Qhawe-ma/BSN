import React, { useEffect, useState, useRef, memo, useCallback } from 'react';
import { MessageSquare, Heart, Share2, Repeat, MoreHorizontal, ShieldCheck, Send, Loader, X, Check, Flag, AlertTriangle, ImagePlus } from 'lucide-react';
import { Post, Comment, User } from '../types';
import { DataService, BlockchainService, FeedEvents, formatAddress, generateAvatar, getStreamState } from '../services';
import { GlassCard, Button, Avatar, Badge } from '../components/UIComponents';
import { FirebaseService } from '../firebaseService';
import { Portal } from '../components/Portal';
import { BadgeIcon } from '../components/BadgeIcon';
import { LazyImage } from '../components/LazyImage';

const PostItemComponent: React.FC<{ post: Post; onUserClick: (user: User) => void; onPostClick: (postId: string) => void; currentUser?: User }> = ({ post, onUserClick, onPostClick, currentUser }) => {
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
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const commentImageInputRef = useRef<HTMLInputElement>(null);

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
      DataService.isPostLiked(post.internalId, currentUser.address).then(setIsLiked);
      FirebaseService.hasReposted(post.internalId, currentUser.address).then(setHasReposted);
    }
  }, [currentUser, post.internalId]);

  // Real-time subscription to post stats
  useEffect(() => {
    const unsubscribe = FirebaseService.subscribeToPostStats(post.internalId, (stats) => {
      setLikesCount(stats.likes);
      setCommentsCount(stats.comments);
      setRepostsCount(stats.reposts);
    });
    return () => unsubscribe();
  }, [post.internalId]);

  // Real-time subscription to comments when comments section is open
  useEffect(() => {
    if (!showComments) return;
    const unsubscribe = FirebaseService.subscribeToComments(post.internalId, (updatedComments) => {
      setComments(updatedComments);
    });
    return () => unsubscribe();
  }, [post.internalId, showComments]);

  const handleLike = async () => {
    if (!currentUser || isLiking) return;

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

  const toggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setIsLoadingComments(true);
      const fetched = await DataService.getComments(post.internalId);
      setComments(fetched);
      setIsLoadingComments(false);
    }
    setShowComments(!showComments);
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
    if ((!newComment.trim() && !commentImage) || !currentUser) return;

    const commentText = newComment.trim();
    const tempId = `temp_${Date.now()}`;
    const savedImage = commentImage;
    const savedPreview = commentImagePreview;

    const optimisticComment: Comment = {
      id: tempId,
      postId: parseInt(post.tokenId),
      author: currentUser,
      content: commentText,
      timestamp: Date.now(),
      imageUrl: savedPreview || undefined
    };

    setComments(prev => [...prev, optimisticComment]);
    setNewComment("");
    clearCommentImage();
    setCommentsCount(prev => prev + 1);
    setIsPostingComment(true);

    try {
      let imageUrl: string | undefined;

      // Upload image first if present
      if (savedImage) {
        try {
          const formData = new FormData();
          formData.append('image', savedImage);

          const response = await fetch('/api/upload/comment-image', {
            method: 'POST',
            body: formData
          });

          // Safely parse response
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (response.ok && data.success && data.imageUrl) {
              imageUrl = data.imageUrl;
            } else if (data.error) {
              console.warn('Upload error:', data.error);
            }
          } else if (!response.ok) {
            console.warn('Upload failed with non-JSON response:', response.status);
          }
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          // Still post comment without image if upload fails
        }
      }

      const comment = await DataService.postComment(post.internalId, commentText, currentUser, imageUrl);
      setComments(prev => prev.map(c => c.id === tempId ? { ...comment, imageUrl: imageUrl || comment.imageUrl } : c));
    } catch (error) {
      console.error('Error posting comment:', error);
      setComments(prev => prev.filter(c => c.id !== tempId));
      setCommentsCount(prev => Math.max(0, prev - 1));
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${post.tokenId}`;
    const shareText = `Check out this post by ${post.author.ens || formatAddress(post.author.address)} on Solana Social`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Solana Social Post',
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

  const isOptimistic = post.isOptimistic === true;
  const optimisticStatus = post.optimisticStatus;

  return (
    <GlassCard className={`mb-4 md:mb-6 hover:border-white/10 transition-all duration-300 cursor-pointer ${isOptimistic ? 'relative overflow-hidden' : ''}`} onClick={() => !isOptimistic && onPostClick(post.tokenId)}>
      {/* Optimistic Post Indicator - Shows "Posting..." status */}
      {isOptimistic && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none z-0">
          <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-primary via-yellow-400 to-primary animate-pulse w-full"></div>
        </div>
      )}

      {/* Repost Indicator */}
      {post.isRepost && post.originalAuthor && (
        <div className="px-4 md:px-6 pt-3 flex items-center gap-2 text-gray-500 text-xs">
          <Repeat size={12} />
          <span className="flex items-center gap-1 flex-wrap">
            <span
              onClick={(e) => { e.stopPropagation(); onUserClick(post.author); }}
              className="font-semibold hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              {post.author.ens || formatAddress(post.author.address)}
              {post.author.activeBadge && post.author.activeBadge.status === 'active' && (
                <BadgeIcon badgeType={post.author.activeBadge.badgeType} size="sm" />
              )}
            </span>
            {' '}reposted from{' '}
            <span
              onClick={(e) => { e.stopPropagation(); onUserClick(post.originalAuthor!); }}
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
            <div onClick={(e) => { e.stopPropagation(); onUserClick(post.author); }} className="cursor-pointer hover:opacity-80 transition-opacity">
              <Avatar url={post.author.avatarUrl} size="md" address={post.author.address} />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span
                  onClick={(e) => { e.stopPropagation(); onUserClick(post.author); }}
                  className="font-bold text-white text-sm md:text-base hover:underline cursor-pointer hover:text-primary transition-colors"
                >
                  {post.author.ens || formatAddress(post.author.address)}
                </span>
                {post.author.activeBadge && post.author.activeBadge.status === 'active' && (
                  <BadgeIcon badgeType={post.author.activeBadge.badgeType} size="sm" />
                )}
                <span className="text-gray-500 text-xs md:text-sm">
                  {isOptimistic ? (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <Loader size={12} className="animate-spin" />
                      {optimisticStatus === 'confirming' ? 'Confirming...' : 'Posting...'}
                    </span>
                  ) : (
                    <>· {timeAgo(post.timestamp)}</>
                  )}
                </span>
              </div>
              <span className="text-gray-500 text-xs font-mono">{formatAddress(post.author.address)}</span>
            </div>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
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
          <p className="text-gray-100 leading-relaxed text-sm md:text-[15px] mb-4 whitespace-pre-wrap break-words hover:text-white transition-colors">
            {post.content}
          </p>

          {post.attachmentUrl && (
            <div className="mb-4 rounded-2xl overflow-hidden border border-white/5 shadow-lg hover:border-white/10 transition-colors">
              <LazyImage
                src={post.attachmentUrl}
                alt="Attachment"
                className="w-full h-auto min-h-[100px]"
                placeholderColor="bg-white/5"
              />
            </div>
          )}

          {/* Token Metadata (Subtle) - Hidden for optimistic posts */}
          {!isOptimistic ? (
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 text-[10px] font-mono text-gray-600" onClick={(e) => e.stopPropagation()}>
              <a
                href={post.txHash
                  ? `https://solscan.io/tx/${post.txHash}`
                  : `https://solscan.io/token/${post.tokenId}#metadata_metadata`
                }
                target="_blank"
                rel="noreferrer"
                className="bg-white/5 px-2 py-1 rounded-md border border-white/5 hover:text-primary hover:border-primary/30 transition-colors"
              >
                Token ID: #{post.tokenId}
              </a>
              <span className="flex items-center gap-1 text-green-500/60 ml-auto">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                On-Chain
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 text-[10px] font-mono">
              <span className="flex items-center gap-2 text-primary/80 bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
                <Loader size={10} className="animate-spin" />
                Minting to blockchain...
              </span>
            </div>
          )}

          {/* Actions - Disabled for optimistic posts */}
          <div className={`flex items-center justify-between text-gray-400 max-w-md mt-2 ${isOptimistic ? 'opacity-50 pointer-events-none' : ''}`} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={toggleComments}
              disabled={isOptimistic}
              className="group flex items-center gap-2 hover:text-blue-400 transition-colors text-sm"
            >
              <div className="p-2 rounded-full group-hover:bg-blue-400/10 transition-colors -ml-2">
                <MessageSquare size={18} />
              </div>
              <span>{commentsCount || ''}</span>
            </button>

            <button
              onClick={handleRepostClick}
              disabled={isReposting || hasReposted || isOptimistic}
              className={`group flex items-center gap-2 transition-colors text-sm ${hasReposted ? 'text-green-400' : 'hover:text-green-400'
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
              disabled={isOptimistic}
              className={`group flex items-center gap-2 transition-colors text-sm ${isLiked ? 'text-pink-500' : 'hover:text-pink-500'}`}
            >
              <div className="p-2 rounded-full group-hover:bg-pink-500/10 transition-colors">
                <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
              </div>
              <span>{likesCount || ''}</span>
            </button>

            <button
              onClick={handleShare}
              disabled={isOptimistic}
              className={`group flex items-center gap-2 transition-colors text-sm ${shareStatus !== 'idle' ? 'text-primary' : 'hover:text-primary'
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
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${reportReason === reason
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
                    {comment.content && <p className="text-sm text-gray-400">{comment.content}</p>}
                    {comment.imageUrl && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-white/5 max-w-xs">
                        <LazyImage src={comment.imageUrl} alt="Comment attachment" className="w-full h-auto" />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Comment Input */}
              {currentUser ? (
                <div className="pt-4">
                  {commentImagePreview && (
                    <div className="mb-3 relative inline-block">
                      <img src={commentImagePreview} alt="Preview" className="max-h-32 rounded-xl border border-white/10" />
                      <button onClick={clearCommentImage} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-3 items-center">
                    <Avatar url={currentUser.avatarUrl} size="sm" address={currentUser.address} />
                    <div className="relative flex-1 group flex items-center gap-2">
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
                        placeholder="Write your reply..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-full pl-4 pr-12 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
                      />
                      <button
                        onClick={handlePostComment}
                        disabled={(!newComment.trim() && !commentImage) || isPostingComment}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-black rounded-full hover:shadow-lg hover:shadow-primary/20 disabled:opacity-0 disabled:pointer-events-none transition-all"
                      >
                        {isPostingComment ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
                      </button>
                    </div>
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

const PostItem = memo(PostItemComponent);

const POSTS_PER_PAGE = 10;
const INITIAL_POSTS = 6;

export const FeedView: React.FC<{ type: 'global' | 'following'; onUserClick: (user: User) => void; onPostClick: (postId: string) => void; currentUser?: User }> = ({ type, onUserClick, onPostClick, currentUser }) => {
  const cachedOnMount = DataService.getCachedFeed();
  const [posts, setPosts] = useState<Post[]>(cachedOnMount || []);
  const [loading, setLoading] = useState(!cachedOnMount || cachedOnMount.length === 0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamProgress, setStreamProgress] = useState({ loaded: 0, total: 0 });
  const [feedType, setFeedType] = useState<'forYou' | 'following'>('forYou');
  const [followingAddresses, setFollowingAddresses] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(cachedOnMount && cachedOnMount.length > 0);

  useEffect(() => {
    const loadFollowing = async () => {
      if (currentUser) {
        const following = await FirebaseService.getFollowing(currentUser.address);
        setFollowingAddresses(following);
      }
    };
    loadFollowing();
  }, [currentUser]);

  const loadFeedProgressive = useCallback(async (forceRefresh = false) => {
    const cached = DataService.getCachedFeed();
    if (cached && cached.length > 0) {
      setPosts(cached);
      setLoading(false);

      if (!forceRefresh && DataService.isCacheValid()) {
        console.log('Using cached feed - instant load');
        return;
      }
    }

    if (!cached || cached.length === 0) {
      setLoading(true);
    }

    setIsStreaming(true);
    DataService.getFeedProgressive(forceRefresh);
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      loadFeedProgressive(false);
    }
  }, [type, loadFeedProgressive]);

  useEffect(() => {
    const unsubscribe = FeedEvents.subscribeToStream((streamedPosts, state) => {
      setPosts(streamedPosts);
      setStreamProgress({ loaded: state.loadedCount, total: state.totalCount });

      if (streamedPosts.length > 0) {
        setLoading(false);
      }

      if (!state.isLoading) {
        setIsStreaming(false);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = FeedEvents.subscribe(() => {
      console.log('Feed update received');
      const cached = DataService.getCachedFeed();
      if (cached && cached.length > 0) {
        setPosts(cached);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const filteredPosts = feedType === 'following' && currentUser
    ? posts.filter(post => followingAddresses.includes(post.author.address))
    : posts;

  useEffect(() => {
    setVisibleCount(POSTS_PER_PAGE);
  }, [feedType]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredPosts.length) {
          setVisibleCount(prev => Math.min(prev + POSTS_PER_PAGE, filteredPosts.length));
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [visibleCount, filteredPosts.length]);

  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPosts.length || isStreaming;

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
            className={`flex-1 py-3 text-sm font-bold transition-all relative ${feedType === 'forYou'
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
            className={`flex-1 py-3 text-sm font-bold transition-all relative ${feedType === 'following'
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
            <PostItem key={`${post.contractAddress || 'default'}_${post.tokenId}`} post={post} onUserClick={onUserClick} onPostClick={onPostClick} currentUser={currentUser} />
          ))}

          {hasMore && (
            <div ref={loadMoreRef} className="py-8">
              {isStreaming && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Loader size={16} className="animate-spin text-primary" />
                    <span>Loading posts... {streamProgress.loaded > 0 ? `${streamProgress.loaded}/${streamProgress.total}` : ''}</span>
                  </div>
                  {streamProgress.total > 0 && (
                    <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-yellow-400 transition-all duration-300"
                        style={{ width: `${(streamProgress.loaded / streamProgress.total) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};