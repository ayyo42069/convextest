"use client";

import { useState, useEffect } from "react";
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

export function Chat() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [isUsernameSet, setIsUsernameSet] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userColor, setUserColor] = useState("#000000");
  const [userStatus, setUserStatus] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [avatar, setAvatar] = useState<string>("");
  const [showActivity, setShowActivity] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({});
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [showReactions, setShowReactions] = useState<string | null>(null);
  
  const { toast } = useToast();
  const messages = search
    ? useQuery(api.messages.searchMessages, { query: search })
    : useQuery(api.messages.list);
  const userInfo = useQuery(api.users.getUser, { username });
  const savedAccounts = useQuery(api.users.getSavedAccounts, { deviceId: deviceId || "" });
  const accountCount = useQuery(api.users.getAccountCount, { deviceId: deviceId || "" });
  const checkUsername = useQuery(api.users.checkUsername, { username });
  const onlineUsers = useQuery(api.users.getOnlineUsers);
  const activityHistory = useQuery(api.users.getActivityHistory, { username });
  const sendMessage = useMutation(api.messages.send);
  const updatePreferences = useMutation(api.users.updatePreferences);
  const updateStatus = useMutation(api.users.updateStatus);
  const updateAppearance = useMutation(api.users.updateAppearance);
  const updatePresence = useMutation(api.users.updatePresence);
  const updateAvatar = useMutation(api.users.updateAvatar);
  const saveAccount = useMutation(api.users.saveAccount);
  const editMessage = useMutation(api.messages.editMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const reactToMessage = useMutation(api.messages.reactToMessage);

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
    if (username) {
      updatePresence({ username, isOnline: true });
    }
    return () => {
      if (username) {
        updatePresence({ username, isOnline: false });
      }
    };
  }, [username]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    try {
      await sendMessage({
        text: message,
        username,
        color: userColor || "#000000",
      });
      setMessage("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSetUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !deviceId) {
      toast({
        title: "Error",
        description: "Please enter a username and ensure device ID is available.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if username is taken
      const usernameCheck = await checkUsername;
      if (usernameCheck?.isTaken) {
        toast({
          title: "Username taken",
          description: "Please choose a different username.",
          variant: "destructive",
        });
        return;
      }

      // Check account limit
      const count = await accountCount;
      if (count && count.count >= count.maxAccounts) {
        toast({
          title: "Account limit reached",
          description: "You can only have 3 saved accounts per device.",
          variant: "destructive",
        });
        return;
      }

      // Save account
      await saveAccount({
        deviceId: deviceId || "",
        username,
        color: "#000000",
        status: "",
        preferences: {
          theme: "light",
          notifications: true,
          sound: true,
        },
      });

      toast({
        title: "Account saved",
        description: "Your account has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePreferencesChange = async (preferences: Partial<UserPreferences>) => {
    try {
      await updatePreferences({
        username,
        preferences: {
          ...userInfo?.preferences,
          ...preferences,
        },
      });
      
      // Update saved account
      await saveAccount({
        deviceId: deviceId || "",
        username,
        color: userColor,
        status: userStatus,
        avatar: avatar,
        preferences: {
          ...userInfo?.preferences,
          ...preferences,
        },
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await updateStatus({
        username,
        status,
      });
      setUserStatus(status);
      
      // Update saved account
      await saveAccount({
        deviceId: deviceId || "",
        username,
        color: userColor,
        status,
        avatar: avatar,
        preferences: userInfo?.preferences || {},
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleColorChange = async (color: string) => {
    try {
      await updateAppearance({
        username,
        color,
      });
      setUserColor(color);
      
      // Update saved account
      await saveAccount({
        deviceId: deviceId || "",
        username,
        color,
        status: userStatus,
        avatar: avatar,
        preferences: userInfo?.preferences || {},
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update color. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Show loading toast
      toast({
        title: "Processing image",
        description: "Compressing and uploading your avatar...",
      });

      // Compress the image
      const compressedImage = await compressImage(file);
      
      try {
        await updateAvatar({
          username,
          avatar: compressedImage,
        });
        setAvatar(compressedImage);
        
        // Update saved account
        if (deviceId) {
          await saveAccount({
            deviceId: deviceId,
            username,
            color: userColor,
            status: userStatus,
            avatar: compressedImage,
            preferences: userInfo?.preferences || {},
          });
        }

        toast({
          title: "Avatar updated",
          description: "Your avatar has been updated successfully.",
        });
      } catch (error) {
        console.error("Avatar update error:", error);
        toast({
          title: "Error updating avatar",
          description: "Failed to update avatar. Please try a different image.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Image processing error:", error);
      toast({
        title: "Error",
        description: "Failed to process the image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const loadAccount = async (account: SavedAccount) => {
    setUsername(account.username);
    setUserColor(account.color);
    setUserStatus(account.status);
    setAvatar(account.avatar || "");
    setIsUsernameSet(true);
  };

  // Helper: always use string for deviceId
  const safeDeviceId = deviceId || "";

  async function handleEdit(msgId: string, newText: string) {
    try {
      await editMessage({ messageId: msgId as any, newText, username });
      setEditingId(null);
      setEditingText("");
      toast({ title: "Message edited" });
    } catch (e) {
      toast({ title: "Error", description: "Could not edit message", variant: "destructive" });
    }
  }

  async function handleDelete(msgId: string) {
    try {
      await deleteMessage({ messageId: msgId as any, username });
      toast({ title: "Message deleted" });
    } catch (e) {
      toast({ title: "Error", description: "Could not delete message", variant: "destructive" });
    }
  }

  async function handleReact(msgId: string, emoji: string) {
    try {
      await reactToMessage({ messageId: msgId as any, user: username, emoji });
    } catch (e) {
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
    <div className="flex flex-col h-screen bg-gradient-to-b from-blue-100 to-white relative">
      {/* Search Bar */}
      <div className="px-4 py-2 bg-white/80 border-b border-blue-200 sticky top-0 z-20">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search messages..."
          className="w-full rounded-full border border-blue-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-blue-50 text-blue-900"
        />
      </div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur border-b border-blue-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={userInfo?.avatar} alt={username} />
            <AvatarFallback>{username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold text-blue-900 text-base">{username || "Tour Crew"}</div>
            <div className="text-xs text-blue-500">{userInfo?.status || "Active now"}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowSettings((v) => !v)} aria-label="Settings">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 5 15.4a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09c.38.07.73.24 1 .51a1.65 1.65 0 0 0 1.82.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8c.07.38.24.73.51 1H21a2 2 0 0 1 0 4h-.09c-.07.38-.24.73-.51 1z"/></svg>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowActivity((v) => !v)} aria-label="Activity">
            <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="absolute top-16 right-4 z-20 w-80 p-6 shadow-xl">
          <h3 className="text-lg font-semibold mb-4">Settings</h3>
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
                value={userInfo?.preferences?.theme}
                onValueChange={(value) => handlePreferencesChange({ theme: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
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

      {/* Activity Panel */}
      {showActivity && (
        <Card className="absolute top-16 right-4 z-20 w-80 p-6 shadow-xl">
          <h3 className="text-lg font-semibold mb-4">Activity History</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {activityHistory?.map((activity) => (
              <div key={activity._id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{activity.type}</p>
                  {activity.details && (
                    <p className="text-sm text-gray-500">{activity.details}</p>
                  )}
                </div>
                <p className="text-sm text-gray-400">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-2 bg-[url('/clouds.webp')] bg-cover bg-center">
        {messages?.map((msg, idx) => {
          const isSelf = msg.username === username;
          const isEditing = editingId === msg._id;
          if (msg.deleted) {
            return (
              <div key={msg._id} className={cn("flex items-end gap-2", isSelf ? "justify-end" : "justify-start")}> 
                <div className="italic text-gray-400 text-xs">Message deleted</div>
              </div>
            );
          }
          return (
            <div key={msg._id} className={cn("flex items-end gap-2", isSelf ? "justify-end" : "justify-start")}
              onMouseEnter={() => setShowReactions(msg._id)}
              onMouseLeave={() => setShowReactions(null)}
            >
              {!isSelf && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback>{msg.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
              <div className={cn(
                "max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow relative",
                isSelf ? "bg-blue-500 text-white rounded-br-md" : "bg-white text-blue-900 border border-blue-100 rounded-bl-md"
              )}>
                <div className="font-medium mb-1 flex items-center gap-2">
                  {!isSelf && <span className="text-xs text-blue-400">{msg.username}</span>}
                  <span className="text-[10px] text-blue-300 ml-2">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {msg.edited && <span className="ml-2 text-[10px] italic text-yellow-400">edited</span>}
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
                      className="flex-1 rounded-full border px-2 py-1 text-blue-900"
                      value={editingText}
                      onChange={e => setEditingText(e.target.value)}
                      autoFocus
                    />
                    <button type="submit" className="text-blue-500">Save</button>
                    <button type="button" className="text-gray-400" onClick={() => setEditingId(null)}>Cancel</button>
                  </form>
                ) : (
                  <div>{msg.text}</div>
                )}
                {/* Reactions */}
                <div className="flex gap-1 mt-2">
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex gap-1">
                      {REACTION_EMOJIS.map(emoji => {
                        const users = msg.reactions?.filter(r => r.emoji === emoji) || [];
                        if (!users.length) return null;
                        return (
                          <span key={emoji} className="px-1 rounded bg-blue-100 text-blue-700 text-xs flex items-center gap-1">
                            {emoji} <span className="font-bold">{users.length}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {/* Add Reaction */}
                  {showReactions === msg._id && (
                    <div className="flex gap-1 ml-2">
                      {REACTION_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          className="hover:scale-125 transition-transform"
                          onClick={() => handleReact(msg._id, emoji)}
                          type="button"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Edit/Delete for own messages */}
                {isSelf && !isEditing && (
                  <div className="absolute top-1 right-2 flex gap-2 opacity-70">
                    <button
                      className="text-xs text-yellow-400 hover:underline"
                      onClick={() => {
                        setEditingId(msg._id);
                        setEditingText(msg.text);
                      }}
                    >Edit</button>
                    <button
                      className="text-xs text-red-400 hover:underline"
                      onClick={() => handleDelete(msg._id)}
                    >Delete</button>
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
        })}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSendMessage}
        className="flex items-center gap-2 px-4 py-3 bg-white/90 border-t border-blue-200 sticky bottom-0 z-10"
      >
        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Aa"
          className="flex-1 rounded-full border border-blue-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-blue-50 text-blue-900"
        />
        <button type="submit" className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
        </button>
      </form>
    </div>
  );
} 