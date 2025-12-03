import React, { useState, useRef, useEffect } from 'react';
import { Home, MessageCircle, PlusSquare, User as UserIcon, BarChart2, LogOut, Wallet, X, Feather, Image as ImageIcon, Loader, ChevronLeft, ChevronRight, BookOpen, Crown } from 'lucide-react';
import { User, ViewState } from './types';
import { BlockchainService } from './services';
import { FirebaseService } from './firebaseService';
import { Button, GlassCard } from './components/UIComponents';

// Views
import { FeedView } from './views/FeedView';
import { ChatView } from './views/ChatView';
import { ProfileView } from './views/ProfileView';
import { DashboardView } from './views/DashboardView';
import { PostDetailView } from './views/PostDetailView';
import { AdminView } from './views/AdminView';
import { BlogView } from './views/BlogView';
import { PremiumView } from './views/PremiumView';

// Guest Protection Component
const ConnectWalletPrompt: React.FC<{ onConnect: () => void, isConnecting?: boolean, title?: string, subtitle?: string }> = ({ onConnect, isConnecting = false, title = "Connect Wallet", subtitle = "You need to connect your wallet to access this feature." }) => (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
         <div className="relative group mb-8">
             <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
             <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl relative z-10">
               {isConnecting ? (
                 <Loader size={32} className="text-primary animate-spin" />
               ) : (
                 <Wallet size={32} className="text-gray-400 group-hover:text-primary transition-colors duration-500" />
               )}
             </div>
         </div>
         <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
         <p className="text-gray-400 max-w-sm mb-8">{subtitle}</p>
         <Button onClick={onConnect} disabled={isConnecting} size="lg" className="rounded-full px-8">
           {isConnecting ? 'Connecting...' : 'Connect Wallet'}
         </Button>
    </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.FEED);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewingProfileUser, setViewingProfileUser] = useState<User | null>(null);
  
  // Create Post State
  const [isCreating, setIsCreating] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mintingStatus, setMintingStatus] = useState<'idle' | 'uploading' | 'confirming' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Wallet Connection State
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Chat target for navigating from profile Message button
  const [chatTarget, setChatTarget] = useState<string | null>(null);
  
  // Post detail view
  const [viewingPostId, setViewingPostId] = useState<string | null>(null);

  // --- Auto-reconnect on page load ---
  useEffect(() => {
    const autoReconnect = async () => {
      const savedAddress = localStorage.getItem('walletAddress');
      if (savedAddress && window.ethereum) {
        try {
          // Use silent reconnect - no wallet popup
          const connectedUser = await BlockchainService.silentReconnect();
          
          if (connectedUser && connectedUser.address.toLowerCase() === savedAddress.toLowerCase()) {
            // Set user online status
            await FirebaseService.setUserOnline(connectedUser.address, true);
            
            try {
              const firebaseUser = await FirebaseService.getUserProfile(connectedUser.address);
              if (firebaseUser) {
                setUser({
                  ...connectedUser,
                  ...firebaseUser
                });
              } else {
                setUser(connectedUser);
              }
            } catch (firebaseError) {
              console.warn('Firebase unavailable, using wallet data only:', firebaseError);
              setUser(connectedUser);
            }
            
            console.log('✅ Auto-reconnected wallet successfully!');
          } else {
            // If silent reconnect failed or address mismatch, clear saved address
            localStorage.removeItem('walletAddress');
          }
        } catch (error) {
          console.warn('Auto-reconnect failed:', error);
          localStorage.removeItem('walletAddress');
        }
      }
    };

    autoReconnect();
  }, []);

  // --- Keep user online with heartbeat ---
  useEffect(() => {
    if (!user) return;

    // Update online status every 1 minute
    const heartbeat = setInterval(() => {
      FirebaseService.setUserOnline(user.address, true);
    }, 60 * 1000); // 1 minute

    // Mark offline when page closes/reloads
    const handleBeforeUnload = () => {
      FirebaseService.setUserOnline(user.address, false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  // --- Check for shared profile link in URL ---
  useEffect(() => {
    const loadSharedProfile = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const profileAddress = urlParams.get('profile');
      
      if (profileAddress) {
        console.log('🔗 Loading shared profile:', profileAddress);
        try {
          // Load the profile from Firebase
          const profileUser = await FirebaseService.getUserProfile(profileAddress);
          
          if (profileUser) {
            setViewingProfileUser(profileUser);
            setView(ViewState.PROFILE);
            console.log('✅ Shared profile loaded successfully');
          } else {
            // If profile doesn't exist in Firebase, create a basic one
            const basicProfile: User = {
              address: profileAddress,
              followers: 0,
              following: 0,
              totalPosts: 0,
              avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${profileAddress}&backgroundColor=1e2329`
            };
            setViewingProfileUser(basicProfile);
            setView(ViewState.PROFILE);
            console.log('✅ Shared profile loaded (basic profile)');
          }
        } catch (error) {
          console.error('Failed to load shared profile:', error);
        }
      }
    };

    loadSharedProfile();
  }, []);

  // --- Check for shared post link or special pages in URL ---
  useEffect(() => {
    const handleInitialRoute = () => {
      const pathname = window.location.pathname;
      const postMatch = pathname.match(/^\/post\/([^/]+)$/);
      const blogMatch = pathname.match(/^\/blogs?\/?(.*)$/);
      
      if (postMatch) {
        const postId = postMatch[1];
        console.log('🔗 Loading shared post:', postId);
        setViewingPostId(postId);
        setView(ViewState.POST_DETAIL);
      } else if (pathname === '/admin') {
        console.log('🔗 Loading admin panel');
        setView(ViewState.ADMIN);
      } else if (blogMatch || pathname === '/blogs') {
        console.log('🔗 Loading blog');
        setView(ViewState.BLOGS);
      }
    };

    handleInitialRoute();
  }, []);

  // --- Handle browser back/forward button ---
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname;
      const postMatch = pathname.match(/^\/post\/([^/]+)$/);
      
      if (postMatch) {
        const postId = postMatch[1];
        setViewingPostId(postId);
        setView(ViewState.POST_DETAIL);
      } else if (pathname === '/admin') {
        setView(ViewState.ADMIN);
      } else if (pathname === '/blogs' || pathname.startsWith('/blog')) {
        setView(ViewState.BLOGS);
      } else if (pathname === '/' || pathname === '') {
        setViewingPostId(null);
        setView(ViewState.FEED);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- Wallet Connection ---
  const handleConnect = async () => {
    if (isConnecting) return; // Prevent multiple simultaneous connection attempts
    
    setIsConnecting(true);
    setConnectionError(null); // Clear any previous errors
    
    // Clear any pending error timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    
    try {
      // Connect wallet (this handles MetaMask connection and network switching)
      const connectedUser = await BlockchainService.connectWallet();
      
      // Save wallet address to localStorage for auto-reconnect
      localStorage.setItem('walletAddress', connectedUser.address);
      
      // Set user online status
      await FirebaseService.setUserOnline(connectedUser.address, true);
      
      // Try to load user profile from Firebase to get additional data
      try {
        const firebaseUser = await FirebaseService.getUserProfile(connectedUser.address);
        if (firebaseUser) {
          // Merge blockchain data with Firebase data
          setUser({
            ...connectedUser,
            ...firebaseUser
          });
        } else {
          // If no profile exists in Firebase, just use the blockchain data
          setUser(connectedUser);
        }
      } catch (firebaseError) {
        // Firebase errors shouldn't block wallet connection
        console.warn('Firebase unavailable, using wallet data only:', firebaseError);
        setUser(connectedUser);
      }
      
      console.log('✅ Wallet connected successfully!');
    } catch (error: any) {
      // Handle wallet connection errors with detailed logging
      console.error('Wallet connection failed:', error);
      
      // Normalize error message to handle different error types
      let errorMessage = 'Failed to connect wallet. Please try again.';
      if (error && typeof error === 'object') {
        errorMessage = error.message || error.toString();
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Show error in UI
      setConnectionError(errorMessage);
      
      // Auto-dismiss error after 5 seconds (store timeout reference to prevent stacking)
      errorTimeoutRef.current = setTimeout(() => {
        setConnectionError(null);
        errorTimeoutRef.current = null;
      }, 5000);
    } finally {
      setIsConnecting(false);
    }
  };

  // --- Logout Handler ---
  const handleLogout = async () => {
    if (user) {
      // Set user offline before logging out
      await FirebaseService.setUserOnline(user.address, false);
    }
    setUser(null);
    setViewingProfileUser(null);
    localStorage.removeItem('walletAddress');
    setView(ViewState.FEED);
    console.log('✅ Logged out successfully');
  };

  // --- Navigation Handlers ---
  const handleNavigateToProfile = async (targetUser: User) => {
    // Fetch real user data from Firebase
    try {
      const firebaseUser = await FirebaseService.getUserProfile(targetUser.address);
      if (firebaseUser) {
        // Merge blockchain data with Firebase data
        setViewingProfileUser({
          ...targetUser,
          ...firebaseUser
        });
      } else {
        // If no Firebase profile exists, use the basic user data
        setViewingProfileUser(targetUser);
      }
    } catch (error) {
      console.error('Failed to load user profile from Firebase:', error);
      // Fallback to basic user data
      setViewingProfileUser(targetUser);
    }
    setView(ViewState.PROFILE);
  };

  const handleNavigateToChat = (targetAddress?: string) => {
    if (targetAddress) {
      setChatTarget(targetAddress);
    }
    setView(ViewState.CHAT);
  };

  const handleNavigateToPost = (postId: string) => {
    setViewingPostId(postId);
    setView(ViewState.POST_DETAIL);
    window.history.pushState({}, '', `/post/${postId}`);
  };

  const handleUpdateProfile = async (updatedFields: Partial<User>) => {
      if (user) {
          // Save to Firebase
          try {
            await FirebaseService.updateUserProfile(user.address, updatedFields);
            console.log('✅ Profile updated successfully');
            
            // Reload from Firebase to get canonical data
            const firebaseUser = await FirebaseService.getUserProfile(user.address);
            if (firebaseUser) {
              const updatedUser = { ...user, ...firebaseUser };
              setUser(updatedUser);
              
              // If we are viewing our own profile, update that view as well
              if (viewingProfileUser && viewingProfileUser.address === user.address) {
                  setViewingProfileUser(updatedUser);
              }
            }
          } catch (error) {
            console.error('Failed to update profile:', error);
            alert('Failed to save profile changes. Please try again.');
            return;
          }
      }
  };

  const handleRefreshProfile = async () => {
    const targetUser = viewingProfileUser || user;
    if (!targetUser) return;

    try {
      const firebaseUser = await FirebaseService.getUserProfile(targetUser.address);
      if (firebaseUser) {
        // Update the viewing profile user
        setViewingProfileUser(firebaseUser);
        
        // If this is the current user's profile, update that too
        if (user && user.address === targetUser.address) {
          setUser(firebaseUser);
        }
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  };

  // --- Image Handling ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Create Post Logic ---
  const handleCreatePost = async () => {
    if (!postContent && !selectedImage) return;
    
    try {
      // Step 1: Upload to IPFS (Simulated)
      setMintingStatus('uploading');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 2: Blockchain Confirmation
      setMintingStatus('confirming');
      await BlockchainService.mintPost(postContent, selectedImage || undefined);
      
      // Step 3: Success
      setMintingStatus('success');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reset
      setMintingStatus('idle');
      setPostContent("");
      removeImage();
      setIsCreating(false);
      setView(ViewState.FEED);
    } catch (error: any) {
      // Handle errors gracefully
      console.error('Minting error:', error);
      setMintingStatus('error');
      
      // Show error for 5 seconds then reset
      setTimeout(() => {
        setMintingStatus('idle');
      }, 5000);
      
      // Display error to user
      alert(error.message || 'Failed to mint post. Please try again.');
    }
  };

  // --- Render View Switcher ---
  const renderContent = () => {
    switch (view) {
      case ViewState.FEED: 
        return <FeedView type="global" onUserClick={handleNavigateToProfile} onPostClick={handleNavigateToPost} currentUser={user || undefined} />;
      
      case ViewState.CHAT: 
        if (!user) return <ConnectWalletPrompt onConnect={handleConnect} isConnecting={isConnecting} title="Encrypted Messaging" subtitle="Connect your wallet to access your secure, end-to-end encrypted messages." />;
        return <ChatView 
          currentUser={user} 
          onUserClick={handleNavigateToProfile} 
          initialChatTarget={chatTarget || undefined}
          onClearChatTarget={() => setChatTarget(null)}
        />;
      
      case ViewState.PROFILE: 
        // Determine which profile to show:
        // 1. The specific user we clicked on (viewingProfileUser)
        // 2. OR the current logged-in user (user)
        const targetUser = viewingProfileUser || user;

        // If neither exists, it means a guest is trying to view "My Profile". Block it.
        if (!targetUser) {
           return <ConnectWalletPrompt onConnect={handleConnect} isConnecting={isConnecting} title="Your Profile" subtitle="Connect your wallet to view your decentralized identity." />;
        }

        return (
          <ProfileView 
            user={targetUser} 
            currentUser={user || undefined}
            onNavigateToChat={handleNavigateToChat}
            onUpdateProfile={handleUpdateProfile} 
            onConnect={handleConnect}
            isConnecting={isConnecting}
            onRefreshProfile={handleRefreshProfile}
          />
        );
      
      case ViewState.DASHBOARD: 
        if (!user) return <ConnectWalletPrompt onConnect={handleConnect} isConnecting={isConnecting} title="Analytics Dashboard" subtitle="Connect your wallet to view your on-chain performance metrics." />;
        return <DashboardView user={user} />;
      
      case ViewState.POST_DETAIL:
        if (!viewingPostId) {
          return <FeedView type="global" onUserClick={handleNavigateToProfile} onPostClick={handleNavigateToPost} currentUser={user || undefined} />;
        }
        return (
          <PostDetailView 
            postId={viewingPostId}
            currentUser={user || undefined}
            onBack={() => {
              setViewingPostId(null);
              setView(ViewState.FEED);
              window.history.pushState({}, '', '/');
            }}
            onUserClick={handleNavigateToProfile}
          />
        );
      
      case ViewState.ADMIN:
        return (
          <AdminView
            onBack={() => {
              setView(ViewState.FEED);
              window.history.pushState({}, '', '/');
            }}
          />
        );
      
      case ViewState.BLOGS:
        return (
          <BlogView
            onBack={() => {
              setView(ViewState.FEED);
              window.history.pushState({}, '', '/');
            }}
          />
        );
      
      case ViewState.PREMIUM:
        return (
          <PremiumView
            onBack={() => {
              setView(ViewState.FEED);
              window.history.pushState({}, '', '/');
            }}
          />
        );
      
      default: 
        return <FeedView type="global" onUserClick={handleNavigateToProfile} onPostClick={handleNavigateToPost} currentUser={user || undefined} />;
    }
  };

  // --- Navigation Item ---
  const NavItem: React.FC<{ icon: React.ReactNode; label: string; target: ViewState; active: boolean; onClick?: () => void }> = ({ icon, label, target, active, onClick }) => (
    <button 
      onClick={() => {
        if (onClick) onClick();
        else setView(target);
      }}
      title={isSidebarCollapsed ? label : undefined}
      className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-5 gap-4'} py-3.5 rounded-2xl transition-all duration-300 w-full group relative overflow-hidden ${
        active ? 'bg-white/10 text-white font-bold shadow-lg border border-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
      }`}
    >
      <div className={`transition-transform duration-300 flex-shrink-0 ${active ? 'scale-110 text-primary' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
      <span className={`transition-all duration-300 whitespace-nowrap ${isSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto block'} text-sm tracking-wide`}>
        {label}
      </span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0B0E11] text-foreground font-sans selection:bg-primary/30 selection:text-white overflow-x-hidden pb-24 md:pb-0">
      {/* Global Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-[20%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-[10%] w-[500px] h-[500px] bg-blue-900/5 rounded-full blur-[150px]" />
      </div>

      {/* Desktop Sidebar (Always visible now) */}
      <aside className={`hidden md:flex fixed top-0 left-0 h-screen flex-col border-r border-white/5 bg-black/20 backdrop-blur-xl z-40 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
        
        {/* Sidebar Header */}
        <div className={`p-6 flex items-center relative ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start'}`}>
          <div className="flex items-center gap-3 text-white">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20 shrink-0 z-10 relative">
                <Feather size={18} className="text-black" />
              </div>
              <h1 className={`text-2xl font-bold tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                BSN
              </h1>
          </div>

          {/* Toggle Button */}
          <button 
            onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-8 w-6 h-6 bg-[#0B0E11] border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-all shadow-lg z-50"
          >
            {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
        
        <nav className="flex-1 px-3 space-y-2 mt-4">
          <NavItem icon={<Home size={20} />} label="Home" target={ViewState.FEED} active={view === ViewState.FEED} />
          <NavItem icon={<MessageCircle size={20} />} label="Messages" target={ViewState.CHAT} active={view === ViewState.CHAT} />
          <NavItem 
            icon={<UserIcon size={20} />} 
            label="Profile" 
            target={ViewState.PROFILE} 
            active={view === ViewState.PROFILE && (viewingProfileUser?.address === user?.address || (!viewingProfileUser && !user))} 
            onClick={() => {
              // When clicking "Profile" in nav, load real data from Firebase
              if (user) {
                handleNavigateToProfile(user);
              } else {
                setViewingProfileUser(null);
                setView(ViewState.PROFILE);
              }
            }}
          />
          <NavItem icon={<BarChart2 size={20} />} label="Analytics" target={ViewState.DASHBOARD} active={view === ViewState.DASHBOARD} />
          <NavItem 
            icon={<BookOpen size={20} />} 
            label="Blog" 
            target={ViewState.BLOGS} 
            active={view === ViewState.BLOGS}
            onClick={() => {
              setView(ViewState.BLOGS);
              window.history.pushState({}, '', '/blog');
            }}
          />
          <NavItem 
            icon={<Crown size={20} />} 
            label="Premium" 
            target={ViewState.PREMIUM} 
            active={view === ViewState.PREMIUM}
            onClick={() => {
              setView(ViewState.PREMIUM);
              window.history.pushState({}, '', '/premium');
            }}
          />
        </nav>

        <div className="p-4 mt-auto">
          <Button 
            onClick={() => user ? setIsCreating(true) : handleConnect()} 
            size={isSidebarCollapsed ? 'sm' : 'lg'} 
            disabled={isConnecting}
            className={`w-full mb-6 shadow-xl shadow-primary/10 transition-all duration-300 ${isSidebarCollapsed ? 'px-0 aspect-square flex items-center justify-center rounded-2xl' : ''}`}
            title="Create Post"
          >
            {user ? <PlusSquare size={20} /> : (isConnecting ? <Loader size={20} className="animate-spin" /> : <Wallet size={20} />)}
            <span className={`${isSidebarCollapsed ? 'hidden' : 'ml-2'}`}>{user ? 'Post' : (isConnecting ? 'Connecting...' : 'Connect')}</span>
          </Button>
          
          {user && (
            <div 
              onClick={handleLogout}
              className={`flex items-center gap-3 p-2 rounded-2xl bg-white/5 border border-white/5 hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer overflow-hidden ${isSidebarCollapsed ? 'justify-center bg-transparent border-transparent hover:bg-red-500/10' : ''}`}
              title="Disconnect"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-yellow-200 shrink-0 shadow-md" />
              
              <div className={`overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                <p className="text-sm font-bold text-white truncate">{user.ens || "0xUser"}</p>
                <p className="text-xs text-gray-500 font-mono truncate">{user.address.substring(0, 10)}...</p>
              </div>
              
              <LogOut size={16} className={`text-gray-500 hover:text-red-400 ml-auto transition-all duration-300 ${isSidebarCollapsed ? 'w-0 opacity-0 hidden' : 'opacity-100'}`} />
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Nav - Floating Pill */}
      <div className="md:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[94%] max-w-md z-50 safe-area-pb">
        <div className="bg-gray-900/90 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl flex items-center p-1 px-1.5 relative">
            {/* Left group */}
            <div className="flex items-center gap-0.5">
              <button onClick={() => setView(ViewState.FEED)} className={`p-2.5 rounded-full transition-colors ${view === ViewState.FEED ? 'text-primary bg-white/10' : 'text-gray-500'}`}><Home size={22} /></button>
              <button onClick={() => setView(ViewState.CHAT)} className={`p-2.5 rounded-full transition-colors ${view === ViewState.CHAT ? 'text-primary bg-white/10' : 'text-gray-500'}`}><MessageCircle size={22} /></button>
              <button onClick={() => { setView(ViewState.BLOGS); window.history.pushState({}, '', '/blog'); }} className={`p-2.5 rounded-full transition-colors ${view === ViewState.BLOGS ? 'text-primary bg-white/10' : 'text-gray-500'}`}><BookOpen size={22} /></button>
            </div>
            
            {/* Center floating button */}
            <div className="flex-1 flex justify-center">
              <button onClick={() => user ? setIsCreating(true) : handleConnect()} disabled={isConnecting} className="p-3 rounded-full bg-primary text-black shadow-lg shadow-primary/30 transform -translate-y-5 border-4 border-[#0B0E11] disabled:opacity-50">{user ? <PlusSquare size={26} /> : (isConnecting ? <Loader size={22} className="animate-spin" /> : <Wallet size={22} />)}</button>
            </div>
            
            {/* Right group */}
            <div className="flex items-center gap-0.5">
              <button onClick={() => { if (user) { handleNavigateToProfile(user); } else { setViewingProfileUser(null); setView(ViewState.PROFILE); } }} className={`p-2.5 rounded-full transition-colors ${view === ViewState.PROFILE ? 'text-primary bg-white/10' : 'text-gray-500'}`}><UserIcon size={22} /></button>
              <button onClick={() => setView(ViewState.DASHBOARD)} className={`p-2.5 rounded-full transition-colors ${view === ViewState.DASHBOARD ? 'text-primary bg-white/10' : 'text-gray-500'}`}><BarChart2 size={22} /></button>
              <button onClick={() => { setView(ViewState.PREMIUM); window.history.pushState({}, '', '/premium'); }} className={`p-2.5 rounded-full transition-colors ${view === ViewState.PREMIUM ? 'text-primary bg-white/10' : 'text-gray-500'}`}><Crown size={22} /></button>
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className={`relative z-10 transition-all duration-300 ease-in-out min-h-screen ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-72'}`}>
        {renderContent()}
      </main>

      {/* Create Post Modal - Responsive */}
      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <GlassCard className="w-full h-[90vh] md:h-auto md:max-w-lg p-0 overflow-hidden rounded-t-[2.5rem] md:rounded-3xl flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">New Post</h2>
              <button onClick={() => setIsCreating(false)} className="p-2 bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors">
                  <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                <div className="flex gap-4 mb-4">
                   <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 shrink-0" />
                   <textarea 
                      className="w-full bg-transparent border-none text-white resize-none focus:ring-0 text-lg placeholder-gray-600 min-h-[120px]"
                      placeholder="What's happening on-chain?"
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      maxLength={280}
                      autoFocus
                    />
                </div>

                {imagePreview && (
                  <div className="relative rounded-2xl overflow-hidden mb-6 border border-white/10 group">
                    <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-cover" />
                    <button 
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500/80 text-white rounded-full backdrop-blur-md transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                
                {mintingStatus !== 'idle' && (
                  <div className="mb-auto mt-2 bg-blue-500/10 text-blue-400 text-sm p-4 rounded-2xl border border-blue-500/20 flex items-center gap-3">
                    {mintingStatus === 'uploading' && (
                      <>
                        <Loader size={18} className="animate-spin" />
                        <span>Uploading assets to IPFS...</span>
                      </>
                    )}
                    {mintingStatus === 'confirming' && (
                      <>
                        <Loader size={18} className="animate-spin" />
                        <span>Waiting for blockchain confirmation...</span>
                      </>
                    )}
                    {mintingStatus === 'success' && (
                      <>
                        <Feather size={18} className="text-green-400" />
                        <span className="text-green-400 font-bold">Successfully Minted!</span>
                      </>
                    )}
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-auto md:mt-0">
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleImageSelect} 
                      className="hidden" 
                      accept="image/*"
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 text-primary hover:bg-primary/10 rounded-full transition-colors"
                    >
                      <ImageIcon size={22} />
                    </button>
                    <span className="text-xs text-gray-500">
                        {280 - postContent.length} / 280
                    </span>
                  </div>

                  <Button 
                    disabled={(!postContent && !selectedImage) || mintingStatus !== 'idle'} 
                    onClick={handleCreatePost} 
                    className="rounded-full px-8 py-3"
                    size="md"
                  >
                    {mintingStatus === 'idle' ? 'Mint Post' : 'Processing...'}
                  </Button>
                </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Connection Error Toast */}
      {connectionError && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 transform -translate-x-1/2 z-[150] animate-in slide-in-from-bottom duration-300">
          <div className="bg-red-500/90 backdrop-blur-xl text-white px-6 py-4 rounded-2xl shadow-2xl border border-red-400/30 flex items-center gap-3 max-w-md">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <p className="text-sm font-medium">{connectionError}</p>
            <button 
              onClick={() => {
                setConnectionError(null);
                if (errorTimeoutRef.current) {
                  clearTimeout(errorTimeoutRef.current);
                  errorTimeoutRef.current = null;
                }
              }}
              className="ml-auto p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;