import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, MessageSquare, MoreVertical, Plus, Search, PanelLeftClose, PanelLeftOpen, X, ShieldCheck, CheckCheck, Check, Lock, UserPlus, Loader } from 'lucide-react';
import { Message, ChatSession, User } from '../types';
import { DataService, formatAddress } from '../services';
import { FirebaseService } from '../firebaseService';
import { GlassCard, Avatar, Button, Input } from '../components/UIComponents';
import { BadgeIcon } from '../components/BadgeIcon';

interface ChatViewProps {
  currentUser?: User;
  onUserClick: (user: User) => void;
  initialChatTarget?: string;
  onClearChatTarget?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ currentUser, onUserClick, initialChatTarget, onClearChatTarget }) => {
  // State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatAddress, setNewChatAddress] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  
  // Refs & Responsive
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  // Effects
  useEffect(() => {
    const handleResize = () => {
        const mobile = window.innerWidth < 768;
        setIsMobileView(mobile);
        if (mobile) setIsSidebarOpen(true); // Reset sidebar on mobile
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = DataService.subscribeToChats(currentUser.address, (chats) => {
      // Merge Firebase chats with local sessions (preserve locally created ones)
      setSessions(prev => {
        const firebaseChatIds = new Set(chats.map(c => c.id));
        // Keep local sessions that aren't in Firebase yet
        const localOnlySessions = prev.filter(s => !firebaseChatIds.has(s.id));
        // Combine: Firebase chats + local-only sessions
        return [...chats, ...localOnlySessions];
      });
      
      // Subscribe to online status for all chat participants
      chats.forEach(chat => {
        FirebaseService.subscribeToUserPresence(chat.participant.address, (isOnline) => {
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            if (isOnline) {
              newSet.add(chat.participant.address);
            } else {
              newSet.delete(chat.participant.address);
            }
            return newSet;
          });
        });
      });
    });
    
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!activeSessionId || !currentUser) {
      setMessages([]);
      setIsOtherUserOnline(false);
      return;
    }
    
    const [user1, user2] = activeSessionId.split('_');
    const otherUserId = user1 === currentUser.address ? user2 : user1;
    
    // Subscribe to messages
    const unsubscribe = DataService.subscribeToMessages(
      currentUser.address,
      otherUserId,
      (messages) => {
        setMessages(messages);
      }
    );
    
    // Mark messages as read when opening chat
    FirebaseService.markAsRead(currentUser.address, otherUserId);
    
    // Subscribe to other user's online status
    const unsubscribePresence = FirebaseService.subscribeToUserPresence(
      otherUserId,
      (isOnline) => {
        setIsOtherUserOnline(isOnline);
      }
    );
    
    return () => {
      unsubscribe();
      unsubscribePresence();
    };
  }, [activeSessionId, currentUser]);

  // Smart Auto-scrolling
  useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeSessionId]);

  // Handle initial chat target (from profile Message button)
  useEffect(() => {
    if (!initialChatTarget || !currentUser) return;
    
    const openOrCreateChat = async () => {
      try {
        // Check if session already exists
        const existingSession = sessions.find(s => 
          s.participant.address.toLowerCase() === initialChatTarget.toLowerCase()
        );

        if (existingSession) {
          setActiveSessionId(existingSession.id);
          if (isMobileView) setIsSidebarOpen(false);
          onClearChatTarget?.();
        } else {
          // Create new chat session
          const newSession = await DataService.startNewChat(initialChatTarget);
          
          // Add to sessions and set as active
          setSessions(prev => {
            const exists = prev.some(s => s.id === newSession.id);
            return exists ? prev : [newSession, ...prev];
          });
          
          // Set active session after adding to state
          setTimeout(() => {
            setActiveSessionId(newSession.id);
            if (isMobileView) setIsSidebarOpen(false);
          }, 50);
          
          onClearChatTarget?.();
        }
      } catch (error) {
        console.error('Failed to open chat:', error);
        onClearChatTarget?.();
      }
    };
    
    openOrCreateChat();
  }, [initialChatTarget, currentUser]);

  // Handlers
  const handleSend = async () => {
    if (!inputValue.trim() || !currentUser || !activeSession) return;
    
    const recipientAddress = activeSession.participant.address;
    const messageContent = inputValue.trim();
    
    setInputValue("");
    
    try {
      await DataService.sendMessage(messageContent, recipientAddress);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleStartNewChat = async () => {
    if (!newChatAddress) return;
    setIsSearching(true);
    
    // Check if chat already exists
    const existingSession = sessions.find(s => 
        s.participant.address.toLowerCase() === newChatAddress.toLowerCase() || 
        s.participant.ens?.toLowerCase() === newChatAddress.toLowerCase()
    );

    if (existingSession) {
        setActiveSessionId(existingSession.id);
        setIsNewChatModalOpen(false);
        if (isMobileView) setIsSidebarOpen(false); // "Navigate" to chat
    } else {
        // Create new session
        const newSession = await DataService.startNewChat(newChatAddress);
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        setIsNewChatModalOpen(false);
        if (isMobileView) setIsSidebarOpen(false);
    }
    setIsSearching(false);
    setNewChatAddress("");
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Logic for View Toggle
  const showList = isMobileView ? !activeSessionId : isSidebarOpen;
  const showChat = isMobileView ? activeSessionId : true;

  return (
    <div className="h-[calc(100vh-7rem)] md:h-[88vh] max-w-7xl mx-auto flex gap-4 md:gap-6 pt-2 md:pt-6 overflow-hidden relative">
      
      {/* Sidebar (Chat List) */}
      {showList && (
        <GlassCard className={`
            flex flex-col h-full border-0 bg-gray-900/40 transition-all duration-300
            ${isMobileView ? 'w-full' : 'w-80 lg:w-96'}
        `}>
          <div className="p-5 border-b border-white/5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Messages
                <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full text-gray-400 font-normal">{sessions.length}</span>
              </h2>
              <div className="flex gap-1">
                <button 
                    onClick={() => setIsNewChatModalOpen(true)}
                    className="p-2 hover:bg-primary/10 hover:text-primary text-gray-400 rounded-lg transition-colors"
                    title="New Message"
                >
                    <Plus size={20} />
                </button>
                {!isMobileView && (
                    <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors">
                        <PanelLeftClose size={20} />
                    </button>
                )}
              </div>
            </div>
            <div className="relative group">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" />
                <input 
                  placeholder="Search conversations..." 
                  className="w-full bg-black/20 border border-white/5 focus:border-primary/30 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none transition-all"
                />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => {
                    setActiveSessionId(session.id);
                    if (isMobileView) setIsSidebarOpen(false);
                }}
                className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-200 group relative ${
                  activeSessionId === session.id 
                    ? 'bg-white/10 border border-white/5' 
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="relative flex-shrink-0">
                   <Avatar url={session.participant.avatarUrl} size="md" bordered={activeSessionId !== session.id} />
                   {onlineUsers.has(session.participant.address) && (
                     <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#131417]"></div>
                   )}
                   {session.unreadCount > 0 && (
                     <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full border-2 border-[#131417] flex items-center justify-center text-[10px] font-bold text-black">
                         {session.unreadCount}
                     </span>
                   )}
                </div>
                <div className="flex-1 text-left overflow-hidden min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`font-semibold truncate text-sm ${activeSessionId === session.id ? 'text-white' : 'text-gray-300'}`}>
                        {session.participant.ens || formatAddress(session.participant.address)}
                      </span>
                      {session.participant.activeBadge && session.participant.activeBadge.status === 'active' && (
                        <BadgeIcon badgeType={session.participant.activeBadge.badgeType} size="sm" />
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 flex-shrink-0 font-mono ml-2">
                        {session.lastMessage.id !== 'init' ? new Date(session.lastMessage.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                    </span>
                  </div>
                  <p className={`text-xs truncate flex items-center gap-1 ${activeSessionId === session.id ? 'text-gray-400' : 'text-gray-500 group-hover:text-gray-400'}`}>
                    {session.lastMessage.sender === currentUser?.address && (
                      session.lastMessage.isRead ? (
                        <CheckCheck size={12} className="text-blue-400" />
                      ) : (
                        <Check size={12} className="text-gray-500" />
                      )
                    )}
                    {session.lastMessage.id === 'init' ? <span className="italic text-primary/70">Draft</span> : session.lastMessage.content}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Main Chat Window */}
      {showChat && (
        <GlassCard className="flex-1 flex flex-col h-full relative overflow-hidden border border-white/10 shadow-2xl bg-black/40">
          {activeSessionId ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-white/5 flex items-center gap-4 bg-white/[0.02] backdrop-blur-md z-20 shadow-sm">
                <div className="flex items-center gap-3 flex-1">
                    {/* Mobile Back */}
                    {isMobileView && (
                        <button onClick={() => setActiveSessionId(null)} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    
                    {/* Desktop Expand */}
                    {!isMobileView && !isSidebarOpen && (
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors mr-2">
                            <PanelLeftOpen size={20} />
                        </button>
                    )}

                    <div onClick={() => activeSession && onUserClick(activeSession.participant)} className="cursor-pointer hover:opacity-80 transition-opacity">
                        <Avatar url={activeSession?.participant.avatarUrl || ""} size="md" />
                    </div>
                    <div className="flex flex-col">
                        <h3 
                            onClick={() => activeSession && onUserClick(activeSession.participant)}
                            className="font-bold text-white text-base flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                        >
                            {activeSession?.participant.ens || (activeSession && formatAddress(activeSession.participant.address))}
                            {activeSession?.participant.activeBadge && activeSession.participant.activeBadge.status === 'active' && (
                              <BadgeIcon badgeType={activeSession.participant.activeBadge.badgeType} size="sm" />
                            )}
                        </h3>
                        <div className="flex items-center gap-2">
                            {isOtherUserOnline ? (
                              <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  <span className="text-[10px] text-green-500/80 font-medium">Online</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                  <span className="text-[10px] text-gray-500 font-medium">Offline</span>
                              </div>
                            )}
                            <span className="text-gray-600">•</span>
                            <div className="flex items-center gap-1.5">
                                <Lock size={10} className="text-gray-500" />
                                <span className="text-[10px] text-gray-500 font-mono tracking-wider">ENCRYPTED</span>
                            </div>
                        </div>
                    </div>
                </div>
                <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors">
                    <MoreVertical size={20} />
                </button>
              </div>

              {/* Messages Area */}
              <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth custom-scrollbar relative"
              >
                {/* Fade mask at top for smooth feel */}
                <div className="fixed top-[4.5rem] left-0 right-0 h-8 bg-gradient-to-b from-black/20 to-transparent pointer-events-none z-10" />

                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-40 select-none">
                         <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <Lock size={32} className="text-gray-500" />
                         </div>
                        <p className="text-sm text-gray-400 font-mono">Start of encrypted history</p>
                    </div>
                )}

                {messages.map((msg, idx) => {
                  const isMe = msg.sender === currentUser?.address;
                  const prevMsg = messages[idx - 1];
                  const nextMsg = messages[idx + 1];
                  
                  // Grouping Logic
                  const isSequence = prevMsg && prevMsg.sender === msg.sender;
                  const isLastInSequence = !nextMsg || nextMsg.sender !== msg.sender;
                  
                  // Date Separator
                  const showDate = idx === 0 || new Date(msg.timestamp).getDate() !== new Date(messages[idx - 1].timestamp).getDate();
                  
                  return (
                    <React.Fragment key={msg.id}>
                        {showDate && (
                             <div className="flex items-center gap-4 my-6 opacity-50">
                                 <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                                 <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">
                                     {new Date(msg.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                 </span>
                                 <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                             </div>
                        )}
                        
                        <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} group animate-fade-in`}>
                          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[65%]`}>
                              
                              <div className={`
                                px-5 py-3 text-[15px] leading-relaxed shadow-sm transition-all relative
                                ${isMe 
                                    ? `bg-primary text-black rounded-2xl rounded-tr-sm ${!isLastInSequence ? 'mb-1' : ''}` 
                                    : `bg-[#1E2025] text-gray-100 border border-white/5 rounded-2xl rounded-tl-sm ${!isLastInSequence ? 'mb-1' : ''}`
                                }
                              `}>
                                {msg.content}
                              </div>
                              
                              {isLastInSequence && (
                                <div className="flex items-center gap-1.5 mt-1 px-1">
                                  <span className="text-[10px] text-gray-500 font-mono">
                                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                                  {isMe && (
                                    <span className="flex items-center">
                                      {msg.isRead ? (
                                        <CheckCheck size={14} className="text-blue-400" />
                                      ) : (
                                        <Check size={14} className="text-gray-500" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              )}
                          </div>
                        </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} className="h-1" />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-gray-900/60 backdrop-blur-xl border-t border-white/5 z-20">
                <form 
                  className="flex gap-3 items-end max-w-4xl mx-auto"
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                >
                  <div className="flex-1 relative">
                    <Input 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type a secure message..."
                        className="w-full bg-black/40 border-white/10 focus:bg-black/60 focus:border-primary/40 rounded-2xl pl-5 pr-12 py-3.5 transition-all shadow-inner min-h-[50px] max-h-[120px]"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={!inputValue.trim()} 
                    className={`rounded-2xl w-12 h-[50px] p-0 flex items-center justify-center shrink-0 transition-all duration-300 ${inputValue.trim() ? 'bg-primary text-black translate-y-0 opacity-100' : 'bg-white/5 text-gray-600 opacity-50'}`}
                  >
                    <Send size={20} />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            // Empty State
            <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-6 p-8 text-center">
              <div className="relative group">
                  <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 flex items-center justify-center shadow-2xl relative z-10">
                    <MessageSquare size={40} className="text-gray-400 group-hover:text-primary transition-colors duration-500" />
                  </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Encrypted Messaging</h3>
                <p className="text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
                    Your conversations are end-to-end encrypted and stored on the decentralized graph.
                </p>
              </div>
              <Button onClick={() => setIsNewChatModalOpen(true)} variant="primary" className="rounded-full px-8 py-3 font-bold">
                  Start New Chat
              </Button>
            </div>
          )}
        </GlassCard>
      )}

      {/* PROFESSIONAL REDESIGNED MODAL */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0E11]/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg relative transform transition-all scale-100">
                {/* Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-3xl blur-lg opacity-75"></div>
                
                <div className="relative bg-[#16161a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/5">
                        <h3 className="text-xl font-bold text-white tracking-tight">New Message</h3>
                        <button 
                            onClick={() => setIsNewChatModalOpen(false)}
                            className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-8">
                        
                        {/* Recipient Input */}
                        <div className="space-y-3">
                             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">To</label>
                             <div className="relative group">
                                 <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                     <Search size={18} className="text-gray-500 group-focus-within:text-primary transition-colors" />
                                 </div>
                                 <input 
                                     value={newChatAddress}
                                     onChange={(e) => setNewChatAddress(e.target.value)}
                                     placeholder="Search address (0x...) or ENS" 
                                     className="w-full bg-black/40 border border-white/10 focus:border-primary/50 focus:bg-black/60 rounded-xl py-4 pl-11 pr-4 text-white placeholder-gray-600 outline-none transition-all font-mono shadow-inner"
                                     autoFocus
                                 />
                                 {newChatAddress.length > 0 && (
                                     <div className="absolute inset-y-0 right-4 flex items-center">
                                         {newChatAddress.length > 5 ? (
                                              <CheckCheck size={18} className="text-green-500" />
                                         ) : (
                                              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                         )}
                                     </div>
                                 )}
                             </div>
                             <p className="text-xs text-gray-600 ml-1">Enter a BSC wallet address or ENS domain to initialize a secure session.</p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-4 pt-2">
                            <Button 
                                variant="ghost" 
                                onClick={() => setIsNewChatModalOpen(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleStartNewChat} 
                                disabled={!newChatAddress || isSearching} 
                                className="min-w-[140px] py-3 bg-primary text-black font-bold hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-shadow"
                            >
                                {isSearching ? (
                                    <span className="flex items-center gap-2">
                                        <Loader size={16} className="animate-spin" />
                                        Connecting...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <MessageSquare size={18} />
                                        Start Chat
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                    
                    {/* Footer / Suggested (Optional Decoration) */}
                    <div className="bg-white/[0.02] p-4 border-t border-white/5 flex items-center justify-center">
                        <span className="text-[10px] text-gray-600 flex items-center gap-1.5 uppercase tracking-widest font-mono">
                            <Lock size={10} /> 
                            End-to-End Encrypted
                        </span>
                    </div>

                </div>
            </div>
        </div>
      )}
    </div>
  );
};