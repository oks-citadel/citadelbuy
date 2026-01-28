'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Plus } from 'lucide-react';

export default function EmailAutomationPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Automation</h1>
          <p className="text-muted-foreground mt-2">Automated email campaigns and workflows</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />New Campaign</Button>
      </div>
      <Card><CardContent className="pt-6 text-center"><Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><p>Email automation interface</p></CardContent></Card>
    </div>
  );
}
