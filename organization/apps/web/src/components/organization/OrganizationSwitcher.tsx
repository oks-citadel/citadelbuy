'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Check,
  ChevronsUpDown,
  Plus,
  Settings,
  LogOut,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/utils';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  role: string;
  status: 'active' | 'suspended' | 'trial';
}

interface OrganizationSwitcherProps {
  className?: string;
  onOrganizationChange?: (orgId: string) => void;
  onCreateOrganization?: () => void;
  onManageOrganization?: () => void;
}

const mockOrganizations: Organization[] = [
  {
    id: '1',
    name: 'Acme Corporation',
    slug: 'acme-corp',
    role: 'Owner',
    status: 'active',
  },
  {
    id: '2',
    name: 'TechStart Inc',
    slug: 'techstart',
    role: 'Admin',
    status: 'active',
  },
  {
    id: '3',
    name: 'Beta Solutions',
    slug: 'beta-solutions',
    role: 'Member',
    status: 'trial',
  },
];

export function OrganizationSwitcher({
  className,
  onOrganizationChange,
  onCreateOrganization,
  onManageOrganization,
}: OrganizationSwitcherProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setIsLoading(true);
    try {
      // In production, fetch from API
      // const response = await api.get('/users/me/organizations');
      await new Promise(resolve => setTimeout(resolve, 300));
      setOrganizations(mockOrganizations);
      setCurrentOrg(mockOrganizations[0]);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchOrganization = (org: Organization) => {
    setCurrentOrg(org);
    setIsOpen(false);
    onOrganizationChange?.(org.id);
  };

  const getStatusBadge = (status: Organization['status']) => {
    switch (status) {
      case 'active':
        return null; // Don't show badge for active
      case 'trial':
        return (
          <Badge variant="warning" className="ml-auto text-xs">
            Trial
          </Badge>
        );
      case 'suspended':
        return (
          <Badge variant="destructive" className="ml-auto text-xs">
            Suspended
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading || !currentOrg) {
    return (
      <Button variant="outline" className={className} disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={`justify-between ${className}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-6 w-6">
              {currentOrg.logo ? (
                <AvatarImage src={currentOrg.logo} alt={currentOrg.name} />
              ) : (
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(currentOrg.name)}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="truncate">{currentOrg.name}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px]">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">Organizations</p>
            <p className="text-xs text-muted-foreground">
              Switch between organizations
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Organization List */}
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitchOrganization(org)}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-3 w-full">
              <Avatar className="h-8 w-8">
                {org.logo ? (
                  <AvatarImage src={org.logo} alt={org.name} />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(org.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{org.name}</p>
                  {currentOrg.id === org.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {org.role} • @{org.slug}
                </p>
              </div>
              {getStatusBadge(org.status)}
            </div>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {/* Actions */}
        <DropdownMenuItem
          onClick={() => {
            setIsOpen(false);
            onCreateOrganization?.();
          }}
          className="cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Organization
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            setIsOpen(false);
            onManageOrganization?.();
          }}
          className="cursor-pointer"
        >
          <Settings className="h-4 w-4 mr-2" />
          Manage Organizations
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default OrganizationSwitcher;
