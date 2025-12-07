import React, { useState, useRef, useEffect } from 'react';
import { Home, MessageCircle, PlusSquare, User as UserIcon, BarChart2, LogOut, Wallet, X, Feather, Image as ImageIcon, Loader, ChevronLeft, ChevronRight, BookOpen, Crown } from 'lucide-react';
import { User, ViewState } from './types';
import { BlockchainService, DataService, OptimisticPostService } from './services';
import { FirebaseService } from './firebaseService';
import { Button, GlassCard, Avatar } from './components/UIComponents';

// Views - eagerly loaded for instant navigation
import { FeedView } from './views/FeedView';
import { ChatView } from './views/ChatView';
import { ProfileView } from './views/ProfileView';
import { DashboardView } from './views/DashboardView';
import { PostDetailView } from './views/PostDetailView';
import { AdminView } from './views/AdminView';
import { BlogView } from './views/BlogView';
import { PremiumView } from './views/PremiumView';
import { LandingPage } from './views/LandingPage';

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
  const [showLanding, setShowLanding] = useState(() => {
    const pathname = window.location.pathname;
    // Skip landing page for direct links to posts, admin, or blog
    if (pathname.startsWith('/post/') || pathname === '/admin' || pathname.startsWith('/blog')) {
      return false;
    }
    // Check if user has already passed landing page this session
    const hasPassedLanding = sessionStorage.getItem('bsn_passed_landing');
    if (hasPassedLanding === 'true') {
      return false;
    }
    // Always show landing page on root URL for new sessions
    return pathname === '/' || pathname === '';
  });
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>(() => {
    // Restore last view from sessionStorage
    const savedView = sessionStorage.getItem('bsn_current_view');
    if (savedView && Object.values(ViewState).includes(savedView as ViewState)) {
      return savedView as ViewState;
    }
    return ViewState.FEED;
  });
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
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
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

  // --- Preload feed data in background for instant loading ---
  useEffect(() => {
    DataService.getFeedProgressive(false);
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
  const handleConnect = () => {
    setShowWalletModal(true);
  };

  const handleSelectWallet = async (walletType: string) => {
    if (isConnecting) return;
    
    setSelectedWallet(walletType);
    setIsConnecting(true);
    setConnectionError(null);
    
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    
    try {
      const connectedUser = await BlockchainService.connectWallet();
      
      localStorage.setItem('walletAddress', connectedUser.address);
      await FirebaseService.setUserOnline(connectedUser.address, true);
      
      try {
        const firebaseUser = await FirebaseService.getUserProfile(connectedUser.address);
        if (firebaseUser) {
          setUser({ ...connectedUser, ...firebaseUser });
        } else {
          setUser(connectedUser);
        }
      } catch (firebaseError) {
        console.warn('Firebase unavailable, using wallet data only:', firebaseError);
        setUser(connectedUser);
      }
      
      console.log('✅ Wallet connected successfully!');
      setShowWalletModal(false);
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      
      let errorMessage = 'Failed to connect wallet. Please try again.';
      if (error && typeof error === 'object') {
        errorMessage = error.message || error.toString();
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      setConnectionError(errorMessage);
      
      errorTimeoutRef.current = setTimeout(() => {
        setConnectionError(null);
        errorTimeoutRef.current = null;
      }, 5000);
    } finally {
      setIsConnecting(false);
      setSelectedWallet(null);
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

  // --- Create Post Logic with Optimistic Updates (Like X.com - Instant Display) ---
  const handleCreatePost = async () => {
    if (!postContent && !selectedImage) return;
    if (!user) {
      alert('Please connect your wallet first');
      return;
    }
    
    // Step 1: Create optimistic post and show IMMEDIATELY (X.com style)
    const optimisticPost = OptimisticPostService.createOptimisticPost(
      postContent,
      user,
      undefined,
      imagePreview || undefined
    );
    
    // Add to feed instantly - user sees their post right away!
    OptimisticPostService.addOptimisticPost(optimisticPost);
    
    // Close modal and navigate to feed immediately
    const savedContent = postContent;
    const savedImage = selectedImage;
    setPostContent("");
    removeImage();
    setIsCreating(false);
    setView(ViewState.FEED);
    
    // Step 2: Update status to show "uploading" indicator on the post
    setMintingStatus('uploading');
    OptimisticPostService.updateOptimisticPost(optimisticPost.optimisticId!, {
      optimisticStatus: 'pending'
    });
    
    try {
      // Step 3: Mint on blockchain in background (user can browse while this happens)
      OptimisticPostService.updateOptimisticPost(optimisticPost.optimisticId!, {
        optimisticStatus: 'confirming'
      });
      
      const confirmedPost = await BlockchainService.mintPost(savedContent, savedImage || undefined);
      
      // Step 4: Replace optimistic post with real confirmed post
      OptimisticPostService.confirmOptimisticPost(optimisticPost.optimisticId!, confirmedPost);
      
      setMintingStatus('success');
      console.log('🎉 Post confirmed on blockchain!');
      
      // Reset status after brief success indicator
      setTimeout(() => {
        setMintingStatus('idle');
      }, 2000);
      
    } catch (error: any) {
      // Handle error - remove the optimistic post
      console.error('Minting error:', error);
      
      // Remove the optimistic post from feed
      OptimisticPostService.removeOptimisticPost(optimisticPost.optimisticId!);
      
      setMintingStatus('error');
      
      // Show error notification to user
      setTimeout(() => {
        setMintingStatus('idle');
      }, 5000);
      
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
            onPostClick={handleNavigateToPost}
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
            userAddress={user?.address}
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
      className={`flex items-center ${isSidebarCollapsed ? 'justify-center w-12 h-12 mx-auto px-0' : 'px-5 gap-4 w-full'} py-3 rounded-2xl transition-all duration-300 group relative ${
        active ? 'bg-white/10 text-white font-bold shadow-lg border border-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
      }`}
    >
      <div className={`transition-transform duration-300 flex-shrink-0 ${active ? 'scale-110 text-primary' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
      {!isSidebarCollapsed && (
        <span className="text-sm tracking-wide whitespace-nowrap">
          {label}
        </span>
      )}
    </button>
  );

  const handleLaunchApp = () => {
    setShowLanding(false);
    sessionStorage.setItem('bsn_passed_landing', 'true');
  };

  // Save current view to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem('bsn_current_view', view);
  }, [view]);

  if (showLanding) {
    return <LandingPage onLaunchApp={handleLaunchApp} />;
  }

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
          <button 
            onClick={() => setShowLanding(true)} 
            className="flex items-center text-white hover:opacity-80 transition-opacity cursor-pointer"
            title="Back to Landing Page"
          >
              <div className={`relative flex items-center justify-center transition-all duration-300 ${isSidebarCollapsed ? 'w-10 h-10' : 'h-14 w-auto'}`}>
                <img 
                  src="/check/logoo.svg" 
                  alt="BSN" 
                  className={`h-14 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'opacity-0 scale-0 absolute pointer-events-none' : 'opacity-100 scale-100'}`}
                />
                <img 
                  src="/check/iconnns.svg" 
                  alt="BSN" 
                  className={`h-10 w-10 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-0 absolute pointer-events-none'}`}
                />
              </div>
          </button>

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
              <Avatar url={user.avatarUrl || ''} size="sm" address={user.address} bordered={false} />
              
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
                   <Avatar url={user?.avatarUrl || ''} size="md" address={user?.address} />
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

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md relative">
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-3xl blur-xl opacity-60"></div>
            
            <div className="relative bg-[#12141a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <h3 className="text-xl font-bold text-white">Connect Wallet</h3>
                <button 
                  onClick={() => setShowWalletModal(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Wallet Options */}
              <div className="p-4 space-y-2">
                {/* MetaMask */}
                <button
                  onClick={() => handleSelectWallet('metamask')}
                  disabled={isConnecting}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
                    selectedWallet === 'metamask' 
                      ? 'bg-primary/10 border-primary/50' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  } ${isConnecting && selectedWallet !== 'metamask' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-[#f6851b]/10 flex items-center justify-center">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" className="w-8 h-8" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-white font-semibold">MetaMask</span>
                    <p className="text-xs text-gray-500">Connect using browser extension</p>
                  </div>
                  {isConnecting && selectedWallet === 'metamask' && (
                    <Loader size={20} className="text-primary animate-spin" />
                  )}
                </button>

                {/* Trust Wallet */}
                <button
                  onClick={() => handleSelectWallet('trust')}
                  disabled={isConnecting}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
                    selectedWallet === 'trust' 
                      ? 'bg-primary/10 border-primary/50' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  } ${isConnecting && selectedWallet !== 'trust' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-[#3375BB]/10 flex items-center justify-center">
                    <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
                      <path d="M20 4L6 10v12c0 9.627 6.4 15.333 14 18 7.6-2.667 14-8.373 14-18V10L20 4z" fill="#3375BB"/>
                      <path d="M20 8l-10 4.5v9c0 7.22 4.8 11.5 10.5 13.5 5.7-2 10.5-6.28 10.5-13.5v-9L20 8z" fill="white"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-white font-semibold">Trust Wallet</span>
                    <p className="text-xs text-gray-500">Connect using Trust Wallet</p>
                  </div>
                  {isConnecting && selectedWallet === 'trust' && (
                    <Loader size={20} className="text-primary animate-spin" />
                  )}
                </button>

                {/* Coinbase Wallet */}
                <button
                  onClick={() => handleSelectWallet('coinbase')}
                  disabled={isConnecting}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
                    selectedWallet === 'coinbase' 
                      ? 'bg-primary/10 border-primary/50' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  } ${isConnecting && selectedWallet !== 'coinbase' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-[#0052FF]/10 flex items-center justify-center">
                    <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
                      <circle cx="20" cy="20" r="16" fill="#0052FF"/>
                      <path d="M20 8c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12S26.627 8 20 8zm-2.4 7.2h4.8c.663 0 1.2.537 1.2 1.2v7.2c0 .663-.537 1.2-1.2 1.2h-4.8c-.663 0-1.2-.537-1.2-1.2v-7.2c0-.663.537-1.2 1.2-1.2z" fill="white"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-white font-semibold">Coinbase Wallet</span>
                    <p className="text-xs text-gray-500">Connect using Coinbase Wallet</p>
                  </div>
                  {isConnecting && selectedWallet === 'coinbase' && (
                    <Loader size={20} className="text-primary animate-spin" />
                  )}
                </button>

                {/* WalletConnect */}
                <button
                  onClick={() => handleSelectWallet('walletconnect')}
                  disabled={isConnecting}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
                    selectedWallet === 'walletconnect' 
                      ? 'bg-primary/10 border-primary/50' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  } ${isConnecting && selectedWallet !== 'walletconnect' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-[#3B99FC]/10 flex items-center justify-center">
                    <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
                      <path d="M11.4 15.4c4.7-4.7 12.5-4.7 17.2 0l.6.6c.2.2.2.6 0 .9l-2 2c-.1.1-.3.1-.4 0l-.8-.8c-3.3-3.3-8.7-3.3-12 0l-.9.9c-.1.1-.3.1-.4 0l-2-2c-.2-.2-.2-.6 0-.9l.7-.7zm21.3 4l1.8 1.8c.2.2.2.6 0 .9l-8.1 8.1c-.2.2-.6.2-.9 0l-5.7-5.7c-.1-.1-.2-.1-.2 0l-5.7 5.7c-.2.2-.6.2-.9 0l-8.1-8.1c-.2-.2-.2-.6 0-.9l1.8-1.8c.2-.2.6-.2.9 0l5.7 5.7c.1.1.2.1.2 0l5.7-5.7c.2-.2.6-.2.9 0l5.7 5.7c.1.1.2.1.2 0l5.7-5.7c.3-.2.7-.2.9 0z" fill="#3B99FC"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-white font-semibold">WalletConnect</span>
                    <p className="text-xs text-gray-500">Scan with mobile wallet</p>
                  </div>
                  {isConnecting && selectedWallet === 'walletconnect' && (
                    <Loader size={20} className="text-primary animate-spin" />
                  )}
                </button>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 pt-2">
                <p className="text-center text-xs text-gray-500">
                  By connecting, you agree to our{' '}
                  <span className="text-primary hover:underline cursor-pointer">Terms of Service</span>
                  {' '}and{' '}
                  <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>
                </p>
              </div>

              {/* Error Display */}
              {connectionError && (
                <div className="mx-4 mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-sm text-red-400 text-center">{connectionError}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connection Error Toast */}
      {connectionError && !showWalletModal && (
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