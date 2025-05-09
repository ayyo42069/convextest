"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Search, MoreVertical, Smile, Check, CheckCheck, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useInView } from "react-intersection-observer";
import { Id } from "../../convex/_generated/dataModel";

// Generate a unique device ID
function getDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

interface UserPreferences {
  theme?: string;
  notifications?: boolean;
  sound?: boolean;
}

interface SavedAccount {
  username: string;
  color: string;
  status: string;
  avatar?: string;
  preferences: UserPreferences;
}

async function compressImage(file: File, maxSizeMB: number = 1): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions while maintaining aspect ratio
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Start with high quality
        let quality = 0.9;
        let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Reduce quality until size is under maxSizeMB
        while (compressedDataUrl.length > maxSizeMB * 1024 * 1024 && quality > 0.1) {
          quality -= 0.1;
          compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(compressedDataUrl);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

const REACTION_EMOJIS = ["👍", "😂", "❤️", "😮", "😢", "😡"];

interface Message {
  _id: Id<"messages">;
  text: string;
  username: string;
  timestamp: number;
  readBy?: string[];
  delivered?: boolean;
  edited?: boolean;
  deleted?: boolean;
  reactions?: Array<{
    user: string;
    emoji: string;
  }>;
}

interface UserInfo {
  _id: Id<"users">;
  _creationTime: number;
  avatar?: string;
  username: string;
  color: string;
  status: string;
  preferences: UserPreferences;
  lastSeen?: number;
  isOnline?: boolean;
  lastActivity?: number;
}

interface ChatMessageProps {
  msg: Message;
  isSelf: boolean;
  isEditing: boolean;
  editingText: string;
  setEditingId: (id: Id<"messages"> | null) => void;
  setEditingText: (text: string) => void;
  handleEdit: (id: Id<"messages">, text: string) => void;
  handleDelete: (id: Id<"messages">) => void;
  handleReact: (id: Id<"messages">, emoji: string) => void;
  reactionPopoverId: Id<"messages"> | null;
  setReactionPopoverId: (id: Id<"messages"> | null) => void;
  userInfo: UserInfo | null | undefined;
  username: string;
  markRead: (params: { messageId: Id<"messages">; username: string }) => void;
}

function ChatMessage({ 
  msg, 
  isSelf, 
  isEditing, 
  editingText, 
  setEditingId, 
  setEditingText, 
  handleEdit, 
  handleDelete, 
  handleReact, 
  reactionPopoverId, 
  setReactionPopoverId, 
  userInfo, 
  username, 
  markRead 
}: ChatMessageProps) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.5 });
  React.useEffect(() => {
    if (inView && !isSelf && !msg.readBy?.includes(username)) {
      markRead({ messageId: msg._id, username });
    }
  }, [inView, isSelf, msg._id, msg.readBy, username, markRead]);
  if (msg.deleted) {
    return (
      <div className={cn("flex items-end gap-2", isSelf ? "justify-end" : "justify-start")}> 
        <div className="italic text-gray-400 dark:text-zinc-500 text-xs">Message deleted</div>
      </div>
    );
  }
  return (
    <div ref={ref} className={cn("flex items-end gap-2", isSelf ? "justify-end" : "justify-start")}
      onMouseLeave={() => setReactionPopoverId(null)}
    >
      {!isSelf && (
        <Avatar className="w-8 h-8">
          <AvatarImage src={userInfo?.avatar} alt={username} />
          <AvatarFallback>{msg.username[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
      )}
      <div className={cn(
        "max-w-[80vw] sm:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2 text-sm shadow relative group",
        isSelf
          ? "bg-blue-500 text-white rounded-br-md dark:bg-blue-600"
          : "bg-white text-blue-900 border border-blue-100 rounded-bl-md dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700"
      )}>
        <div className="font-medium mb-1 flex items-center gap-2">
          {!isSelf && <span className="text-xs text-blue-400 dark:text-zinc-300">{msg.username}</span>}
          <span className="text-[10px] text-blue-300 dark:text-zinc-400 ml-2">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {msg.edited && <span className="ml-2 text-[10px] italic text-yellow-400">edited</span>}
          {/* 3-dot menu for own messages */}
          {isSelf && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-2 p-1 rounded-full hover:bg-blue-400/20 dark:hover:bg-zinc-700/40 focus:outline-none">
                  <MoreVertical className="w-4 h-4 text-white dark:text-zinc-200" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50">
                <DropdownMenuItem onClick={() => {
                  setEditingId(msg._id);
                  setEditingText(msg.text);
                }}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(msg._id)} className="text-red-500">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {isEditing ? (
          <form
            onSubmit={e => {
              e.preventDefault();
              handleEdit(msg._id, editingText);
            }}
            className="flex gap-2"
          >
            <input
              className="flex-1 rounded-full border px-2 py-1 text-blue-900 dark:text-zinc-100 dark:bg-zinc-900"
              value={editingText}
              onChange={e => setEditingText(e.target.value)}
              autoFocus
            />
            <button type="submit" className="text-blue-500 dark:text-blue-300">Save</button>
            <button type="button" className="text-gray-400 dark:text-zinc-400" onClick={() => setEditingId(null)}>Cancel</button>
          </form>
        ) : (
          <div>{msg.text}</div>
        )}
        {/* Reactions row inside bubble */}
        <div className="flex items-center gap-1 mt-2">
          {msg.reactions && msg.reactions.length > 0 && (
            <div className="flex gap-1">
              {REACTION_EMOJIS.map((emoji: string) => {
                const users = msg.reactions?.filter((r: { emoji: string; user: string }) => r.emoji === emoji) || [];
                if (!users.length) return null;
                return (
                  <span key={emoji} className="px-1 rounded bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 text-xs flex items-center gap-1">
                    {emoji} <span className="font-bold">{users.length}</span>
                  </span>
                );
              })}
            </div>
          )}
          {/* Smiley icon for reaction popover */}
          <Popover open={reactionPopoverId === msg._id} onOpenChange={open => setReactionPopoverId(open ? msg._id : null)}>
            <PopoverTrigger asChild>
              <button className="ml-1 p-1 rounded-full hover:bg-blue-400/20 dark:hover:bg-zinc-700/40 focus:outline-none">
                <Smile className="w-4 h-4 text-blue-400 dark:text-blue-200" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="flex gap-1 p-2 z-50">
              {REACTION_EMOJIS.map((emoji: string) => (
                <button
                  key={emoji}
                  className="text-lg hover:scale-125 transition-transform"
                  onClick={() => { handleReact(msg._id, emoji); setReactionPopoverId(null); }}
                  type="button"
                >
                  {emoji}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
        {/* Delivery/Read status for own messages */}
        {isSelf && (
          <div className="flex items-center gap-1 justify-end mt-1 text-xs text-blue-200 dark:text-blue-100 opacity-80">
            {msg.readBy && msg.readBy.length > 1 ? (
              <>
                <CheckCheck className="w-4 h-4 inline" />
                <span>Read by {msg.readBy.length - 1}</span>
              </>
            ) : msg.delivered ? (
              <Check className="w-4 h-4 inline" />
            ) : (
              <Loader2 className="w-4 h-4 animate-spin inline" />
            )}
          </div>
        )}
      </div>
      {isSelf && (
        <Avatar className="w-8 h-8">
          <AvatarImage src={userInfo?.avatar} alt={username} />
          <AvatarFallback>{username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

export function Chat() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [isUsernameSet, setIsUsernameSet] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userColor, setUserColor] = useState("#000000");
  const [userStatus, setUserStatus] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<Id<"messages"> | null>(null);
  const [editingText, setEditingText] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [reactionPopoverId, setReactionPopoverId] = useState<Id<"messages"> | null>(null);
  
  const { toast } = useToast();
  const messages = useQuery(api.messages.list);
  const userInfo = useQuery(api.users.getUser, { username });
  const savedAccounts = useQuery(api.users.getSavedAccounts, { deviceId: deviceId || "" });
  const accountCount = useQuery(api.users.getAccountCount, { deviceId: deviceId || "" });
  const checkUsername = useQuery(api.users.checkUsername, { username: username.trim() });
  const onlineUsers = useQuery(api.users.getOnlineUsers);
  const activityHistory = useQuery(api.users.getActivityHistory, { username });
  const sendMessage = useMutation(api.messages.send);
  const updatePreferences = useMutation(api.users.updatePreferences);
  const updateStatus = useMutation(api.users.updateStatus);
  const updateAppearance = useMutation(api.users.updateAppearance);
  const updatePresence = useMutation(api.users.updatePresence);
  const updateAvatar = useMutation(api.users.updateAvatar);
  const editMessage = useMutation(api.messages.editMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const reactToMessage = useMutation(api.messages.reactToMessage);
  const { setTheme, theme } = useTheme();
  const typingUsers = useQuery(api.messages.getTypingUsers);
  const markRead = useMutation(api.messages.markRead);

  // Initialize deviceId on client-side only
  useEffect(() => {
    const id = getDeviceId();
    if (id) {
      setDeviceId(id);
    }
  }, []);

  // Load user preferences when username is set
  useEffect(() => {
    if (isUsernameSet && userInfo) {
      setUserColor(userInfo.color || "#000000");
      setUserStatus(userInfo.status || "");
    }
  }, [isUsernameSet, userInfo]);

  // Check username availability
  useEffect(() => {
    if (username.trim() && !isUsernameSet) {
      setIsCheckingUsername(true);
    } else {
      setIsCheckingUsername(false);
    }
  }, [username, isUsernameSet]);

  // Update presence on mount and unmount
  useEffect(() => {
    if (!username) return;
    
    const interval = setInterval(() => {
      updatePresence({ username, isOnline: true });
    }, 30000);
    
    return () => {
      clearInterval(interval);
      updatePresence({ username, isOnline: false });
    };
  }, [username, updatePresence]);

  // Build a user info map for avatars
  const userInfoMap = useMemo(() => {
    if (!onlineUsers) return new Map<string, UserInfo>();
    return onlineUsers.reduce((acc: Map<string, UserInfo>, user) => {
      if (user) acc.set(user.username, user);
      return acc;
    }, new Map<string, UserInfo>());
  }, [onlineUsers]);

  // Typing indicator logic
  interface TypingUser {
    username: string;
    timestamp: number;
  }

  const typingUsersList = useMemo(() => {
    if (!typingUsers) return [];
    return typingUsers.filter((u: TypingUser) => u.username !== username);
  }, [typingUsers, username]);

  // Handler for input typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      await sendMessage({
        text: message,
        username,
        color: userColor || "#000000"
      });
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleSetUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    try {
      setIsCheckingUsername(true);
      if (checkUsername?.isTaken) {
        toast({
          title: "Error",
          description: "Username already taken",
          variant: "destructive",
        });
        return;
      }
      setIsUsernameSet(true);
    } catch (error) {
      console.error("Failed to set username:", error);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handlePreferencesChange = async (preferences: Partial<UserPreferences>) => {
    try {
      await updatePreferences({ username, preferences });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await updateStatus({ username, status });
      setUserStatus(status);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleColorChange = async (color: string) => {
    try {
      await updateAppearance({ username, color });
      setUserColor(color);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update color",
        variant: "destructive",
      });
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      await updateAvatar({ username, avatar: compressed });
    } catch (error) {
      console.error("Failed to update avatar:", error);
    }
  };

  const loadAccount = async (account: SavedAccount) => {
    setUsername(account.username);
    setUserColor(account.color);
    setUserStatus(account.status);
    setIsUsernameSet(true);
  };

  async function handleEdit(msgId: Id<"messages">, newText: string) {
    try {
      await editMessage({ messageId: msgId, newText, username });
      setEditingId(null);
      setEditingText("");
      toast({ title: "Message edited" });
    } catch {
      toast({ title: "Error", description: "Could not edit message", variant: "destructive" });
    }
  }

  async function handleDelete(msgId: Id<"messages">) {
    try {
      await deleteMessage({ messageId: msgId, username });
      toast({ title: "Message deleted" });
    } catch {
      toast({ title: "Error", description: "Could not delete message", variant: "destructive" });
    }
  }

  async function handleReact(msgId: Id<"messages">, emoji: string) {
    try {
      await reactToMessage({ messageId: msgId, user: username, emoji });
    } catch {
      toast({ title: "Error", description: "Could not react to message", variant: "destructive" });
    }
  }

  if (!isUsernameSet) {
    return (
      <Card className="p-6 max-w-md mx-auto mt-8">
        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">New Account</TabsTrigger>
            <TabsTrigger value="saved">Saved Accounts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="new">
            <form onSubmit={handleSetUsername} className="space-y-4 mt-4">
              <h2 className="text-2xl font-bold">Enter your username</h2>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  className="w-full"
                />
                {isCheckingUsername && checkUsername?.isTaken && (
                  <p className="text-sm text-red-500">This username is already taken</p>
                )}
                {accountCount && (
                  <p className="text-sm text-gray-500">
                    {accountCount.count} of {accountCount.maxAccounts} accounts used
                  </p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={accountCount ? accountCount.count >= accountCount.maxAccounts : false}
              >
                Start Chatting
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="saved">
            <div className="space-y-4 mt-4">
              <h2 className="text-2xl font-bold">Saved Accounts</h2>
              {!savedAccounts || savedAccounts.length === 0 ? (
                <p className="text-gray-500">No saved accounts</p>
              ) : (
                <div className="space-y-2">
                  {savedAccounts.map((account) => (
                    <Card key={account.username} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={account.avatar} />
                            <AvatarFallback>{account.username[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium" style={{ color: account.color }}>
                              {account.username}
                            </p>
                            {account.status && (
                              <p className="text-sm text-gray-500">{account.status}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => loadAccount(account)}
                        >
                          Load
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-blue-100 to-white dark:from-zinc-900 dark:to-zinc-950 transition-colors duration-300 relative">
      {/* Messenger-style Header (no Simple Chat or redundant header) */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border-b border-blue-200 dark:border-zinc-800 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={userInfo?.avatar} alt={username} />
            <AvatarFallback>{username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold text-blue-900 dark:text-zinc-100 text-base sm:text-lg">{username}</div>
            <div className="text-xs text-blue-500 dark:text-zinc-400">{userInfo?.status || "Active now"}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowSearch((v) => !v)} aria-label="Search">
            <Search className="w-5 h-5 text-blue-500 dark:text-zinc-200" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowSettings((v) => !v)} aria-label="Settings">
            <svg className="w-5 h-5 text-blue-500 dark:text-zinc-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 5 15.4a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09c.38.07.73.24 1 .51a1.65 1.65 0 0 0 1.82.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8c.07.38.24.73.51 1H21a2 2 0 0 1 0 4h-.09c-.07.38-.24.73-.51 1z"/></svg>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowActivity((v) => !v)} aria-label="Activity">
            <svg className="w-5 h-5 text-pink-400 dark:text-pink-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
          </Button>
        </div>
      </div>

      {/* Search Panel (slide-in on mobile) */}
      {showSearch && (
        <Card className="fixed sm:absolute top-0 right-0 h-full w-full sm:w-96 z-30 p-6 shadow-2xl bg-white dark:bg-zinc-900 transition-transform duration-300 transform sm:translate-x-0 translate-x-0 sm:rounded-none rounded-l-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Search Messages</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowSearch(false)} aria-label="Close">
              <span className="text-2xl">×</span>
            </Button>
          </div>
          <div className="space-y-4">
            <Input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search messages..."
              className="w-full"
            />
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {search && messages?.length === 0 && (
                <p className="text-gray-500 dark:text-zinc-400">No results found.</p>
              )}
              {search && messages?.map((msg) => (
                <Card key={msg._id} className="p-2 flex flex-col gap-1 bg-blue-50 dark:bg-zinc-800">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={userInfoMap.get(msg.username)?.avatar} alt={msg.username} />
                    </Avatar>
                    <span className="font-medium text-blue-900 dark:text-zinc-100">{msg.username}</span>
                    <span className="text-xs text-blue-400 dark:text-zinc-400">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-sm text-blue-900 dark:text-zinc-100">{msg.text}</div>
                </Card>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Settings Panel (slide-in on mobile) */}
      {showSettings && (
        <Card className="fixed sm:absolute top-0 right-0 h-full w-full sm:w-96 z-30 p-6 shadow-2xl bg-white dark:bg-zinc-900 transition-transform duration-300 transform sm:translate-x-0 translate-x-0 sm:rounded-none rounded-l-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Settings</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)} aria-label="Close">
              <span className="text-2xl">×</span>
            </Button>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Avatar</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Input
                value={userStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                placeholder="Set your status"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Color</Label>
              <Input
                type="color"
                value={userColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Theme</Label>
              <Select
                value={theme}
                onValueChange={setTheme}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={userInfo?.preferences?.notifications}
                onCheckedChange={(checked) => handlePreferencesChange({ notifications: checked })}
              />
              <Label>Notifications</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={userInfo?.preferences?.sound}
                onCheckedChange={(checked) => handlePreferencesChange({ sound: checked })}
              />
              <Label>Sound</Label>
            </div>
          </div>
        </Card>
      )}

      {/* Activity Panel (slide-in on mobile) */}
      {showActivity && (
        <Card className="fixed sm:absolute top-0 right-0 h-full w-full sm:w-96 z-30 p-6 shadow-2xl bg-white dark:bg-zinc-900 transition-transform duration-300 transform sm:translate-x-0 translate-x-0 sm:rounded-none rounded-l-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Activity History</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowActivity(false)} aria-label="Close">
              <span className="text-2xl">×</span>
            </Button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {activityHistory?.map((activity) => (
              <div key={activity._id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{activity.type}</p>
                  {activity.details && (
                    <p className="text-sm text-gray-500 dark:text-zinc-400">{activity.details}</p>
                  )}
                </div>
                <p className="text-sm text-gray-400 dark:text-zinc-500">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-1 sm:px-2 py-2 sm:py-4 space-y-2 bg-[url('/clouds.webp')] dark:bg-none bg-cover bg-center transition-colors">
        {messages?.map((msg) => {
          const isSelf = msg.username === username;
          const isEditing = editingId === msg._id;
          return (
            <ChatMessage
              key={msg._id}
              msg={msg}
              isSelf={isSelf}
              isEditing={isEditing}
              editingText={editingText}
              setEditingId={setEditingId}
              setEditingText={setEditingText}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              handleReact={handleReact}
              reactionPopoverId={reactionPopoverId}
              setReactionPopoverId={setReactionPopoverId}
              userInfo={userInfo}
              username={username}
              markRead={markRead}
            />
          );
        })}
        {/* Typing indicator at the bottom */}
        {typingUsersList.length > 0 && (
          <div className="absolute left-0 right-0 bottom-20 flex items-center justify-center pointer-events-none select-none">
            <div className="bg-white/80 dark:bg-zinc-900/80 rounded-full px-4 py-1 text-blue-500 dark:text-blue-200 text-xs shadow">
              {typingUsersList.map(u => u.username).join(", ")} {typingUsersList.length === 1 ? "is" : "are"} typing…
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSendMessage}
        className="flex items-center gap-2 px-2 sm:px-4 py-3 bg-white/90 dark:bg-zinc-900/90 border-t border-blue-200 dark:border-zinc-800 sticky bottom-0 z-10"
      >
        <input
          type="text"
          value={message}
          onChange={handleInputChange}
          placeholder="Aa"
          className="flex-1 rounded-full border border-blue-100 dark:border-zinc-700 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-zinc-700 bg-blue-50 dark:bg-zinc-800 text-blue-900 dark:text-zinc-100 transition-colors"
        />
        <button type="submit" className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-800 text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
        </button>
      </form>
    </div>
  );
} 