'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { useLiveChat } from '@/hooks/use-live-chat';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LiveChatWidgetProps {
  className?: string;
}

export function LiveChatWidget({ className }: LiveChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    isConnected,
    isConnecting,
    session,
    messages,
    typingUsers,
    error,
    connect,
    disconnect,
    startSession,
    sendMessage,
    setTyping,
    endSession,
  } = useLiveChat({
    autoConnect: false,
    onConnect: () => console.log('Connected to chat'),
    onDisconnect: () => console.log('Disconnected from chat'),
    onError: (err) => console.error('Chat error:', err),
  });

  useEffect(() => {
    if (isOpen && !isConnected && !isConnecting) {
      connect();
    }
  }, [isOpen, isConnected, isConnecting, connect]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartChat = (e: FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    startSession(guestName, guestEmail || undefined);
    setShowForm(false);
  };

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    sendMessage(message);
    setMessage('');
    setTyping(false);
  };

  const handleTyping = (value: string) => {
    setMessage(value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.trim()) {
      setTyping(true);
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 2000);
    } else {
      setTyping(false);
    }
  };

  const handleClose = () => {
    if (session && session.status !== 'ENDED') {
      const confirmClose = window.confirm('Are you sure you want to close the chat?');
      if (!confirmClose) return;
    }
    setIsOpen(false);
    disconnect();
    setShowForm(true);
    setGuestName('');
    setGuestEmail('');
    setMessage('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-110 hover:bg-blue-700',
          className
        )}
        aria-label="Open live chat"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-6 w-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-lg bg-white shadow-2xl',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-blue-600 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-400" />
          <span className="font-medium">Live Support</span>
        </div>
        <button
          onClick={handleClose}
          className="rounded p-1 hover:bg-blue-700"
          aria-label="Close chat"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {isConnecting ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="mt-2 text-sm text-gray-500">Connecting...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center p-4">
            <div className="text-center">
              <p className="text-sm text-red-500">{error}</p>
              <Button onClick={connect} className="mt-2" size="sm">
                Retry Connection
              </Button>
            </div>
          </div>
        ) : showForm && !session ? (
          <form onSubmit={handleStartChat} className="flex flex-1 flex-col p-4">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Start a Conversation</h3>
            <p className="mb-4 text-sm text-gray-500">
              Our team is here to help. Please enter your details to start chatting.
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email (optional)
                </label>
                <input
                  type="email"
                  id="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="your@email.com"
                />
              </div>
            </div>
            <Button type="submit" className="mt-auto w-full" disabled={!guestName.trim()}>
              Start Chat
            </Button>
          </form>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {session?.status === 'WAITING' && (
                <div className="rounded-lg bg-yellow-50 p-3 text-center text-sm text-yellow-800">
                  Please wait, a support agent will be with you shortly...
                </div>
              )}

              {messages.map((msg, index) => (
                <div
                  key={msg.id || index}
                  className={cn(
                    'flex',
                    msg.isFromStaff ? 'justify-start' : 'justify-end'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-lg px-3 py-2',
                      msg.isSystem
                        ? 'bg-gray-100 text-gray-600 text-center w-full max-w-full text-sm'
                        : msg.isFromStaff
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-blue-600 text-white'
                    )}
                  >
                    {msg.isFromStaff && msg.sender?.name && (
                      <p className="mb-1 text-xs font-medium text-gray-500">
                        {msg.sender.name}
                      </p>
                    )}
                    <p className="text-sm">{msg.message}</p>
                    <p
                      className={cn(
                        'mt-1 text-xs',
                        msg.isFromStaff ? 'text-gray-400' : 'text-blue-200'
                      )}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {typingUsers.length > 0 && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-gray-100 px-3 py-2">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {session?.status === 'ENDED' && (
                <div className="rounded-lg bg-gray-100 p-3 text-center text-sm text-gray-600">
                  This chat session has ended. Thank you for contacting us!
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {session?.status !== 'ENDED' && (
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2 border-t border-gray-200 p-3"
              >
                <input
                  type="text"
                  value={message}
                  onChange={(e) => handleTyping(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!message.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                    />
                  </svg>
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
