# Organization UI Components

Enterprise-grade organization management components for the Broxiva admin/web apps.

## Components Overview

### 1. OrganizationDashboard.tsx
**Main dashboard component for organization overview**

Features:
- Organization header with logo, name, status badge
- Quick stats cards (members, teams, products)
- Recent activity feed with user avatars and timestamps
- Quick actions panel for common tasks
- Responsive grid layout

Usage:
```tsx
import { OrganizationDashboard } from '@/components/organization';

<OrganizationDashboard />
```

### 2. TeamManagement.tsx
**Complete team management interface**

Features:
- Team list in card grid layout
- Search and filter functionality
- Create team modal with name and description
- Team cards showing member count and team lead
- Edit, delete, and manage actions per team
- Empty state with CTA

Usage:
```tsx
import { TeamManagement } from '@/components/organization';

<TeamManagement />
```

### 3. RolePermissionMatrix.tsx
**RBAC (Role-Based Access Control) management UI**

Features:
- Role list with system and custom roles
- Permission matrix organized by categories
- Create/edit custom roles
- Permission categories: Organization, Products, Orders, Members, Settings
- Visual permission badges with checkmarks
- System role protection (cannot delete)
- Member count per role

Usage:
```tsx
import { RolePermissionMatrix } from '@/components/organization';

<RolePermissionMatrix />
```

### 4. InviteMemberModal.tsx
**Member invitation modal component**

Features:
- Email input with validation
- Role selector dropdown with descriptions
- Multi-select team badges
- Department selector
- Personal message textarea
- Success state with animation
- Form validation and error handling

Usage:
```tsx
import { InviteMemberModal } from '@/components/organization';

const [isOpen, setIsOpen] = useState(false);

<InviteMemberModal
  open={isOpen}
  onOpenChange={setIsOpen}
  onInviteSuccess={(invitation) => console.log(invitation)}
/>
```

### 5. OrganizationSwitcher.tsx
**Header dropdown for switching between organizations**

Features:
- Current organization display with avatar
- Dropdown list of all user's organizations
- Organization role and status badges
- Create new organization option
- Manage organizations link
- Compact design suitable for header

Usage:
```tsx
import { OrganizationSwitcher } from '@/components/organization';

<OrganizationSwitcher
  className="w-[200px]"
  onOrganizationChange={(orgId) => console.log(orgId)}
  onCreateOrganization={() => console.log('create')}
/>
```

## UI Components Used

All components follow the shadcn/ui pattern and use:

- `Card` - For container layouts
- `Button` - For actions
- `Badge` - For status indicators
- `Avatar` - For user/org images
- `Dialog` - For modals
- `DropdownMenu` - For context menus
- `Input` - For text inputs
- `Select` - For dropdowns
- `Textarea` - For multi-line text
- `Checkbox` - For permission toggles
- `Table` - For data display
- `Label` - For form labels

## Styling

Components use:
- Tailwind CSS for styling
- CSS variables for theming
- Responsive design (mobile, tablet, desktop)
- Dark mode support (via next-themes)
- Lucide React icons

## API Integration

All components include placeholder API calls with:
- Loading states
- Error handling
- Mock data for development
- TypeScript interfaces for data structures

To connect to real APIs:
1. Replace mock data with actual API calls
2. Use the existing API helper pattern
3. Update TypeScript interfaces as needed

## Features

- Fully typed with TypeScript
- Client-side components ('use client')
- Responsive layouts
- Loading and error states
- Form validation
- Accessibility features
- Consistent design patterns

## File Structure

```
organization/
├── OrganizationDashboard.tsx   (11,402 bytes)
├── TeamManagement.tsx          (11,892 bytes)
├── RolePermissionMatrix.tsx    (15,600 bytes)
├── InviteMemberModal.tsx       (10,902 bytes)
├── OrganizationSwitcher.tsx     (6,672 bytes)
├── index.ts                       (304 bytes)
└── README.md                    (this file)
```

## Dependencies

Required UI components:
- ✓ avatar
- ✓ badge
- ✓ button
- ✓ card
- ✓ checkbox
- ✓ dialog
- ✓ dropdown-menu
- ✓ input
- ✓ label
- ✓ select
- ✓ switch
- ✓ table
- ✓ textarea

All dependencies are included in this implementation.
