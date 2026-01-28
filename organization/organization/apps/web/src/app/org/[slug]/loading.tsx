import { Loader2 } from 'lucide-react';

export default function OrganizationLoading() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Loading organization...</p>
      </div>
    </div>
  );
}
