'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSupportStore } from '@/stores/account-store';
import { supportApi } from '@/services/account-api';
import {
  MessageSquare,
  HelpCircle,
  Search,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Book,
  Phone,
  Mail,
  MessageCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { KnowledgeBaseCategory, KnowledgeBaseArticle } from '@/types/extended';

const ticketCategories = [
  'Order Issue',
  'Shipping & Delivery',
  'Returns & Refunds',
  'Product Question',
  'Payment Issue',
  'Account Help',
  'Other',
];

export default function SupportPage() {
  const { tickets, isLoading, fetchTickets, createTicket } = useSupportStore();
  const [activeTab, setActiveTab] = useState<'help' | 'tickets' | 'new-ticket'>('help');
  const [kbCategories, setKbCategories] = useState<KnowledgeBaseCategory[]>([]);
  const [kbArticles, setKbArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    category: ticketCategories[0],
    orderId: '',
  });

  useEffect(() => {
    fetchTickets();
    loadKnowledgeBase();
  }, [fetchTickets]);

  const loadKnowledgeBase = async () => {
    try {
      const [categoriesData, articlesData] = await Promise.all([
        supportApi.getCategories(),
        supportApi.getArticles({ limit: 10 }),
      ]);
      setKbCategories(categoriesData || []);
      setKbArticles(articlesData || []);
    } catch (error) {
      console.error('Failed to load knowledge base');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const data = await supportApi.getArticles({ search: searchQuery });
      setKbArticles(data || []);
    } catch (error) {
      console.error('Search failed');
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject || !newTicket.description) {
      alert('Please fill in all required fields');
      return;
    }
    await createTicket({
      subject: newTicket.subject,
      description: newTicket.description,
      category: newTicket.category,
    });
    setNewTicket({
      subject: '',
      description: '',
      category: ticketCategories[0],
      orderId: '',
    });
    setActiveTab('tickets');
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      OPEN: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      WAITING_CUSTOMER: 'bg-orange-100 text-orange-800',
      RESOLVED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800',
    };
    return statusStyles[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadge = (priority: string) => {
    const priorityStyles: Record<string, string> = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-orange-100 text-orange-800',
      URGENT: 'bg-red-100 text-red-800',
    };
    return priorityStyles[priority] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
        <p className="text-gray-600 mt-1">
          Get help with your orders, account, and more
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-2">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: 'help', label: 'Help Center', icon: HelpCircle },
            { id: 'tickets', label: 'My Tickets', icon: MessageSquare },
            { id: 'new-ticket', label: 'New Ticket', icon: Plus },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className="whitespace-nowrap"
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Help Center Tab */}
      {activeTab === 'help' && (
        <div className="space-y-6">
          {/* Search */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                How can we help you?
              </h2>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search for help articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch}>Search</Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: MessageCircle, label: 'Live Chat', desc: 'Chat with us', action: 'chat' },
              { icon: Phone, label: 'Call Us', desc: '1-800-123-4567', action: 'call' },
              { icon: Mail, label: 'Email', desc: 'support@citadelbuy.com', action: 'email' },
              { icon: Book, label: 'FAQ', desc: 'Common questions', action: 'faq' },
            ].map((item) => (
              <Card
                key={item.label}
                className="cursor-pointer hover:border-primary/50 transition-colors"
              >
                <CardContent className="p-4 text-center">
                  <item.icon className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Help Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Browse by Topic</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(kbCategories.length > 0 ? kbCategories : [
                  { id: '1', name: 'Orders & Shipping', slug: 'orders', articleCount: 12 },
                  { id: '2', name: 'Returns & Refunds', slug: 'returns', articleCount: 8 },
                  { id: '3', name: 'Payments', slug: 'payments', articleCount: 6 },
                  { id: '4', name: 'Account & Security', slug: 'account', articleCount: 10 },
                  { id: '5', name: 'Products', slug: 'products', articleCount: 15 },
                  { id: '6', name: 'Promotions', slug: 'promotions', articleCount: 5 },
                ]).map((category) => (
                  <Link
                    key={category.id}
                    href={`/help/${category.slug}`}
                    className="p-4 rounded-lg border border-gray-200 hover:border-primary/50 hover:bg-gray-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900">{category.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {category.articleCount} articles
                    </p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Popular Articles */}
          <Card>
            <CardHeader>
              <CardTitle>Popular Articles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(kbArticles.length > 0 ? kbArticles : [
                  { id: '1', title: 'How to track my order', slug: 'track-order' },
                  { id: '2', title: 'Return policy and process', slug: 'return-policy' },
                  { id: '3', title: 'Payment methods accepted', slug: 'payment-methods' },
                  { id: '4', title: 'How to change my password', slug: 'change-password' },
                  { id: '5', title: 'Shipping times and costs', slug: 'shipping-info' },
                ]).slice(0, 5).map((article) => (
                  <Link
                    key={article.id}
                    href={`/help/articles/${article.slug}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-gray-700 hover:text-primary">
                      {article.title}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* My Tickets Tab */}
      {activeTab === 'tickets' && (
        <div className="space-y-6">
          {tickets.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No support tickets
                </h3>
                <p className="text-gray-500 mb-6">
                  You haven't created any support tickets yet
                </p>
                <Button onClick={() => setActiveTab('new-ticket')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Ticket
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <Card key={ticket.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getStatusBadge(ticket.status)}>
                            {ticket.status.replace(/_/g, ' ')}
                          </Badge>
                          <Badge className={getPriorityBadge(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </div>
                        <Link
                          href={`/account/support/tickets/${ticket.id}`}
                          className="font-medium text-gray-900 hover:text-primary"
                        >
                          {ticket.subject}
                        </Link>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {ticket.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>#{ticket.ticketNumber}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </span>
                          <span>{ticket.messages.length} messages</span>
                        </div>
                      </div>
                      <Link href={`/account/support/tickets/${ticket.id}`}>
                        <Button variant="outline" size="sm">
                          View
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Ticket Tab */}
      {activeTab === 'new-ticket' && (
        <Card>
          <CardHeader>
            <CardTitle>Create Support Ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={newTicket.category}
                onChange={(e) =>
                  setNewTicket({ ...newTicket, category: e.target.value })
                }
              >
                {ticketCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <Input
                placeholder="Brief description of your issue"
                value={newTicket.subject}
                onChange={(e) =>
                  setNewTicket({ ...newTicket, subject: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order ID (optional)
              </label>
              <Input
                placeholder="If related to an order, enter the order ID"
                value={newTicket.orderId}
                onChange={(e) =>
                  setNewTicket({ ...newTicket, orderId: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[150px]"
                placeholder="Please provide as much detail as possible about your issue..."
                value={newTicket.description}
                onChange={(e) =>
                  setNewTicket({ ...newTicket, description: e.target.value })
                }
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setActiveTab('help')}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateTicket}>
                <Send className="w-4 h-4 mr-2" />
                Submit Ticket
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact Info */}
      <Card className="bg-gray-50">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900">Need immediate help?</h3>
              <p className="text-sm text-gray-600 mt-1">
                Our support team is available 24/7
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                <Phone className="w-4 h-4 mr-2" />
                Call Us
              </Button>
              <Button>
                <MessageCircle className="w-4 h-4 mr-2" />
                Live Chat
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
