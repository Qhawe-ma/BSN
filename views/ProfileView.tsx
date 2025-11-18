import React, { useState } from 'react';
import { Copy, Check, MapPin, Link as LinkIcon, Grid, Calendar, MessageSquare, UserPlus, Settings, X, Save, Wallet } from 'lucide-react';
import { User } from '../types';
import { GlassCard, Avatar, Button, Badge, Input } from '../components/UIComponents';

interface ProfileViewProps {
    user: User;
    currentUser?: User;
    onNavigateToChat?: () => void;
    onUpdateProfile?: (updatedUser: Partial<User>) => void;
    onConnect?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, currentUser, onNavigateToChat, onUpdateProfile, onConnect }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Determine if we are viewing our own profile (requires currentUser to exist)
  const isOwnProfile = currentUser?.address === user.address;

  // Edit State
  const [editEns, setEditEns] = useState(user.ens || "");
  const [editBio, setEditBio] = useState(user.bio || "");
  const [editAvatar, setEditAvatar] = useState(user.avatarUrl);

  const copyAddress = () => {
    navigator.clipboard.writeText(user.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProfile = () => {
      if (onUpdateProfile) {
          onUpdateProfile({
              ens: editEns,
              bio: editBio,
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
        <div className="h-48 bg-gradient-to-r from-blue-900/40 via-purple-900/40 to-gray-900/40 w-full relative">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-900/80 to-transparent"></div>
        </div>
        
        <div className="px-8 pb-8">
          <div className="flex flex-col md:flex-row justify-between items-end -mt-16 mb-6 gap-4">
            <div className="relative">
                <div className="p-2 bg-[#0F1115] rounded-full inline-block shadow-xl">
                   <Avatar url={user.avatarUrl} size="xl" />
                </div>
                <div className="absolute bottom-3 right-3 w-5 h-5 bg-green-500 border-4 border-[#0F1115] rounded-full"></div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 mb-2">
               {currentUser ? (
                 isOwnProfile ? (
                   <>
                      <Button variant="secondary" size="sm">Share Profile</Button>
                      <Button onClick={() => setIsEditing(true)} size="sm" className="gap-2">
                          <Settings size={16} />
                          Edit Profile
                      </Button>
                   </>
                 ) : (
                   <>
                      <Button variant="secondary" size="sm" className="gap-2 group hover:border-primary/50 hover:text-primary transition-all">
                          <UserPlus size={18} className="text-gray-400 group-hover:text-primary transition-colors" />
                          Follow
                      </Button>
                      <Button 
                          size="sm" 
                          className="gap-2"
                          onClick={onNavigateToChat}
                      >
                          <MessageSquare size={16} />
                          Message
                      </Button>
                   </>
                 )
               ) : (
                  <Button 
                    onClick={onConnect}
                    variant="secondary" 
                    size="sm" 
                    className="gap-2 hover:border-white/30 hover:bg-white/10 transition-all"
                  >
                      <Wallet size={16} />
                      Connect to interact
                  </Button>
               )}
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2 tracking-tight">
                {user.ens || "Unnamed User"}
                <Badge color="bg-blue-500" variant="solid">Beta</Badge>
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
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-500" />
                  <span>BSC Mainnet</span>
                </div>
                <div className="flex items-center gap-2">
                   <Calendar size={16} className="text-gray-500" />
                   <span>Joined Sept 2023</span>
                </div>
                <div className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer group">
                   <LinkIcon size={16} className="text-gray-500 group-hover:text-primary" />
                   <a href="#" className="border-b border-transparent group-hover:border-primary/30">display.opensea.io</a>
                </div>
              </div>

              {/* Simple Stats Row */}
              <div className="flex gap-10 py-5 border-t border-white/5">
                <div className="cursor-pointer group">
                   <span className="font-bold text-white text-xl block group-hover:text-primary transition-colors">{user.totalPosts}</span>
                   <span className="text-xs text-gray-500 uppercase tracking-wide font-bold">Posts</span>
                </div>
                <div className="cursor-pointer group">
                   <span className="font-bold text-white text-xl block group-hover:text-primary transition-colors">{user.followers}</span>
                   <span className="text-xs text-gray-500 uppercase tracking-wide font-bold">Followers</span>
                </div>
                <div className="cursor-pointer group">
                   <span className="font-bold text-white text-xl block group-hover:text-primary transition-colors">{user.following}</span>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         {[1,2,3,4,5,6].map(i => (
             <GlassCard key={i} className="aspect-square relative group cursor-pointer border-0 bg-gray-800/50 hover:bg-gray-800 transition-colors" hoverEffect>
                 {/* Placeholder Abstract Art */}
                 <div className={`absolute inset-0 opacity-40 bg-gradient-to-br ${i % 2 === 0 ? 'from-blue-500/20 to-purple-500/20' : 'from-primary/10 to-red-500/20'}`}></div>
                 
                 <div className="absolute inset-0 flex flex-col justify-end p-5 opacity-90">
                     <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                         <p className="text-white font-bold truncate">Minted Post #{1000 + i}</p>
                         <div className="flex justify-between items-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                            <span className="text-xs text-gray-400 font-mono">ID: {4092 + i}</span>
                            <Badge variant="outline" color="bg-white">BEP-20</Badge>
                         </div>
                     </div>
                 </div>
             </GlassCard>
         ))}
      </div>

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
                             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Avatar URL</label>
                             <Input 
                                value={editAvatar}
                                onChange={(e) => setEditAvatar(e.target.value)}
                             />
                             <div className="flex items-center gap-3 mt-2 p-2 bg-white/5 rounded-lg">
                                <Avatar url={editAvatar} size="sm" />
                                <span className="text-xs text-gray-400">Preview</span>
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