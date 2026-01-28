'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';

export default function LandingPagesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-3xl font-bold">Landing Page Builder</h1>
          <p className="text-muted-foreground mt-2">Create high-converting landing pages</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />New Page</Button>
      </div>
      <Card><CardContent className="pt-6 text-center"><FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><p>Landing page builder interface</p></CardContent></Card>
    </div>
  );
}
