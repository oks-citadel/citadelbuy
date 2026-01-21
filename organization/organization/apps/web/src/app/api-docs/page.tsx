'use client';

import Link from 'next/link';
import { Code, Key, Book, Zap, Shield, Terminal, ArrowRight, Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

const endpoints = [
  { method: 'GET', path: '/products', description: 'List all products with pagination and filters' },
  { method: 'GET', path: '/products/{id}', description: 'Get a single product by ID' },
  { method: 'GET', path: '/categories', description: 'List all product categories' },
  { method: 'POST', path: '/orders', description: 'Create a new order' },
  { method: 'GET', path: '/orders/{id}', description: 'Get order details and status' },
  { method: 'POST', path: '/cart', description: 'Add items to cart' },
];

const features = [
  { icon: Zap, title: 'Fast & Reliable', description: '99.9% uptime with global edge caching' },
  { icon: Shield, title: 'Secure', description: 'OAuth 2.0 authentication and rate limiting' },
  { icon: Book, title: 'Well Documented', description: 'Comprehensive docs with examples' },
  { icon: Terminal, title: 'Developer Friendly', description: 'SDKs for popular languages' },
];

const codeExample = `// Install the SDK
npm install @broxiva/api

// Initialize the client
import { BroxivaClient } from '@broxiva/api';

const client = new BroxivaClient({
  apiKey: 'your_api_key_here'
});

// Fetch products
const products = await client.products.list({
  category: 'electronics',
  limit: 10
});

console.log(products);`;

export default function ApiDocsPage() {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(codeExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <BroxivaBackground variant="default">
      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bx-bg-2 border border-[var(--bx-border)] mb-6">
              <Code className="w-4 h-4 text-bx-cyan" />
              <span className="text-sm font-medium text-bx-text">Developer Platform</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-bx-text">Broxiva </span>
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, var(--bx-pink) 0%, var(--bx-violet) 50%, var(--bx-cyan) 100%)' }}>
                API
              </span>
            </h1>
            <p className="text-bx-text-muted text-lg max-w-2xl mx-auto">
              Build powerful integrations with our RESTful API. Access products, orders, and more.
            </p>
            <div className="flex gap-4 justify-center mt-8">
              <Button size="lg" className="bg-gradient-to-r from-bx-pink via-bx-violet to-bx-cyan text-white">
                <Key className="w-4 h-4 mr-2" />
                Get API Key
              </Button>
              <Button size="lg" variant="outline">
                <Book className="w-4 h-4 mr-2" />
                View Docs
              </Button>
            </div>
          </div>

          <div className="max-w-5xl mx-auto space-y-12">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="bg-bx-bg-2 border-[var(--bx-border)]">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-bx-bg-3 flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="w-6 h-6 text-bx-cyan" />
                    </div>
                    <h3 className="font-semibold text-bx-text mb-2">{feature.title}</h3>
                    <p className="text-sm text-bx-text-muted">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <Terminal className="w-5 h-5 text-bx-violet" />
                  Quick Start
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="p-4 rounded-xl bg-slate-900 text-slate-300 text-sm overflow-x-auto">
                    <code>{codeExample}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 text-slate-400 hover:text-white"
                    onClick={copyCode}
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="text-bx-text">API Endpoints</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {endpoints.map((endpoint) => (
                    <div key={endpoint.path} className="flex items-center gap-4 p-3 rounded-xl bg-bx-bg-3">
                      <span className={`px-2 py-1 rounded text-xs font-mono font-bold ${
                        endpoint.method === 'GET' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {endpoint.method}
                      </span>
                      <code className="text-bx-text font-mono text-sm">{endpoint.path}</code>
                      <span className="text-sm text-bx-text-muted ml-auto hidden sm:block">{endpoint.description}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="text-bx-text">Rate Limits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-bx-bg-3 text-center">
                    <p className="text-2xl font-bold text-bx-text">1,000</p>
                    <p className="text-sm text-bx-text-muted">Requests/minute (Free)</p>
                  </div>
                  <div className="p-4 rounded-xl bg-bx-bg-3 text-center">
                    <p className="text-2xl font-bold text-bx-pink">10,000</p>
                    <p className="text-sm text-bx-text-muted">Requests/minute (Pro)</p>
                  </div>
                  <div className="p-4 rounded-xl bg-bx-bg-3 text-center">
                    <p className="text-2xl font-bold text-bx-violet">Unlimited</p>
                    <p className="text-sm text-bx-text-muted">Enterprise</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-bx-pink/10 via-bx-violet/10 to-bx-cyan/10 border-[var(--bx-border)]">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-bold text-bx-text mb-4">Need Help?</h3>
                <p className="text-bx-text-muted mb-6">Our developer support team is here to help you integrate.</p>
                <Button variant="outline">
                  Contact Developer Support
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </BroxivaBackground>
  );
}
