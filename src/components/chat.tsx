"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function Chat() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [isUsernameSet, setIsUsernameSet] = useState(false);
  
  const messages = useQuery(api.messages.list);
  const sendMessage = useMutation(api.messages.send);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    await sendMessage({
      text: message,
      username,
    });
    setMessage("");
  };

  const handleSetUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setIsUsernameSet(true);
  };

  if (!isUsernameSet) {
    return (
      <Card className="p-6 max-w-md mx-auto mt-8">
        <form onSubmit={handleSetUsername} className="space-y-4">
          <h2 className="text-2xl font-bold">Enter your username</h2>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="w-full"
          />
          <Button type="submit" className="w-full">
            Join Chat
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
        <div className="h-[400px] overflow-y-auto mb-4 space-y-4">
          {messages?.map((message) => (
            <div
              key={message._id}
              className={`p-3 rounded-lg ${
                message.username === username
                  ? "bg-blue-100 ml-auto"
                  : "bg-gray-100"
              } max-w-[80%]`}
            >
              <div className="font-bold text-sm">{message.username}</div>
              <div>{message.text}</div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit">Send</Button>
        </form>
      </div>
    </div>
  );
} 