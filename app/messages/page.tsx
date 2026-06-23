"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import Link from "next/link";
import { useUserAuth } from "../../lib/useUserAuth";
import UserAccountShell from "../components/UserAccountShell";

// Prevent static prerendering since this page requires runtime user auth
export const dynamic = 'force-dynamic';

interface ChatMessage {
  id: string;
  fromAdmin: boolean;
  content: string;
  time: string;
}

function MessagesContent() {
  const { user, loading: authLoading } = useUserAuth();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [productInfo, setProductInfo] = useState<{name: string, price: number, imageUrl?: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!user) return;

    loadMessages(user.email);

    // Check for product ID in URL
    const productId = searchParams.get('productId');
    if (productId) {
      fetchProductInfo(productId);
    }
  }, [user, searchParams]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`messages-${user.email}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_email=eq.${user.email}`,
        },
        () => {
          loadMessages(user.email);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const loadMessages = async (email: string) => {
    try {
      const response = await fetch(`/api/messages/thread?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        setChatMessages(data);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductInfo = async (productId: string) => {
    try {
      const response = await fetch(`/api/debug/products?id=${productId}`);
      if (response.ok) {
        const product = await response.json();
        // console.log('[MESSAGES] Fetched product:', product); // Removed for security
        if (product && product.name && product.price) {
          let img = product.image_url;
          if (img) {
            img = img.replace(/\(/g, '%28').replace(/\)/g, '%29');
          }
          setProductInfo({ 
            name: product.name, 
            price: product.price,
            imageUrl: img 
          });
        }
      } else {
        console.error('[MESSAGES] Failed to fetch product:', response.status);
      }
    } catch (error) {
      console.error("Failed to fetch product info:", error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = async (e: any, customMessage?: string) => {
    const isEnter = e?.key === 'Enter' && !e?.shiftKey;
    const isClick = e?.type === 'click' || !!customMessage;

    const messageToSend = customMessage || newMessage.trim();

    if ((isEnter || isClick) && messageToSend && user && !sending) {
      const messageContent = messageToSend;
      if (!customMessage) setNewMessage("");
      setSending(true);

      // Optimistically add message
      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        fromAdmin: false,
        content: messageContent,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, tempMessage]);

      try {
        const response = await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            content: messageContent,
          }),
        });

        if (!response.ok) {
          setChatMessages((prev) => prev.filter(m => m.id !== tempMessage.id));
          console.error("Failed to send message");
        }
      } catch (error) {
        setChatMessages((prev) => prev.filter(m => m.id !== tempMessage.id));
        console.error("Failed to send message:", error);
      } finally {
        setSending(false);
        setProductInfo(null);
      }

      e?.preventDefault?.();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow sticky top-0 z-50 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="text-xl font-bold text-gray-900">MV Fashion Accessories</div>
              <Link href="/login" className="text-yellow-700 hover:text-yellow-800">Login to Chat</Link>
            </div>
          </div>
        </nav>
        <div className="max-w-4xl mx-auto p-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Customer Support</h1>
            <p className="text-gray-600 mb-6">Please log in to access your chat with our support team.</p>
            <Link href="/login" className="bg-yellow-700 text-white px-6 py-3 rounded-lg hover:bg-yellow-800 inline-block">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <UserAccountShell
      userName={user.user_metadata?.full_name || user.email || "Account"}
      title="Messages"
      subtitle="Talk with customer support about orders, products, and delivery."
      maxWidth="max-w-6xl"
    >
      <div className="flex min-h-[calc(100vh-18rem)] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-yellow-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading messages...</p>
              </div>
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">💬</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">How can we help?</h2>
                <p className="text-gray-600 text-sm">Send us a message and our support team will respond shortly.</p>
              </div>
            </div>
          ) : (
            chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.fromAdmin ? 'justify-start' : 'justify-end'} mb-3`}
              >
                <div
                  className={`max-w-[85vw] sm:max-w-sm px-4 py-2 rounded-2xl ${
                    message.fromAdmin
                      ? 'bg-white text-gray-900 rounded-bl-none border border-gray-200'
                      : 'bg-yellow-600 text-white rounded-br-none'
                  } shadow-sm`}
                >
                  <div className="text-sm leading-relaxed break-words">
                    {message.content.includes('![Product Image](') ? (
                      <div className="space-y-2">
                        <p>{message.content.split('\n\n![Product Image](')[0]}</p>
                        {(() => {
                          // extract URL more carefully, accounting for encoded parentheses
                          const markdownStart = message.content.indexOf('![Product Image](');
                          let imageUrl: string | undefined;
                          if (markdownStart !== -1) {
                            // find closing paren after start
                            let idx = markdownStart + '![Product Image]('.length;
                            let parenCount = 0;
                            while (idx < message.content.length) {
                              const ch = message.content[idx];
                              if (ch === ')') {
                                if (parenCount === 0) break;
                                parenCount--;
                              } else if (ch === '(') {
                                parenCount++;
                              }
                              idx++;
                            }
                            imageUrl = message.content.substring(markdownStart + '![Product Image]('.length, idx);
                          }

                          const isValidUrl = imageUrl && (imageUrl.includes('http') || imageUrl.includes('public/')) &&
                            /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(imageUrl);

                          if (isValidUrl) {
                            return (
                              <img
                                src={imageUrl!}
                                alt="Product"
                                title="Open full image"
                                className="w-[60px] h-[60px] object-contain rounded-lg border-2 border-gray-300 cursor-pointer"
                                onClick={() => window.open(imageUrl!, '_blank')}
                                onError={(e) => {
                                  // hide if cannot load
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            );
                          } else {
                            return <p className="text-xs opacity-75">Product image</p>;
                          }
                        })()}
                      </div>
                    ) : (
                      <p>{message.content}</p>
                    )}
                  </div>
                  <p className={`text-xs mt-2 opacity-70 font-medium`}>
                    {message.time}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Product Information Display */}
        {productInfo && (
          <div className="bg-yellow-50 border-t border-yellow-200 px-6 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                {productInfo.imageUrl && (
                  <img 
                    src={productInfo.imageUrl} 
                    alt={productInfo.name}
                    className="w-8 h-8 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">Product:</span> {productInfo.name}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">Price:</span> ${productInfo.price}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  let message = `Hi, I'm interested in "${productInfo.name}" priced at $${productInfo.price}. `;
                  if (productInfo.imageUrl) {
                    // ensure URL is safe (encode parentheses which break markdown parsing)
                    const safeUrl = productInfo.imageUrl
                      .replace(/\(/g, '%28')
                      .replace(/\)/g, '%29');
                    message += `\n\n![Product Image](${safeUrl})`;
                  }
                  handleSend({ type: 'click' }, message);
                }}
                className="flex-shrink-0 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
                Send
              </button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 px-4 py-4 sm:px-6 sm:py-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend({ type: 'click' });
            }}
            className="flex gap-2 sm:gap-3"
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleSend}
              placeholder="Type your message..."
              disabled={sending}
              className="min-w-0 flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 sm:px-5 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 placeholder-gray-500 disabled:bg-gray-100 transition"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="bg-yellow-500 hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-sm"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
              <span className="hidden sm:inline text-sm">{sending ? 'Sending...' : 'Send'}</span>
            </button>
          </form>
        </div>
      </div>
    </UserAccountShell>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
