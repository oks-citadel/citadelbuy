# API Integration Guide for Sanctions Screening Dashboard

This guide explains how to connect the frontend Sanctions Screening Dashboard to the backend API endpoints.

## Overview

The dashboard currently uses mock data. To connect it to real backend APIs, you'll need to replace the mock data functions with actual API calls.

## Required API Endpoints

### 1. GET /api/v1/compliance/screening

Fetch screening results with optional filters.

**URL**: `GET /api/v1/compliance/screening`

**Query Parameters**:
```typescript
{
  search?: string;        // Search term for name/email
  status?: string;        // CLEAR | FLAGGED | PENDING | all
  riskLevel?: string;     // LOW | MEDIUM | HIGH | CRITICAL | all
  dateFrom?: string;      // ISO date string
  dateTo?: string;        // ISO date string
  page?: number;          // Page number (1-indexed)
  limit?: number;         // Results per page (default: 10)
}
```

**Response**:
```typescript
{
  results: ScreeningResult[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

### 2. POST /api/v1/compliance/screen

Run a new screening check for an entity.

**URL**: `POST /api/v1/compliance/screen`

**Request Body**:
```typescript
{
  entityName: string;
  entityType: 'INDIVIDUAL' | 'BUSINESS';
  email?: string;
  country?: string;
  additionalInfo?: Record<string, any>;
}
```

**Response**:
```typescript
{
  id: string;
  status: 'success' | 'pending' | 'error';
  message: string;
  result: ScreeningResult;
}
```

### 3. GET /api/v1/compliance/sanctions

Get sanctioned entities and watchlist information.

**URL**: `GET /api/v1/compliance/sanctions`

**Response**:
```typescript
{
  watchlists: Array<{
    id: string;
    name: string;
    description: string;
    entries: number;
    lastUpdated: string;
    source: string;
  }>;
  totalEntries: number;
  lastSyncAt: string;
}
```

### 4. GET /api/v1/compliance/screening/:id

Get detailed information for a specific screening result.

**URL**: `GET /api/v1/compliance/screening/:id`

**Response**:
```typescript
{
  result: ScreeningResult;
  details: {
    matches: Array<{
      list: string;
      score: number;
      matchedFields: string[];
      entity: {
        name: string;
        type: string;
        aliases?: string[];
        country?: string;
        programs?: string[];
      };
    }>;
    history: Array<{
      timestamp: string;
      action: string;
      user: string;
      notes?: string;
    }>;
  };
}
```

## Implementation Steps

### Step 1: Create API Service

Create a new file: `/apps/web/src/services/compliance-service.ts`

```typescript
import { ScreeningResult } from '@/components/screening/ScreeningResultsTable';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class ComplianceService {
  /**
   * Fetch screening results with filters
   */
  static async getScreeningResults(params: {
    search?: string;
    status?: string;
    riskLevel?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    results: ScreeningResult[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== 'all') {
        queryParams.append(key, String(value));
      }
    });

    const response = await fetch(
      `${API_BASE_URL}/api/v1/compliance/screening?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch screening results: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Run a new screening check
   */
  static async runScreening(data: {
    entityName: string;
    entityType: 'INDIVIDUAL' | 'BUSINESS';
    email?: string;
    country?: string;
  }): Promise<ScreeningResult> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/compliance/screen`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to run screening: ${response.statusText}`);
    }

    const result = await response.json();
    return result.result;
  }

  /**
   * Get sanctioned entities and watchlists
   */
  static async getSanctionedEntities(): Promise<{
    watchlists: Array<{
      name: string;
      entries: number;
      lastUpdated: string;
    }>;
    totalEntries: number;
  }> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/compliance/sanctions`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch sanctions: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get detailed screening information
   */
  static async getScreeningDetails(id: string): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/compliance/screening/${id}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch screening details: ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Get authentication token from storage
 */
function getAuthToken(): string {
  // Replace with your actual token retrieval logic
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token') || '';
  }
  return '';
}
```

### Step 2: Update Sanctions Page

Update `/apps/web/src/app/admin/compliance/sanctions/page.tsx`:

**Find this section**:
```typescript
const [allResults, setAllResults] = useState<ScreeningResult[]>(generateMockResults());
```

**Replace with**:
```typescript
const [allResults, setAllResults] = useState<ScreeningResult[]>([]);
const [totalResults, setTotalResults] = useState(0);

// Fetch data on mount and when filters change
useEffect(() => {
  fetchScreeningResults();
}, [currentPage, statusFilter, riskLevelFilter, searchQuery]);

const fetchScreeningResults = async () => {
  setIsLoading(true);
  try {
    const data = await ComplianceService.getScreeningResults({
      search: searchQuery || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      riskLevel: riskLevelFilter !== 'all' ? riskLevelFilter : undefined,
      page: currentPage,
      limit: itemsPerPage,
    });

    setAllResults(data.results);
    setTotalResults(data.total);
  } catch (error) {
    console.error('Failed to fetch screening results:', error);
    // Show error toast
  } finally {
    setIsLoading(false);
  }
};
```

**Update handleNewScreening**:
```typescript
const handleNewScreening = async () => {
  if (!newEntityName.trim()) return;

  setIsLoading(true);
  try {
    const newResult = await ComplianceService.runScreening({
      entityName: newEntityName,
      entityType: newEntityType,
    });

    // Refresh the list
    await fetchScreeningResults();
    setShowNewScreeningDialog(false);
    setNewEntityName('');
    // Show success toast
  } catch (error) {
    console.error('Failed to run screening:', error);
    // Show error toast
  } finally {
    setIsLoading(false);
  }
};
```

**Update handleRefresh**:
```typescript
const handleRefresh = async () => {
  await fetchScreeningResults();
};
```

### Step 3: Update Compliance Dashboard

Update `/apps/web/src/app/admin/compliance/page.tsx`:

**Add data fetching**:
```typescript
const [metrics, setMetrics] = useState<ComplianceMetric[]>([]);
const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
const [watchlists, setWatchlists] = useState<any[]>([]);

useEffect(() => {
  fetchDashboardData();
}, []);

const fetchDashboardData = async () => {
  try {
    // Fetch screening statistics
    const screeningData = await ComplianceService.getScreeningResults({
      limit: 1000, // Get all for stats
    });

    // Calculate metrics
    const totalScreenings = screeningData.total;
    const clearCount = screeningData.results.filter(r => r.status === 'CLEAR').length;
    const flaggedCount = screeningData.results.filter(r => r.status === 'FLAGGED').length;
    const pendingCount = screeningData.results.filter(r => r.status === 'PENDING').length;

    // Update metrics state...

    // Fetch watchlists
    const sanctionsData = await ComplianceService.getSanctionedEntities();
    setWatchlists(sanctionsData.watchlists);

  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
  }
};
```

### Step 4: Environment Variables

Add to `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
# or for production:
# NEXT_PUBLIC_API_URL=https://api.citadelbuy.com
```

### Step 5: Error Handling

Add a toast notification system using shadcn/ui:

```bash
npx shadcn-ui@latest add toast
```

Then wrap your app with the Toaster component and use it for notifications:

```typescript
import { useToast } from '@/components/ui/use-toast';

const { toast } = useToast();

// On success
toast({
  title: 'Success',
  description: 'Screening completed successfully',
  variant: 'success',
});

// On error
toast({
  title: 'Error',
  description: 'Failed to run screening',
  variant: 'destructive',
});
```

## Authentication

The API service assumes you're using JWT tokens stored in localStorage. Update the `getAuthToken()` function if you use a different auth mechanism:

```typescript
// Example with HTTP-only cookies
function getAuthToken(): string {
  // Token is sent automatically with cookies
  return '';
}

// Example with auth store
import { useAuthStore } from '@/stores/auth-store';

function getAuthToken(): string {
  const { token } = useAuthStore.getState();
  return token || '';
}
```

## CORS Configuration

Ensure your backend API allows requests from your frontend domain:

```typescript
// Express.js example
app.use(cors({
  origin: ['http://localhost:3000', 'https://admin.citadelbuy.com'],
  credentials: true,
}));
```

## Rate Limiting

Consider implementing rate limiting on the client side:

```typescript
import { debounce } from 'lodash';

const debouncedSearch = debounce((query: string) => {
  setSearchQuery(query);
}, 300);
```

## Caching

Use React Query or SWR for better caching and data synchronization:

```bash
npm install @tanstack/react-query
```

```typescript
import { useQuery } from '@tanstack/react-query';

const { data, isLoading, error } = useQuery({
  queryKey: ['screening-results', filters],
  queryFn: () => ComplianceService.getScreeningResults(filters),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

## WebSocket Integration (Optional)

For real-time updates:

```typescript
useEffect(() => {
  const ws = new WebSocket('ws://localhost:3000/compliance');

  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    if (update.type === 'NEW_SCREENING') {
      // Refresh the list or add the new result
      fetchScreeningResults();
    }
  };

  return () => ws.close();
}, []);
```

## Testing

Test the integration with:

1. **Unit Tests**: Test the ComplianceService methods
2. **Integration Tests**: Test the API endpoints
3. **E2E Tests**: Test the full user flow

```typescript
// Example unit test
describe('ComplianceService', () => {
  it('should fetch screening results', async () => {
    const results = await ComplianceService.getScreeningResults({
      page: 1,
      limit: 10,
    });
    expect(results).toHaveProperty('results');
    expect(results).toHaveProperty('total');
  });
});
```

## Monitoring

Add monitoring for API calls:

```typescript
// Log API errors
const logError = (error: Error, context: string) => {
  console.error(`[${context}] Error:`, error);
  // Send to monitoring service (e.g., Sentry)
  if (window.Sentry) {
    window.Sentry.captureException(error, { tags: { context } });
  }
};
```

## Security Considerations

1. **Never expose API keys in frontend code**
2. **Use HTTPS in production**
3. **Validate and sanitize all user inputs**
4. **Implement proper authentication and authorization**
5. **Use CSRF tokens for state-changing operations**
6. **Implement rate limiting on the backend**
7. **Log all compliance-related actions for audit trails**

## Checklist

- [ ] Create ComplianceService in `/services/compliance-service.ts`
- [ ] Update sanctions page with API calls
- [ ] Update compliance dashboard with API calls
- [ ] Add environment variables
- [ ] Implement error handling with toasts
- [ ] Add loading states
- [ ] Test all API endpoints
- [ ] Configure CORS on backend
- [ ] Implement authentication
- [ ] Add monitoring and logging
- [ ] Test in production environment

## Support

For issues or questions, refer to:
- API documentation: `/docs/api`
- Component documentation: `/apps/web/src/app/admin/compliance/README.md`
- Backend documentation: `/apps/api/README.md`
