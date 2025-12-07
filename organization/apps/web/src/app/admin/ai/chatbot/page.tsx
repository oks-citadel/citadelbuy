'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MessageCircle,
  ChevronRight,
  Home,
  Bot,
  Settings,
  Save,
  RefreshCw,
  BarChart3,
  Users,
  Clock,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Zap,
  Globe,
  Brain,
  ThumbsUp,
  ThumbsDown,
  Activity,
  Timer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

export default function AIChatbotPage() {
  const [enabled, setEnabled] = useState(true);
  const [autoRespond, setAutoRespond] = useState(true);
  const [learningMode, setLearningMode] = useState(true);
  const [handoffEnabled, setHandoffEnabled] = useState(true);
  const [multiLanguage, setMultiLanguage] = useState(true);
  const [sentimentAnalysis, setSentimentAnalysis] = useState(true);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(150);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.85);

  const stats = {
    totalConversations: 8920,
    activeChats: 43,
    avgResponseTime: '1.2s',
    resolutionRate: 87.5,
    satisfaction: 4.6,
  };

  const conversationTopics = [
    { topic: 'Order Status', count: 2341, percentage: 26 },
    { topic: 'Product Info', count: 1962, percentage: 22 },
    { topic: 'Returns/Refunds', count: 1606, percentage: 18 },
    { topic: 'Shipping', count: 1427, percentage: 16 },
    { topic: 'Payment Issues', count: 1070, percentage: 12 },
    { topic: 'Other', count: 514, percentage: 6 },
  ];

  const performanceMetrics = [
    { metric: 'Accuracy', value: 92.3, target: 90, color: 'bg-green-500' },
    { metric: 'Response Time', value: 98, target: 95, color: 'bg-blue-500' },
    { metric: 'First Contact Resolution', value: 87.5, target: 85, color: 'bg-purple-500' },
    { metric: 'Handoff Rate', value: 8.2, target: 10, color: 'bg-orange-500', inverse: true },
  ];

  const recentConversations = [
    {
      id: 'CHAT-4521',
      topic: 'Order Status',
      sentiment: 'neutral',
      messages: 6,
      resolved: true,
      time: '2 min ago',
    },
    {
      id: 'CHAT-4520',
      topic: 'Product Question',
      sentiment: 'positive',
      messages: 4,
      resolved: true,
      time: '8 min ago',
    },
    {
      id: 'CHAT-4519',
      topic: 'Refund Request',
      sentiment: 'negative',
      messages: 12,
      resolved: false,
      time: '15 min ago',
    },
    {
      id: 'CHAT-4518',
      topic: 'Shipping Inquiry',
      sentiment: 'neutral',
      messages: 5,
      resolved: true,
      time: '22 min ago',
    },
  ];

  const languages = [
    { code: 'en', name: 'English', enabled: true, confidence: 98 },
    { code: 'es', name: 'Spanish', enabled: true, confidence: 94 },
    { code: 'fr', name: 'French', enabled: true, confidence: 91 },
    { code: 'de', name: 'German', enabled: false, confidence: 88 },
    { code: 'zh', name: 'Chinese', enabled: false, confidence: 85 },
  ];

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground transition-colors">
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/admin/ai" className="hover:text-foreground transition-colors">
          AI Management
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">AI Chatbot</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Chatbot</h1>
            <p className="text-muted-foreground">
              Intelligent customer support assistant powered by LLM
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retrain Model
          </Button>
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-lg border ${enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {enabled ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <p className="font-semibold">
                {enabled ? 'Chatbot Active' : 'Chatbot Inactive'}
              </p>
              <p className="text-sm text-muted-foreground">
                {enabled
                  ? `Currently handling ${stats.activeChats} active conversations`
                  : 'Enable to start handling customer inquiries'}
              </p>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversations</p>
                <p className="text-2xl font-bold">{stats.totalConversations.toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-1">+18% this month</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-blue-600" />
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
                <p className="text-xs text-muted-foreground mt-1">Right now</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Activity className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold">{stats.avgResponseTime}</p>
                <p className="text-xs text-green-600 mt-1">-0.3s faster</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Timer className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolution Rate</p>
                <p className="text-2xl font-bold">{stats.resolutionRate}%</p>
                <p className="text-xs text-green-600 mt-1">+2.1% improvement</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Satisfaction</p>
                <p className="text-2xl font-bold">{stats.satisfaction}/5</p>
                <p className="text-xs text-green-600 mt-1">Excellent rating</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <ThumbsUp className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Chatbot Configuration
            </CardTitle>
            <CardDescription>Configure AI chatbot behavior and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 pb-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-respond">Auto-respond Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically respond to customer inquiries
                  </p>
                </div>
                <Switch
                  id="auto-respond"
                  checked={autoRespond}
                  onCheckedChange={setAutoRespond}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="learning">Continuous Learning</Label>
                  <p className="text-xs text-muted-foreground">
                    Learn from conversations to improve responses
                  </p>
                </div>
                <Switch
                  id="learning"
                  checked={learningMode}
                  onCheckedChange={setLearningMode}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="handoff">Human Handoff</Label>
                  <p className="text-xs text-muted-foreground">
                    Transfer complex queries to human agents
                  </p>
                </div>
                <Switch
                  id="handoff"
                  checked={handoffEnabled}
                  onCheckedChange={setHandoffEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="multilang">Multi-language Support</Label>
                  <p className="text-xs text-muted-foreground">Enable multiple languages</p>
                </div>
                <Switch
                  id="multilang"
                  checked={multiLanguage}
                  onCheckedChange={setMultiLanguage}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sentiment">Sentiment Analysis</Label>
                  <p className="text-xs text-muted-foreground">Detect customer emotions</p>
                </div>
                <Switch
                  id="sentiment"
                  checked={sentimentAnalysis}
                  onCheckedChange={setSentimentAnalysis}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">
                  Response Creativity: {temperature.toFixed(1)}
                </Label>
                <input
                  id="temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Lower values are more focused, higher values are more creative
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-tokens">Max Response Length: {maxTokens} tokens</Label>
                <input
                  id="max-tokens"
                  type="range"
                  min="50"
                  max="500"
                  step="10"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confidence">
                  Confidence Threshold: {(confidenceThreshold * 100).toFixed(0)}%
                </Label>
                <input
                  id="confidence"
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Handoff to human if confidence is below threshold
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance & Topics */}
        <div className="space-y-6">
          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
              <CardDescription>Real-time chatbot performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceMetrics.map((metric) => (
                  <div key={metric.metric}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{metric.metric}</span>
                      <span className="text-sm text-muted-foreground">
                        {metric.value}% {metric.inverse ? '<' : '>'} {metric.target}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${metric.color} rounded-full transition-all`}
                        style={{ width: `${metric.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Language Support */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Language Support
              </CardTitle>
              <CardDescription>Enabled languages and confidence levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {languages.map((lang) => (
                  <div
                    key={lang.code}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <Switch checked={lang.enabled} />
                      <div>
                        <p className="font-medium text-sm">{lang.name}</p>
                        <p className="text-xs text-muted-foreground">{lang.code.toUpperCase()}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{lang.confidence}%</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Conversation Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Conversation Topics
          </CardTitle>
          <CardDescription>Most common topics handled by the chatbot</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {conversationTopics.map((topic) => (
              <div key={topic.topic}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{topic.topic}</span>
                  <span className="text-sm text-muted-foreground">
                    {topic.count.toLocaleString()} ({topic.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${topic.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Conversations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Recent Conversations
          </CardTitle>
          <CardDescription>Latest chatbot interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentConversations.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{conv.id}</span>
                      <Badge className={getSentimentColor(conv.sentiment)} variant="outline">
                        {conv.sentiment}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{conv.topic}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-medium">{conv.messages} messages</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {conv.time}
                    </p>
                  </div>
                  {conv.resolved ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-center">
            <Button variant="outline">View All Conversations</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
