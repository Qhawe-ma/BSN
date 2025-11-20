import React, { useEffect, useState } from 'react';
import { MessageSquare, Heart, Share2, Repeat, MoreHorizontal, ShieldCheck, Send, Loader } from 'lucide-react';
import { Post, Comment, User } from '../types';
import { DataService, formatAddress, generateAvatar } from '../services';
import { GlassCard, Button, Avatar, Badge } from '../components/UIComponents';
import { FirebaseService } from '../firebaseService';

const PostItem: React.FC<{ post: Post; onUserClick: (user: User) => void; currentUser?: User }> = ({ post, onUserClick, currentUser }) => {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  
  // Comment Input State
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    DataService.toggleLike(post.id);
  };

  const toggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setIsLoadingComments(true);
      const fetched = await DataService.getComments(post.id);
      setComments(fetched);
      setIsLoadingComments(false);
    }
    setShowComments(!showComments);
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    
    setIsPostingComment(true);
    const comment = await DataService.postComment(post.id, newComment, currentUser);
    setComments(prev => [...prev, comment]);
    setNewComment("");
    setCommentsCount(prev => prev + 1);
    setIsPostingComment(false);
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
      <div className="p-4 md:p-6">
        {/* Header */}
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
                {post.author.ens && <ShieldCheck size={14} className="text-blue-400" />}
                <span className="text-gray-500 text-xs md:text-sm">· {timeAgo(post.timestamp)}</span>
              </div>
              <span className="text-gray-500 text-xs font-mono">{formatAddress(post.author.address)}</span>
            </div>
          </div>
          <button className="text-gray-500 hover:text-white transition-colors">
            <MoreHorizontal size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="pl-0 md:pl-[3.5rem]">
          <p className="text-gray-100 leading-relaxed text-sm md:text-[15px] mb-4 whitespace-pre-wrap break-words">
            {post.content}
          </p>

          {post.attachmentUrl && (
            <div className="mb-4 rounded-2xl overflow-hidden border border-white/5 shadow-lg">
              <img src={post.attachmentUrl} alt="Attachment" className="w-full h-auto max-h-80 md:max-h-96 object-cover" />
            </div>
          )}

          {/* Token Metadata (Subtle) */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 text-[10px] font-mono text-gray-600">
             <span className="bg-white/5 px-2 py-1 rounded-md border border-white/5">Token ID: #{post.tokenId}</span>
             <a href={`https://bscscan.com/tx/${post.txHash}`} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
               Tx: {post.txHash.substring(0,8)}...
             </a>
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
            
            <button className="group flex items-center gap-2 hover:text-green-400 transition-colors text-sm">
               <div className="p-2 rounded-full group-hover:bg-green-400/10 transition-colors">
                <Repeat size={18} />
              </div>
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

            <button className="group flex items-center gap-2 hover:text-primary transition-colors text-sm">
               <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                <Share2 size={18} />
              </div>
            </button>
          </div>
        </div>
      </div>

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
                    <Avatar url={comment.author.avatarUrl} size="sm" bordered={false} />
                  </div>
                  <div className="flex-1">
                      <div className="flex justify-between items-baseline mb-1">
                         <span 
                          onClick={() => onUserClick(comment.author)}
                          className="text-sm font-bold text-gray-200 cursor-pointer hover:text-primary hover:underline"
                         >
                            {comment.author.ens || formatAddress(comment.author.address)}
                         </span>
                         <span className="text-[10px] text-gray-600">{timeAgo(comment.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-400">{comment.content}</p>
                  </div>
                </div>
              ))}
              
              {/* Comment Input */}
              {currentUser ? (
                  <div className="flex gap-3 pt-4 items-center">
                     <Avatar url={currentUser.avatarUrl} size="sm" />
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

export const FeedView: React.FC<{ type: 'global' | 'following'; onUserClick: (user: User) => void; currentUser?: User }> = ({ type, onUserClick, currentUser }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedType, setFeedType] = useState<'forYou' | 'following'>('forYou');
  const [followingAddresses, setFollowingAddresses] = useState<string[]>([]);

  useEffect(() => {
    const loadFollowing = async () => {
      if (currentUser) {
        const following = await FirebaseService.getFollowing(currentUser.address);
        setFollowingAddresses(following);
      }
    };
    loadFollowing();
  }, [currentUser]);

  useEffect(() => {
    setLoading(true);
    DataService.getFeed().then(data => {
      setPosts(data);
      setLoading(false);
    });
  }, [type]);

  const filteredPosts = feedType === 'following' && currentUser
    ? posts.filter(post => followingAddresses.includes(post.author.address))
    : posts;

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
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-4 px-2">
          Home
        </h2>
        
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
        filteredPosts.map(post => (
          <PostItem key={post.id} post={post} onUserClick={onUserClick} currentUser={currentUser} />
        ))
      )}
    </div>
  );
};