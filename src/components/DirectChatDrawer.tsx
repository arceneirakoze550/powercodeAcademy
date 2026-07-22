import React, { useState, useEffect, useRef } from "react";
import { Search, Send, X, MessageSquare, Flame, RefreshCw, Sparkles } from "lucide-react";
import { User } from "../types";

interface DirectChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  triggerToast?: (msg: string, type?: string) => void;
}

interface ChatMessage {
  id: number;
  senderId: number;
  senderName: string;
  receiverId: number;
  receiverName: string;
  message: string;
  createdAt: string;
}

interface SearchedUser {
  id: number;
  name: string;
  email: string;
  avatarUrl: string;
  learningStreak: number;
}

export function DirectChatDrawer({ isOpen, onClose, currentUser, triggerToast }: DirectChatDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [allUsersMap, setAllUsersMap] = useState<Map<number, SearchedUser>>(new Map());
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom of chat thread when a new message appears or user is selected
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch all direct messages involving current user
  const fetchMessages = async (silent = false) => {
    if (!currentUser) return;
    if (!silent) setIsLoadingMessages(true);

    try {
      const res = await fetch("/api/direct-messages", {
        headers: {
          "Authorization": `Bearer ${currentUser.email}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setAllMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Error loading chat messages:", err);
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  };

  // Search users by name query
  const handleSearch = async (queryStr: string) => {
    if (!currentUser) return;
    setSearchQuery(queryStr);

    if (!queryStr.trim()) {
      // If empty query, load default active user lists
      try {
        const res = await fetch("/api/users/search", {
          headers: { "Authorization": `Bearer ${currentUser.email}` }
        });
        const data = await res.json();
        if (data.success && data.users) {
          setSearchResults(data.users);
          setAllUsersMap(prev => {
            const next = new Map(prev);
            data.users.forEach((u: SearchedUser) => next.set(u.id, u));
            return next;
          });
        }
      } catch (err) {
        console.error(err);
      }
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(queryStr)}`, {
        headers: {
          "Authorization": `Bearer ${currentUser.email}`
        }
      });
      const data = await res.json();
      if (data.success && data.users) {
        setSearchResults(data.users);
        setAllUsersMap(prev => {
          const next = new Map(prev);
          data.users.forEach((u: SearchedUser) => next.set(u.id, u));
          return next;
        });
      }
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Send a direct message to selected user
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedUser || !newMessage.trim()) return;

    setIsSending(true);
    const msgContent = newMessage.trim();
    setNewMessage("");

    try {
      const res = await fetch("/api/direct-messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.email}`
        },
        body: JSON.stringify({
          receiverId: selectedUser.id,
          message: msgContent
        })
      });
      const data = await res.json();
      if (data.success) {
        // Optimistically add to messages
        setAllMessages(prev => [...prev, data.message]);
        setTimeout(scrollToBottom, 80);
      } else {
        if (triggerToast) triggerToast(data.error || "Failed to send message", "error");
      }
    } catch (err: any) {
      if (triggerToast) triggerToast("Connection lost: " + err.message, "error");
    } finally {
      setIsSending(false);
    }
  };

  // Load active chats on drawer mount or open
  useEffect(() => {
    if (isOpen && currentUser) {
      fetchMessages();
      handleSearch(""); // load initial recommended users
    }
  }, [isOpen, currentUser]);

  // Polling every 4 seconds when the drawer is open to keep conversations live
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const interval = setInterval(() => {
      fetchMessages(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [allMessages, selectedUser]);

  if (!isOpen) return null;

  // Filter messages specifically between currentUser and selectedUser
  const currentChatMessages = selectedUser && currentUser
    ? allMessages.filter(
        m => (m.senderId === currentUser.id && m.receiverId === selectedUser.id) ||
             (m.senderId === selectedUser.id && m.receiverId === currentUser.id)
      )
    : [];

  // Group messages by user to construct left-sidebar of "Active Chats"
  const activeChatsList: { user: SearchedUser; lastMessage?: ChatMessage }[] = [];
  
  if (currentUser) {
    const chatPartnersMap = new Map<number, ChatMessage>();
    
    // Sort allMessages by time descending to find latest messages
    const sortedMsg = [...allMessages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    sortedMsg.forEach(m => {
      const partnerId = m.senderId === currentUser.id ? m.receiverId : m.senderId;
      if (!chatPartnersMap.has(partnerId)) {
        chatPartnersMap.set(partnerId, m);
      }
    });

    chatPartnersMap.forEach((msg, partnerId) => {
      const isSender = msg.senderId === currentUser.id;
      const partnerName = isSender ? msg.receiverName : msg.senderName;
      const known = allUsersMap.get(partnerId);
      const partnerAvatar = known?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100";

      activeChatsList.push({
        user: known || {
          id: partnerId,
          name: partnerName,
          email: "",
          avatarUrl: partnerAvatar,
          learningStreak: 1
        },
        lastMessage: msg
      });
    });
  }

  const activePartnerAvatar = (selectedUser && allUsersMap.get(selectedUser.id)?.avatarUrl) || selectedUser?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100";

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-sans">
      {/* Background Dim Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Main Panel Content */}
      <div className="relative w-full max-w-md md:max-w-lg h-full bg-[#0d1117] border-l border-[#30363d] flex flex-col shadow-2xl z-10 animate-fade-in text-[#c9d1d9]">
        
        {/* Panel Header */}
        <div className="p-4 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#ff7b00]/10 p-1.5 rounded border border-[#ff7b00]/20">
              <MessageSquare className="w-4 h-4 text-[#ff7b00]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Peer-to-Peer Chat</h3>
              <p className="text-[10px] text-gray-500 font-mono">Connect and collaborate with students in real-time</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchMessages()}
              title="Refresh conversation threads"
              className="p-1.5 bg-[#21262d] hover:bg-zinc-800 text-gray-400 rounded-lg border border-[#30363d] cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMessages ? "animate-spin text-[#ff7b00]" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-[#21262d] hover:bg-[#f85149]/10 hover:text-[#f85149] text-gray-400 rounded-lg border border-[#30363d] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Two Pane Workspace - Selection List OR Active Thread */}
        <div className="flex-grow flex overflow-hidden">
          
          {/* Active Chats Sidebar / Selection Panel */}
          <div className={`w-full ${selectedUser ? "hidden md:flex" : "flex"} md:w-5/12 border-r border-[#30363d] flex-col overflow-y-auto p-3.5 space-y-3.5`}>
            
            {/* User Search Bar */}
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider font-semibold">Find Peer Students</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search user name..."
                  className="w-full bg-[#161b22] border border-[#30363d] focus:border-[#ff7b00] rounded-xl text-xs pl-8 pr-3 py-2 text-white placeholder-gray-500 outline-none font-mono"
                />
              </div>
            </div>

            {/* Render Search Results if query exists, else show Active Chats */}
            {searchQuery.trim().length > 0 ? (
              <div className="space-y-2 flex-grow overflow-y-auto">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest font-mono block">Search Results ({searchResults.length})</span>
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user);
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="w-full text-left p-2.5 bg-[#161b22]/70 hover:bg-[#161b22] border border-[#21262d] hover:border-[#ff7b00]/40 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer"
                  >
                    <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full border border-[#30363d] object-cover" />
                    <div className="flex-grow min-w-0">
                      <span className="text-xs font-bold text-white block truncate">{user.name}</span>
                      <span className="text-[9px] text-gray-400 flex items-center gap-1 font-mono">
                        <Flame className="w-3 h-3 text-orange-500 fill-current" />
                        Streak: {user.learningStreak} days
                      </span>
                    </div>
                  </button>
                ))}
                {searchResults.length === 0 && !isSearching && (
                  <p className="text-[11px] text-gray-500 italic text-center py-6 font-mono">No matching student found.</p>
                )}
              </div>
            ) : (
              <div className="space-y-2 flex-grow overflow-y-auto">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest font-mono block">Recent Chats</span>
                {activeChatsList.map((chat) => (
                  <button
                    key={chat.user.id}
                    onClick={() => setSelectedUser(chat.user)}
                    className={`w-full text-left p-2.5 border rounded-xl transition-all flex items-center gap-2.5 cursor-pointer ${
                      selectedUser?.id === chat.user.id
                        ? "bg-[#ff7b00]/10 border-[#ff7b00] text-white"
                        : "bg-[#161b22]/40 border-[#21262d] hover:bg-[#161b22] hover:border-[#30363d]"
                    }`}
                  >
                    <img src={chat.user.avatarUrl} alt={chat.user.name} className="w-8 h-8 rounded-full border border-[#30363d] object-cover" />
                    <div className="flex-grow min-w-0">
                      <span className="text-xs font-bold text-white block truncate">{chat.user.name}</span>
                      {chat.lastMessage && (
                        <p className="text-[10px] text-gray-400 truncate font-mono mt-0.5">
                          {chat.lastMessage.senderId === currentUser?.id ? "You: " : ""}{chat.lastMessage.message}
                        </p>
                      )}
                    </div>
                  </button>
                ))}

                {activeChatsList.length === 0 && (
                  <div className="p-6 text-center text-gray-500 italic text-[11px] font-mono border border-dashed border-[#21262d] rounded-2xl">
                    No active chat threads. Find another user above to start chatting!
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active Chat Conversation Pane */}
          <div className={`flex-grow ${selectedUser ? "flex" : "hidden md:flex"} flex-col h-full bg-[#0d1117] overflow-hidden`}>
            {selectedUser ? (
              <div className="h-full flex flex-col justify-between overflow-hidden">
                
                {/* Chat Partner Header info */}
                <div className="px-4 py-3 bg-[#161b22]/50 border-b border-[#30363d] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={activePartnerAvatar} alt={selectedUser.name} className="w-8 h-8 rounded-full border border-[#30363d] object-cover" />
                    <div>
                      <span className="text-xs font-bold text-white block">{selectedUser.name}</span>
                      <span className="text-[9.5px] text-emerald-400 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Online Study Buddy
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="md:hidden text-xs text-[#ff7b00] font-mono font-bold"
                  >
                    ← Back to list
                  </button>
                </div>

                {/* Messages Thread list */}
                <div className="flex-grow overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-[#0d1117]">
                  {currentChatMessages.map((msg) => {
                    const isSelf = msg.senderId === currentUser?.id;
                    return (
                      <div key={msg.id} className={`flex ${isSelf ? "justify-end" : "justify-start"} items-end gap-2`}>
                        {!isSelf && (
                          <img src={activePartnerAvatar} alt={selectedUser.name} className="w-6 h-6 rounded-full border border-[#21262d] shrink-0 self-start mt-0.5 object-cover" />
                        )}
                        <div className="space-y-1 max-w-[75%]">
                          <div className={`p-3 rounded-2xl text-xs font-sans leading-relaxed ${
                            isSelf
                              ? "bg-[#ff7b00] text-white rounded-br-none shadow-[0_2px_8px_rgba(255,123,0,0.25)]"
                              : "bg-[#161b22] text-[#c9d1d9] border border-[#21262d] rounded-bl-none"
                          }`}>
                            {msg.message}
                          </div>
                          <span className="text-[8px] text-gray-500 font-mono block text-right">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {currentChatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2.5">
                      <div className="p-3 bg-[#ff7b00]/10 rounded-full border border-[#ff7b00]/20 text-[#ff7b00]">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Secure Connection established</h5>
                        <p className="text-[10px] text-gray-500 max-w-xs leading-normal">
                          Say hello to {selectedUser.name}! All direct chat messages are stored locally and synced via SSL.
                        </p>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Send Input Form footer */}
                <form onSubmit={handleSendMessage} className="p-3 bg-[#161b22] border-t border-[#30363d] flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Type direct message to ${selectedUser.name}...`}
                    required
                    className="flex-grow bg-[#0d1117] border border-[#30363d] focus:border-[#ff7b00] text-white py-2 px-3 rounded-xl text-xs outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !newMessage.trim()}
                    className="bg-[#ff7b00] hover:bg-[#e66f00] disabled:opacity-50 text-white p-2.5 rounded-xl cursor-pointer transition-colors flex items-center justify-center shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2 text-gray-500 font-mono">
                <MessageSquare className="w-8 h-8 text-[#21262d] stroke-[1.5]" />
                <p className="text-xs">Select a student study buddy to start messaging</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
