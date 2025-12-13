# Sanctions Screening Dashboard

This directory contains the Compliance and Sanctions Screening Dashboard for the CitadelBuy admin panel.

## Directory Structure

```
app/admin/compliance/
├── page.tsx                    # Main compliance dashboard
├── sanctions/
│   └── page.tsx               # Sanctions screening page
└── README.md                  # This file

components/screening/
├── ScreeningResultsTable.tsx  # Table component for screening results
├── ScreeningStatusBadge.tsx   # Status badge component (CLEAR, FLAGGED, PENDING)
└── ScreeningFilters.tsx       # Filter component for screening results
```

## Features

### Main Compliance Dashboard (`/admin/compliance`)
- **Overview Metrics**: Total screenings, flagged entities, clear results, pending reviews
- **Recent Activity Feed**: Real-time compliance events and alerts
- **Quick Actions**: Links to sanctions screening, transaction monitoring, watchlist management
- **Status Overview**: Visual breakdown of screening statuses
- **Active Watchlists**: Display of monitored sanctions lists (OFAC, EU, UN, UK)

### Sanctions Screening Page (`/admin/compliance/sanctions`)
- **Statistics Cards**: Real-time metrics for total screenings, clear, flagged, and pending
- **Advanced Filtering**:
  - Search by name, email, or entity
  - Filter by status (CLEAR, FLAGGED, PENDING)
  - Filter by risk level (LOW, MEDIUM, HIGH, CRITICAL)
  - Date range filtering
  - Clear filters functionality
- **Data Table**: Comprehensive screening results with:
  - Entity information (name, type, email, country)
  - Status badges
  - Risk level indicators
  - Match scores with visual progress bars
  - Matched sanctions lists
  - Screening timestamps and operators
- **Actions**:
  - View detailed screening information
  - Export individual results (JSON)
  - Export all filtered results (CSV)
  - Run new screening checks
  - Refresh data
- **Pagination**: Navigate through large result sets
- **Responsive Design**: Mobile-friendly interface

## Components

### ScreeningResultsTable
Displays screening results in a data table format with sorting and actions.

**Props:**
- `results`: Array of screening results
- `onViewDetails`: Callback for viewing details
- `onExport`: Callback for exporting results
- `className`: Optional CSS classes
- `emptyMessage`: Custom empty state message

### ScreeningStatusBadge
Displays status with appropriate colors and icons.

**Props:**
- `status`: 'CLEAR' | 'FLAGGED' | 'PENDING'
- `className`: Optional CSS classes
- `showIcon`: Show/hide icon (default: true)

### ScreeningFilters
Comprehensive filter panel for screening results.

**Props:**
- `onSearchChange`: Search callback
- `onStatusChange`: Status filter callback
- `onRiskLevelChange`: Risk level filter callback
- `onDateRangeChange`: Date range filter callback
- `onClear`: Clear filters callback
- `searchValue`, `statusValue`, `riskLevelValue`: Current filter values

## Backend Integration

The dashboard is designed to work with these API endpoints:

### GET /api/v1/compliance/screening
Retrieve screening results with optional filters.

**Query Parameters:**
- `search`: Search term
- `status`: Filter by status
- `riskLevel`: Filter by risk level
- `dateFrom`: Start date
- `dateTo`: End date
- `page`: Page number
- `limit`: Results per page

**Response:**
```typescript
{
  results: ScreeningResult[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /api/v1/compliance/screen
Run a new screening check.

**Request Body:**
```typescript
{
  entityName: string;
  entityType: 'INDIVIDUAL' | 'BUSINESS';
  email?: string;
  country?: string;
}
```

**Response:**
```typescript
{
  id: string;
  status: ScreeningStatus;
  result: ScreeningResult;
}
```

### GET /api/v1/compliance/sanctions
Get sanctioned entities from watchlists.

**Response:**
```typescript
{
  watchlists: {
    name: string;
    entries: number;
    lastUpdated: string;
  }[];
  totalEntries: number;
}
```

## Data Types

### ScreeningResult
```typescript
interface ScreeningResult {
  id: string;
  entityName: string;
  entityType: 'INDIVIDUAL' | 'BUSINESS';
  email?: string;
  status: 'CLEAR' | 'FLAGGED' | 'PENDING';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  matchScore?: number;           // 0-100
  matchedList?: string;          // e.g., "OFAC SDN List"
  screenedAt: string;            // ISO date string
  screenedBy?: string;           // User who ran the screening
  country?: string;
  notes?: string;
  flaggedReasons?: string[];
}
```

## Usage Example

### Running a New Screening
1. Click "New Screening" button
2. Enter entity name and select type
3. Click "Run Screening"
4. Results appear in the table with status

### Filtering Results
1. Use the search bar for quick searches
2. Select status from dropdown (All, Clear, Flagged, Pending)
3. Select risk level from dropdown
4. Set date range if needed
5. Click "Clear Filters" to reset

### Exporting Data
- **Export All**: Click "Export All" to download filtered results as CSV
- **Export Single**: Click the download icon on any row to export as JSON

## Styling

The dashboard uses:
- **Tailwind CSS** for utility classes
- **shadcn/ui** components (Card, Badge, Button, Table, Dialog, Input)
- **lucide-react** icons
- Custom color schemes for status indicators:
  - Clear: Green
  - Flagged: Red
  - Pending: Yellow
  - Risk levels: Blue (Low), Yellow (Medium), Orange (High), Red (Critical)

## Future Enhancements

Potential improvements:
- [ ] Bulk screening upload (CSV)
- [ ] Advanced matching algorithms
- [ ] Scheduled automatic rescreening
- [ ] Email notifications for high-risk matches
- [ ] Audit trail and compliance reporting
- [ ] Integration with third-party screening services
- [ ] Custom watchlist management
- [ ] Risk scoring customization
- [ ] Detailed entity profiles
- [ ] Case management for flagged entities

## Testing

To test the dashboard:

1. Navigate to `/admin/compliance`
2. Click "Sanctions Screening"
3. Verify all filters work correctly
4. Test pagination with mock data
5. Try exporting results
6. Run a new screening check

## Notes

- Currently using mock data - replace with actual API calls
- Ensure proper authentication and authorization
- Consider caching for better performance
- Implement rate limiting for API calls
- Add proper error handling for API failures
- Consider real-time updates using WebSockets
