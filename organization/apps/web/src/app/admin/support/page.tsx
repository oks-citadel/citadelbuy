'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Phone,
  Mail,
  Filter,
  Search,
  MoreHorizontal,
  Send,
  Paperclip,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'RESOLVED' | 'CLOSED';
type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type ChatStatus = 'WAITING' | 'ACTIVE' | 'ENDED';

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  lastUpdated: string;
  messageCount: number;
  assignedTo?: string;
}

interface LiveChat {
  id: string;
  guestName: string;
  guestEmail?: string;
  status: ChatStatus;
  startedAt: string;
  messageCount: number;
  waitingTime: string;
  assignedTo?: string;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [liveChats, setLiveChats] = useState<LiveChat[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedChat, setSelectedChat] = useState<LiveChat | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSupportData();
  }, []);

  const loadSupportData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load tickets and live chat sessions from backend
      const [ticketsResponse, chatsResponse] = await Promise.all([
        apiClient.get('/support/tickets'),
        apiClient.get('/support/chat/sessions/active'),
      ]);

      // Map tickets to frontend format
      const mappedTickets: Ticket[] = ticketsResponse.data.map((ticket: any) => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        customerName: ticket.user?.name || ticket.guestName || 'Guest',
        customerEmail: ticket.user?.email || ticket.guestEmail || '',
        createdAt: ticket.createdAt,
        lastUpdated: ticket.updatedAt,
        messageCount: ticket._count?.messages || 0,
        assignedTo: ticket.assignedTo?.name,
      }));

      // Map live chat sessions to frontend format
      const mappedChats: LiveChat[] = chatsResponse.data.map((chat: any) => {
        const startTime = new Date(chat.startedAt);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));

        return {
          id: chat.id,
          guestName: chat.user?.name || chat.guestName || 'Guest',
          guestEmail: chat.user?.email || chat.guestEmail,
          status: chat.status,
          startedAt: chat.startedAt,
          messageCount: chat._count?.messages || 0,
          waitingTime: `${diffMinutes} min`,
          assignedTo: chat.assignedTo?.name,
        };
      });

      setTickets(mappedTickets);
      setLiveChats(mappedChats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load support data';
      setError(errorMessage);
      toast.error(errorMessage);
      // Set empty arrays on error to prevent UI issues
      setTickets([]);
      setLiveChats([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    const styles: Record<TicketStatus, string> = {
      OPEN: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      WAITING_FOR_CUSTOMER: 'bg-purple-100 text-purple-800',
      RESOLVED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800',
    };
    return styles[status];
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    const styles: Record<TicketPriority, string> = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-orange-100 text-orange-800',
      URGENT: 'bg-red-100 text-red-800',
    };
    return styles[priority];
  };

  const getChatStatusBadge = (status: ChatStatus) => {
    const styles: Record<ChatStatus, string> = {
      WAITING: 'bg-yellow-100 text-yellow-800',
      ACTIVE: 'bg-green-100 text-green-800',
      ENDED: 'bg-gray-100 text-gray-800',
    };
    return styles[status];
  };

  const stats = {
    openTickets: tickets.filter((t) => t.status === 'OPEN').length,
    inProgress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    waitingChats: liveChats.filter((c) => c.status === 'WAITING').length,
    activeChats: liveChats.filter((c) => c.status === 'ACTIVE').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Support</h1>
          <p className="text-muted-foreground">
            Manage support tickets and live chat sessions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button>
            <MessageSquare className="h-4 w-4 mr-2" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Tickets</p>
                <p className="text-2xl font-bold">{stats.openTickets}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Waiting Chats</p>
                <p className="text-2xl font-bold">{stats.waitingChats}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Chats</p>
                <p className="text-2xl font-bold">{stats.activeChats}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tickets">
            Support Tickets
            {stats.openTickets > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                {stats.openTickets}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="live-chat">
            Live Chat
            {stats.waitingChats > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                {stats.waitingChats}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="knowledge-base">Knowledge Base</TabsTrigger>
        </TabsList>

        {/* Tickets Tab */}
        <TabsContent value="tickets">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Ticket List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle>Tickets</CardTitle>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search tickets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {tickets.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No support tickets found</p>
                      <p className="text-sm mt-2">Backend API integration pending</p>
                    </div>
                  ) : (
                  <div className="space-y-3">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedTicket?.id === ticket.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground">
                                {ticket.ticketNumber}
                              </span>
                              <Badge className={getPriorityBadge(ticket.priority)} variant="outline">
                                {ticket.priority}
                              </Badge>
                            </div>
                            <h3 className="font-medium mt-1">{ticket.subject}</h3>
                          </div>
                          <Badge className={getStatusBadge(ticket.status)} variant="outline">
                            {ticket.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {ticket.customerName}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              {ticket.messageCount}
                            </span>
                          </div>
                          <span>
                            {new Date(ticket.lastUpdated).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Ticket Detail */}
            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>
                    {selectedTicket ? selectedTicket.ticketNumber : 'Select a Ticket'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTicket ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">{selectedTicket.subject}</h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedTicket.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <Badge className={getStatusBadge(selectedTicket.status)} variant="outline">
                            {selectedTicket.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Priority</p>
                          <Badge className={getPriorityBadge(selectedTicket.priority)} variant="outline">
                            {selectedTicket.priority}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Assigned To</p>
                          <p className="font-medium">
                            {selectedTicket.assignedTo || 'Unassigned'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p className="font-medium">
                            {new Date(selectedTicket.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Customer Info</p>
                        <div className="space-y-2 text-sm">
                          <p className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {selectedTicket.customerName}
                          </p>
                          <p className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {selectedTicket.customerEmail}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t space-y-2">
                        <Button className="w-full">
                          <ArrowRight className="h-4 w-4 mr-2" />
                          View Full Ticket
                        </Button>
                        <Button variant="outline" className="w-full">
                          Assign to Me
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Select a ticket to view details
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Live Chat Tab */}
        <TabsContent value="live-chat">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Chat Sessions List */}
            <div>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Active Sessions</CardTitle>
                  <CardDescription>
                    {liveChats.filter((c) => c.status !== 'ENDED').length} chats in queue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {liveChats.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No active chat sessions</p>
                      <p className="text-sm mt-2">Backend API integration pending</p>
                    </div>
                  ) : (
                  <div className="space-y-3">
                    {liveChats.map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => setSelectedChat(chat)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedChat?.id === chat.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{chat.guestName}</span>
                          <Badge className={getChatStatusBadge(chat.status)} variant="outline">
                            {chat.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {chat.waitingTime}
                          </span>
                          <span>{chat.messageCount} messages</span>
                        </div>
                        {chat.status === 'WAITING' && (
                          <Button size="sm" className="w-full mt-2" disabled={isLoading}>
                            Accept Chat
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Chat Window */}
            <div className="lg:col-span-2">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="border-b pb-3">
                  {selectedChat ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedChat.guestName}</CardTitle>
                        <CardDescription>
                          {selectedChat.guestEmail || 'Guest user'}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon">
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm">
                          End Chat
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <CardTitle>Select a Chat</CardTitle>
                  )}
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4">
                  {selectedChat ? (
                    <div className="space-y-4">
                      {/* Sample messages */}
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-4 py-2 max-w-[70%]">
                          <p className="text-sm">Hello, I need help with my order.</p>
                          <span className="text-xs text-muted-foreground">11:30 AM</span>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[70%]">
                          <p className="text-sm">Hi! I'd be happy to help. Could you please provide your order number?</p>
                          <span className="text-xs opacity-70">11:31 AM</span>
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-4 py-2 max-w-[70%]">
                          <p className="text-sm">Sure, it's ORD-12345.</p>
                          <span className="text-xs text-muted-foreground">11:32 AM</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Select a chat session to start messaging
                    </div>
                  )}
                </CardContent>
                {selectedChat && selectedChat.status === 'ACTIVE' && (
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Input
                        placeholder="Type your message..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        className="flex-1"
                        disabled={isLoading}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && replyMessage.trim()) {
                            // Send message
                            setReplyMessage('');
                          }
                        }}
                      />
                      <Button disabled={!replyMessage.trim() || isLoading} isLoading={isLoading}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value="knowledge-base">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base Articles</CardTitle>
              <CardDescription>
                Manage help articles and FAQs for customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Knowledge Base Coming Soon</h3>
                <p className="text-muted-foreground mb-4">
                  Create and manage help articles to reduce support tickets.
                </p>
                <Button>Create First Article</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
