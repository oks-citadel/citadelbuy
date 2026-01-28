# Admin Layout Update Instructions

To add the Compliance menu to the admin navigation, edit the file:
`apps/web/src/app/admin/layout.tsx`

## Find this section (around line 119):

```typescript
  {
    href: '/admin/content',
    label: 'Content',
    icon: <FileText className="h-5 w-5" />,
    children: [
      { href: '/admin/content/pages', label: 'Pages' },
      { href: '/admin/content/banners', label: 'Banners' },
      { href: '/admin/content/emails', label: 'Email Templates' },
    ],
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
  },
```

## Replace it with:

```typescript
  {
    href: '/admin/compliance',
    label: 'Compliance',
    icon: <Shield className="h-5 w-5" />,
    children: [
      { href: '/admin/compliance', label: 'Overview' },
      { href: '/admin/compliance/sanctions', label: 'Sanctions Screening' },
    ],
  },
  {
    href: '/admin/content',
    label: 'Content',
    icon: <FileText className="h-5 w-5" />,
    children: [
      { href: '/admin/content/pages', label: 'Pages' },
      { href: '/admin/content/banners', label: 'Banners' },
      { href: '/admin/content/emails', label: 'Email Templates' },
    ],
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
  },
```

This adds the Compliance menu item with two sub-items:
1. Overview (main compliance dashboard)
2. Sanctions Screening (sanctions screening page)
