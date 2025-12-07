import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Link as LinkIcon, Grid, Calendar, MessageSquare, UserPlus, Settings, X, Save, Wallet, Image as ImageIcon, Heart, Loader, Upload, Camera } from 'lucide-react';
import { User, Post } from '../types';
import { GlassCard, Avatar, Button, Badge, Input } from '../components/UIComponents';
import { FirebaseService } from '../firebaseService';
import { DataService, formatAddress } from '../services';
import { BadgeIcon } from '../components/BadgeIcon';

interface ProfileViewProps {
    user: User;
    currentUser?: User;
    onNavigateToChat?: (targetAddress: string) => void;
    onUpdateProfile?: (updatedUser: Partial<User>) => void;
    onConnect?: () => void;
    isConnecting?: boolean;
    onRefreshProfile?: () => void;
    onPostClick?: (postId: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, currentUser, onNavigateToChat, onUpdateProfile, onConnect, isConnecting = false, onRefreshProfile, onPostClick }) => {
  const [copied, setCopied] = useState(false);
  const [profileShared, setProfileShared] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  
  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  
  // Local follower/following counts that update in real-time
  const [followersCount, setFollowersCount] = useState(user.followers || 0);
  const [followingCount, setFollowingCount] = useState(user.following || 0);
  
  // Sync local counts when user prop updates from parent
  useEffect(() => {
    setFollowersCount(user.followers || 0);
    setFollowingCount(user.following || 0);
  }, [user.followers, user.following]);
  
  // Determine if we are viewing our own profile (requires currentUser to exist)
  const isOwnProfile = currentUser?.address === user.address;

  // Edit State
  const [editEns, setEditEns] = useState(user.ens || "");
  const [editBio, setEditBio] = useState(user.bio || "");
  const [editWebsite, setEditWebsite] = useState(user.website || "");
  const [editAvatar, setEditAvatar] = useState(user.avatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be less than 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Only JPEG, PNG, GIF, or WebP images allowed');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setEditAvatar(data.avatarUrl);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Fetch fresh profile counts from Firebase and check follow status
  useEffect(() => {
    setIsFollowing(false);
    
    const loadProfileData = async () => {
      try {
        const freshProfile = await FirebaseService.getUserProfile(user.address);
        if (freshProfile) {
          setFollowersCount(freshProfile.followers || 0);
          setFollowingCount(freshProfile.following || 0);
        }
        
        if (currentUser && !isOwnProfile) {
          console.log('🔍 Checking follow status:', currentUser.address, '->', user.address);
          const following = await FirebaseService.isFollowing(currentUser.address, user.address);
          console.log('✅ Follow status result:', following);
          setIsFollowing(following);
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
      }
    };
    
    loadProfileData();
  }, [currentUser?.address, user.address, isOwnProfile]);

  // Load posts for this user's profile
  useEffect(() => {
    const loadPosts = async () => {
      setIsLoadingPosts(true);
      try {
        const userPosts = await DataService.getPostsByOwner(user.address);
        setPosts(userPosts);
      } catch (error) {
        console.error('Error loading profile posts:', error);
        setPosts([]);
      } finally {
        setIsLoadingPosts(false);
      }
    };
    
    loadPosts();
  }, [user.address]);
  
  const handleFollow = async () => {
    if (!currentUser || isFollowLoading) return;

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await FirebaseService.unfollowUser(currentUser.address, user.address);
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        await FirebaseService.followUser(currentUser.address, user.address);
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
      
      // Refresh profile to show updated counts
      if (onRefreshProfile) {
        onRefreshProfile();
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(user.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareProfile = () => {
    const profileUrl = `${window.location.origin}/?profile=${user.address}`;
    navigator.clipboard.writeText(profileUrl);
    setProfileShared(true);
    setTimeout(() => setProfileShared(false), 2000);
  };

  const handleSaveProfile = () => {
      if (onUpdateProfile) {
          onUpdateProfile({
              ens: editEns,
              bio: editBio,
              website: editWebsite,
              avatarUrl: editAvatar
          });
      }
      setIsEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto pt-4 md:pt-8 pb-24 px-4 animate-fade-in">
      {/* Profile Header */}
      <GlassCard className="relative overflow-hidden mb-8 border-0 shadow-2xl bg-gray-900/60">
        {/* Banner */}
        <div className="h-48 bg-gradient-to-r from-yellow-900/30 via-amber-900/20 to-gray-900/40 w-full relative">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-900/80 to-transparent"></div>
        </div>
        
        <div className="px-8 pb-8">
          <div className="flex flex-col md:flex-row justify-between items-end -mt-16 mb-6 gap-4">
            <div className="relative">
                <div className="p-2 bg-[#0F1115] rounded-full inline-block shadow-xl">
                   <Avatar url={user.avatarUrl} size="xl" address={user.address} />
                </div>
                <div className="absolute bottom-3 right-3 w-5 h-5 bg-green-500 border-4 border-[#0F1115] rounded-full"></div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 mb-2">
               {currentUser ? (
                 isOwnProfile ? (
                   <>
                      <Button onClick={shareProfile} variant="secondary" size="sm" className="gap-2">
                          {profileShared ? <Check size={16} className="text-green-400" /> : <LinkIcon size={16} />}
                          {profileShared ? 'Link Copied!' : 'Share Profile'}
                      </Button>
                      <Button onClick={() => setIsEditing(true)} size="sm" className="gap-2">
                          <Settings size={16} />
                          Edit Profile
                      </Button>
                   </>
                 ) : (
                   <>
                      <Button 
                        onClick={handleFollow}
                        disabled={isFollowLoading}
                        variant="secondary" 
                        size="sm" 
                        className={`gap-2 group transition-all ${isFollowing ? 'border-primary/50 bg-primary/10' : 'hover:border-primary/50 hover:text-primary'}`}
                      >
                          <UserPlus size={18} className={`transition-colors ${isFollowing ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`} />
                          {isFollowLoading ? 'Loading...' : (isFollowing ? 'Following' : 'Follow')}
                      </Button>
                      <Button 
                          size="sm" 
                          className="gap-2"
                          onClick={() => onNavigateToChat?.(user.address)}
                      >
                          <MessageSquare size={16} />
                          Message
                      </Button>
                   </>
                 )
               ) : (
                  <Button 
                    onClick={onConnect}
                    disabled={isConnecting}
                    variant="secondary" 
                    size="sm" 
                    className="gap-2 hover:border-white/30 hover:bg-white/10 transition-all"
                  >
                      <Wallet size={16} />
                      {isConnecting ? 'Connecting...' : 'Connect to interact'}
                  </Button>
               )}
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2 tracking-tight">
                {user.ens || `${user.address.substring(0, 6)}...${user.address.substring(user.address.length - 4)}`}
                {user.activeBadge && user.activeBadge.status === 'active' && (
                  <BadgeIcon badgeType={user.activeBadge.badgeType} size="lg" />
                )}
              </h1>
              
              <button 
                onClick={copyAddress}
                className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-5 font-mono text-sm"
              >
                <span className="bg-white/5 px-2.5 py-1 rounded-lg group-hover:bg-white/10 transition-colors border border-white/5 group-hover:border-white/20">
                    {user.address}
                </span>
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="opacity-50 group-hover:opacity-100" />}
              </button>

              <p className="text-gray-300 mb-6 max-w-lg text-sm leading-relaxed font-light">
                {user.bio || "No bio provided."}
              </p>

              <div className="flex gap-6 text-sm text-gray-400 mb-8">
                {user.createdAt && (
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-500" />
                    <span>Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
                {user.website && (
                  <div className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer group">
                    <LinkIcon size={16} className="text-gray-500 group-hover:text-primary" />
                    <a href={user.website} target="_blank" rel="noopener noreferrer" className="border-b border-transparent group-hover:border-primary/30">{user.website.replace(/^https?:\/\//, '')}</a>
                  </div>
                )}
              </div>

              {/* Simple Stats Row */}
              <div className="flex gap-10 py-5 border-t border-white/5">
                <div className="cursor-pointer group">
                   <span className="font-bold text-white text-xl block group-hover:text-primary transition-colors">{isLoadingPosts ? '...' : posts.length}</span>
                   <span className="text-xs text-gray-500 uppercase tracking-wide font-bold">Posts</span>
                </div>
                <div className="cursor-pointer group">
                   <span className="font-bold text-white text-xl block group-hover:text-primary transition-colors">{followersCount}</span>
                   <span className="text-xs text-gray-500 uppercase tracking-wide font-bold">Followers</span>
                </div>
                <div className="cursor-pointer group">
                   <span className="font-bold text-white text-xl block group-hover:text-primary transition-colors">{followingCount}</span>
                   <span className="text-xs text-gray-500 uppercase tracking-wide font-bold">Following</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Content Grid Controls */}
      <div className="flex items-center gap-6 border-b border-white/10 mb-6 px-2">
          <button className="pb-3 text-white font-bold text-sm border-b-2 border-primary flex items-center gap-2">
              <Grid size={18} />
              Posts
          </button>
          <button className="pb-3 text-gray-500 hover:text-white transition-colors font-medium text-sm flex items-center gap-2">
              <Badge color="bg-gray-500" variant="outline">NFTs</Badge>
              Collection
          </button>
      </div>

      {/* Content Grid */}
      {isLoadingPosts ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader size={32} className="text-primary animate-spin mb-4" />
          <p className="text-gray-400">Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <ImageIcon size={24} className="text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Posts Yet</h3>
            <p className="text-gray-400 text-sm max-w-sm">
              {isOwnProfile ? 
                "Start minting your first post to see it here as an NFT!" : 
                "This user hasn't minted any posts yet."
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <GlassCard 
              key={post.tokenId} 
              className="p-4 hover:border-white/10 transition-all cursor-pointer hover:bg-white/5"
              onClick={() => onPostClick?.(post.tokenId)}
            >
              <div className="flex gap-3">
                <Avatar url={post.author.avatarUrl} size="sm" address={post.author.address} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white text-sm">
                      {post.author.ens || formatAddress(post.author.address)}
                    </span>
                    {post.author.activeBadge && post.author.activeBadge.status === 'active' && (
                      <BadgeIcon badgeType={post.author.activeBadge.badgeType} size="sm" />
                    )}
                    <span className="text-gray-500 text-xs">
                      {new Date(post.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mb-3">{post.content}</p>
                  {post.attachmentUrl && (
                    <img 
                      src={post.attachmentUrl} 
                      alt="Post attachment" 
                      className="rounded-xl w-full h-auto object-contain mb-3"
                    />
                  )}
                  <div className="flex items-center gap-4 text-gray-500 text-xs">
                    <div className="flex items-center gap-1">
                      <Heart size={14} />
                      <span>{post.likes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare size={14} />
                      <span>{post.commentsCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
             <div className="w-full max-w-md relative">
                <GlassCard className="p-0 overflow-hidden border border-white/10 bg-[#16161a]">
                    <div className="flex items-center justify-between p-5 border-b border-white/5">
                        <h3 className="text-lg font-bold text-white">Edit Profile</h3>
                        <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-6 space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Display Name (ENS)</label>
                            <Input 
                                value={editEns} 
                                onChange={(e) => setEditEns(e.target.value)} 
                                placeholder="name.eth" 
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bio</label>
                            <textarea 
                                className="w-full bg-black/20 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all min-h-[100px]"
                                value={editBio}
                                onChange={(e) => setEditBio(e.target.value)}
                                placeholder="Tell the world about yourself..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Website</label>
                            <Input 
                                value={editWebsite} 
                                onChange={(e) => setEditWebsite(e.target.value)} 
                                placeholder="https://yourwebsite.com" 
                            />
                        </div>

                        <div className="space-y-2">
                             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Avatar</label>
                             
                             <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                                <div className="relative">
                                  <Avatar url={editAvatar} size="lg" address={user.address} />
                                  {isUploading && (
                                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                      <Loader size={20} className="animate-spin text-primary" />
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex-1">
                                  <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleAvatarUpload}
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    className="hidden"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                  >
                                    <Camera size={16} />
                                    {isUploading ? 'Uploading...' : 'Upload Image'}
                                  </button>
                                  <p className="text-[10px] text-gray-500 mt-2">JPEG, PNG, GIF or WebP. Max 5MB.</p>
                                  {uploadError && (
                                    <p className="text-[10px] text-red-400 mt-1">{uploadError}</p>
                                  )}
                                </div>
                             </div>
                        </div>
                    </div>
                    <div className="p-5 border-t border-white/5 flex justify-end gap-3 bg-black/20">
                        <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button onClick={handleSaveProfile} className="gap-2">
                            <Save size={18} />
                            Save Changes
                        </Button>
                    </div>
                </GlassCard>
             </div>
        </div>
      )}
    </div>
  );
};