'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Minimize2,
  Maximize2,
  Mic,
  MicOff,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  ShoppingCart,
  Eye,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { chatbotService } from '@/services/ai';
import { ChatMessage, ChatAction, Product } from '@/types';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import Link from 'next/link';

export function ChatWidget() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = React.useState<string[]>([]);
  const [isListening, setIsListening] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { user, isAuthenticated } = useAuthStore();
  const { addItem } = useCartStore();

  // Initialize chat session
  React.useEffect(() => {
    if (isOpen && !sessionId) {
      initializeSession();
    }
  }, [isOpen, sessionId]);

  // Scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeSession = async () => {
    try {
      const { sessionId: newSessionId, greeting } = await chatbotService.startSession(
        user?.id
      );
      setSessionId(newSessionId);
      setMessages([greeting]);

      const suggestions = await chatbotService.getSuggestedQuestions({
        page: window.location.pathname,
      });
      setSuggestedQuestions(suggestions);
    } catch (error) {
      console.error('Failed to initialize chat session:', error);
      setMessages([
        {
          id: 'error',
          role: 'assistant',
          content: "Hi! I'm having trouble connecting right now. Please try again later.",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !sessionId) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await chatbotService.sendMessage(content, sessionId, {
        userId: user?.id,
        currentPage: window.location.pathname,
      });

      setMessages((prev) => [...prev, response]);

      // Update suggested questions based on context
      if (response.metadata?.suggestions) {
        setSuggestedQuestions(response.metadata.suggestions);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: "I'm sorry, I couldn't process your request. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const handleFeedback = async (messageId: string, feedback: 'helpful' | 'not_helpful') => {
    if (!sessionId) return;
    try {
      await chatbotService.provideFeedback(sessionId, messageId, feedback);
    } catch (error) {
      console.error('Failed to send feedback:', error);
    }
  };

  const handleAction = async (action: ChatAction) => {
    switch (action.type) {
      case 'ADD_TO_CART':
        if (action.payload.product) {
          await addItem(action.payload.product as Product);
        }
        break;
      case 'VIEW_PRODUCT':
        window.location.href = `/products/${action.payload.productId}`;
        break;
      case 'SEARCH':
        window.location.href = `/search?q=${encodeURIComponent(action.payload.query as string)}`;
        break;
      case 'NAVIGATE':
        window.location.href = action.payload.url as string;
        break;
    }
  };

  const startVoiceInput = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser');
      return;
    }

    setIsListening(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const resetChat = async () => {
    if (sessionId) {
      await chatbotService.endSession(sessionId);
    }
    setSessionId(null);
    setMessages([]);
    setSuggestedQuestions([]);
    initializeSession();
  };

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-[10px] font-bold flex items-center justify-center">
          AI
        </span>
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className={cn(
          'fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col overflow-hidden',
          isExpanded
            ? 'inset-4 md:inset-8'
            : isMinimized
              ? 'bottom-6 right-6 w-72 h-14'
              : 'bottom-6 right-6 w-96 h-[500px]'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <MessageCircle className="h-4 w-4" />
            </div>
            {!isMinimized && (
              <div>
                <h3 className="font-semibold text-sm">AI Shopping Assistant</h3>
                <p className="text-xs opacity-80">Powered by Broxiva AI</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!isMinimized && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={resetChat}
                  className="hover:bg-primary-foreground/20"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="hover:bg-primary-foreground/20"
                >
                  {isExpanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="hover:bg-primary-foreground/20"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsOpen(false)}
              className="hover:bg-primary-foreground/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat content */}
        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-lg px-4 py-2',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                    {/* Product recommendations */}
                    {message.metadata?.products && message.metadata.products.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.metadata.products.slice(0, 3).map((product) => (
                          <Link
                            key={product.id}
                            href={`/products/${product.id}`}
                            className="flex items-center gap-3 p-2 bg-background rounded-md hover:bg-accent transition-colors"
                          >
                            <img
                              src={product.images[0]?.url || '/placeholder.jpg'}
                              alt={product.name}
                              className="h-12 w-12 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{product.name}</p>
                              <p className="text-sm text-primary font-semibold">
                                ${product.price}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    {message.metadata?.actions && message.metadata.actions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.metadata.actions.map((action, index) => (
                          <Button
                            key={index}
                            variant="secondary"
                            size="sm"
                            onClick={() => handleAction(action)}
                            className="h-7 text-xs"
                          >
                            {action.type === 'ADD_TO_CART' && <ShoppingCart className="h-3 w-3 mr-1" />}
                            {action.type === 'VIEW_PRODUCT' && <Eye className="h-3 w-3 mr-1" />}
                            {action.type === 'SEARCH' && <Search className="h-3 w-3 mr-1" />}
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Feedback for assistant messages */}
                    {message.role === 'assistant' && message.id !== 'error' && (
                      <div className="mt-2 flex items-center gap-1">
                        <button
                          onClick={() => handleFeedback(message.id, 'helpful')}
                          className="p-1 rounded hover:bg-background/50 transition-colors"
                        >
                          <ThumbsUp className="h-3 w-3 text-muted-foreground hover:text-primary" />
                        </button>
                        <button
                          onClick={() => handleFeedback(message.id, 'not_helpful')}
                          className="p-1 rounded hover:bg-background/50 transition-colors"
                        >
                          <ThumbsDown className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <div className="dot-loader text-muted-foreground">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested questions */}
            {suggestedQuestions.length > 0 && messages.length <= 2 && (
              <div className="px-4 pb-2">
                <p className="text-xs text-muted-foreground mb-2">Suggested questions:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.slice(0, 3).map((question, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => handleSuggestedQuestion(question)}
                    >
                      {question}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Input form */}
            <form onSubmit={handleSubmit} className="p-4 border-t">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={startVoiceInput}
                  className={cn(isListening && 'text-destructive')}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4 animate-pulse" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me anything..."
                  disabled={isLoading || isListening}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon-sm"
                  disabled={!inputValue.trim() || isLoading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
