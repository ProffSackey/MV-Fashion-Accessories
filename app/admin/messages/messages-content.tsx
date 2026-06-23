"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminNavbar from "../../components/AdminNavbar";
import { MagnifyingGlassIcon, HomeIcon, UserGroupIcon, ShoppingCartIcon, CubeIcon, CreditCardIcon, ChartBarIcon, StarIcon, GiftIcon, BellIcon, EnvelopeIcon, CogIcon } from "@heroicons/react/24/outline";
import { supabaseAdmin } from "../../../lib/supabaseClient";

interface MessageThread {
  id: string;
  name: string;
  email: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  avatar: string;
  resolved?: boolean;
}

interface ChatMessage {
  id: string;
  fromAdmin: boolean;
  content: string;
  time: string;
}
// Replace hard-coded demo data with empty state and server-driven fetches.
// Endpoints aren't required to exist yet; fetches will gracefully fall back to empty arrays.

// Component state for threads and messages (initially empty)
// Threads: list of conversations
// chatMessages: messages for the selected thread


export default function MessagesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Fetch thread list on mount (graceful fallback to empty)
  useEffect(() => {
    fetch('/api/admin/messages/threads')
      .then((res) => (res.ok ? res.json() : Promise.resolve([])))
      .then((data: MessageThread[]) => setThreads(Array.isArray(data) ? data : []))
      .catch(() => setThreads([]));
  }, []);

  // Initialize selected thread from URL params if present or use first thread
  useEffect(() => {
    if (threads.length === 0) return;
    const email = searchParams.get('email');
    const name = searchParams.get('name');
    if (email && name) {
      const thread = threads.find((t) => t.email === email);
      if (thread) {
        thread.unread = 0; // Mark as read
        setSelectedThread(thread);
        return;
      }
    }
    setSelectedThread(threads[0]);
    threads[0].unread = 0;
  }, [searchParams, threads]);

  useEffect(() => {
    fetch('/api/admin/verify-session')
      .then((res) => {
        if (!res.ok) {
          router.push('/admin/login');
        } else {
          setSessionChecked(true);
        }
      })
      .catch(() => {
        router.push('/admin/login');
      });
  }, [router]);

  // Realtime subscription for new messages to admin
  useEffect(() => {
    if (!sessionChecked || !supabaseAdmin) return;

    const channel = supabaseAdmin
      .channel('admin-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'recipient_email=eq.admin@boanipa.com',
        },
        () => {
          // Reload threads
          fetch('/api/admin/messages/threads')
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => setThreads(Array.isArray(data) ? data : []))
            .catch(() => setThreads([]));

          // If selected thread, reload messages
          if (selectedThread) {
            fetch(`/api/admin/messages/thread?email=${encodeURIComponent(selectedThread.email)}`)
              .then((res) => (res.ok ? res.json() : []))
              .then((data) => setChatMessages(Array.isArray(data) ? data : []))
              .catch(() => setChatMessages([]));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionChecked, selectedThread]);

  // Load messages for the selected thread (server-backed if endpoint exists)
  useEffect(() => {
    if (!selectedThread) {
      setChatMessages([]);
      return;
    }
    fetch(`/api/admin/messages/thread?email=${encodeURIComponent(selectedThread.email)}`)
      .then((res) => (res.ok ? res.json() : Promise.resolve([])))
      .then((data: ChatMessage[]) => setChatMessages(Array.isArray(data) ? data : []))
      .catch(() => setChatMessages([]));
  }, [selectedThread]);

  // When chat messages change, scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const filteredThreads = threads.filter((thread) =>
    thread.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    thread.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleSend = async (e: any) => {
    const isEnter = e?.key === 'Enter' && !e?.shiftKey;
    const isClick = e?.type === 'click';

    if ((isEnter || isClick) && newMessage.trim() && selectedThread) {
      const messageContent = newMessage.trim();
      setNewMessage("");

      // Optimistically add message
      const newMsg: ChatMessage = {
        id: `m${chatMessages.length + 1}`,
        fromAdmin: true,
        content: messageContent,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, newMsg]);

      try {
        const response = await fetch('/api/admin/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientEmail: selectedThread.email,
            content: messageContent,
          }),
        });

        if (!response.ok) {
          // Remove temp message on failure
          setChatMessages((prev) => prev.filter(m => m.id !== newMsg.id));
          console.error("Failed to send message");
        }
      } catch (error) {
        // Remove temp message on failure
        setChatMessages((prev) => prev.filter(m => m.id !== newMsg.id));
        console.error("Failed to send message:", error);
      }

      e?.preventDefault?.();
    }
  };

  const getInitialColor = (id: string) => {
    const colors = ['bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-green-500', 'bg-yellow-500'];
    return colors[parseInt(id) % colors.length];
  };

  const formatThreadTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Small sanitizer to make incoming messages look more professional
  const sanitizeMessage = (text: string | undefined) => {
    if (!text) return '';
    let t = String(text || '');
    // Collapse excessive whitespace
    t = t.replace(/\s+/g, ' ').trim();
    // Normalize common casual greetings
    t = t.replace(/(^|\s)hi\b,?/i, ' Hello,');
    t = t.replace(/(^|\s)hello\b,?/i, ' Hello,');
    // Fix common contractions
    t = t.replace(/\bIm\b/g, "I'm");
    t = t.replace(/\bim\b/g, "I'm");
    // Capitalize sentence starts
    t = t.replace(/(^|[\.\!\?]\s+)([a-z])/g, (_m, p1, ch) => `${p1}${ch.toUpperCase()}`);
    return t;
  };

  return (
    <div className="min-h-screen text-gray-900 bg-gray-100">
      <AdminNavbar />
      <div className="flex">
        {/* Sidebar */}
        <div className="hidden md:block w-64 bg-white shadow-lg">
          <nav className="space-y-3 text-gray-700 text-base px-4 py-6">
            <a href="/admin/dashboard" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"><HomeIcon className="h-5 w-5" />Dashboard Overview</a>
            <a href="/admin/customers" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"><UserGroupIcon className="h-5 w-5" />Customers</a>
            <a href="/admin/orders" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"><ShoppingCartIcon className="h-5 w-5" />Orders</a>
            <a href="/admin/products" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"><CubeIcon className="h-5 w-5" />Products</a>
            <a href="/admin/transactions" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"><CreditCardIcon className="h-5 w-5" />Transactions</a>
            <a href="/admin/analytics" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"><ChartBarIcon className="h-5 w-5" />Analytics</a>
            <a href="/admin/reviews" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"><StarIcon className="h-5 w-5" />Reviews</a>
            <a href="/admin/promotions" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"><GiftIcon className="h-5 w-5" />Promotions</a>
            <a href="/admin/notifications" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"><BellIcon className="h-5 w-5" />Notifications</a>
            <a href="/admin/messages" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium bg-gray-100 transition"><EnvelopeIcon className="h-5 w-5" />Messages</a>
            <a href="/admin/settings" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"><CogIcon className="h-5 w-5" />Settings</a>
          </nav>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Threads list */}
          <div className="w-full md:w-80 md:flex-shrink-0 bg-white border-r border-gray-200 border-b md:border-b-0 flex flex-col">
            <div className="px-4 py-4 border-b border-gray-200 flex items-center gap-2">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 placeholder:text-gray-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredThreads.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">No conversations found</div>
              ) : (
                filteredThreads.map((thread) => (
                  <div
                    key={thread.id}
                    onClick={() => {
                      thread.unread = 0;
                      setSelectedThread(thread);
                    }}
                    className={`px-4 py-4 border-b border-gray-100 cursor-pointer transition hover:bg-gray-50 ${
                      selectedThread?.id === thread.id ? "bg-gray-50 border-l-4 border-l-gray-400" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`${getInitialColor(thread.id)} text-white rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0 text-base font-semibold relative`}>
                        {thread.avatar}
                        {thread.online && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-gray-900 truncate block">{thread.name}</span>
                        {thread.unread > 0 && (
                          <span className="bg-yellow-600 text-white text-xs font-semibold px-2 py-1 rounded-full inline-block mt-1">{thread.unread}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Conversation area */}
          <div className="hidden md:flex flex-1 flex-col bg-white overflow-hidden">
            {selectedThread ? (
              <>
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-white shadow-sm flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`${getInitialColor(selectedThread.id)} text-white rounded-full w-12 h-12 flex items-center justify-center text-base font-semibold relative`}>
                        {selectedThread.avatar}
                        {selectedThread.online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">{selectedThread.name}</h2>
                        <p className="text-sm text-gray-600">{formatThreadTime(selectedThread.time)}</p>
                        {selectedThread.online && <p className="text-xs text-green-600 font-medium">Online now</p>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages - scrollable container */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.fromAdmin ? "justify-end" : "justify-start"}`}>
                      <div className={`flex gap-0 items-end ${msg.fromAdmin ? "flex-row-reverse" : ""}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${msg.fromAdmin ? "bg-gray-700" : getInitialColor(selectedThread.id)}`}>
                          {msg.fromAdmin ? "AD" : selectedThread.avatar}
                        </div>
                        <div className={`flex gap-1 items-end ${msg.fromAdmin ? "flex-row-reverse" : ""}`}>
                          <p className={`text-xs text-gray-500 flex-shrink-0 ${msg.fromAdmin ? "mr-1" : "ml-1"}`}>
                            {msg.time}
                          </p>
                          <div className={`max-w-sm px-3 py-1.5 rounded-lg text-sm leading-relaxed ${msg.fromAdmin ? "bg-yellow-600 text-white rounded-br-none" : "bg-white border border-gray-200 text-gray-900 rounded-bl-none"}`}>
                            {msg.content.includes('![Product Image](') ? (
                              <div className="space-y-2">
                                <p>{sanitizeMessage(msg.content.split('\n\n![Product Image](')[0])}</p>
                                {(() => {
                                  const imageUrlMatch = msg.content.match(/!\[Product Image\]\((.*?)\)/);
                                  const imageUrl = imageUrlMatch?.[1];
                                  // Check if URL is valid: should have http(s) and an extension
                                  const isValidUrl = imageUrl && (imageUrl.includes('http') || imageUrl.includes('public/')) && 
                                    /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(imageUrl);
                                  return isValidUrl ? (
                                    <img
                                      src={imageUrl}
                                      alt="Product"
                                      title="Open full image"
                                      className="w-[60px] h-[60px] object-contain rounded-lg border-2 border-gray-300 cursor-pointer"
                                      onClick={() => window.open(imageUrl, '_blank')}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <p className="text-xs opacity-75">Product image (unavailable)</p>
                                  );
                                })()}
                              </div>
                            ) : (
                              <p>{sanitizeMessage(msg.content)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message input - sticky at bottom */}
                <div className="px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0 sticky bottom-0 z-10 shadow-lg">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Write a professional reply... (Enter to send)"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleSend}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 placeholder:text-gray-500"
                    />
                    <button
                      onClick={handleSend}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <p>Select a conversation to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
