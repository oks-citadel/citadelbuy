'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
  Settings,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getInitials } from '@/lib/utils';

interface Team {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  createdAt: string;
  lead?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

interface CreateTeamForm {
  name: string;
  description: string;
}

const mockTeams: Team[] = [
  {
    id: '1',
    name: 'Engineering',
    description: 'Software development and infrastructure',
    memberCount: 15,
    createdAt: '2024-01-15T00:00:00Z',
    lead: { name: 'Mike Chen', email: 'mike@example.com' },
  },
  {
    id: '2',
    name: 'Product',
    description: 'Product management and design',
    memberCount: 8,
    createdAt: '2024-01-16T00:00:00Z',
    lead: { name: 'Sarah Johnson', email: 'sarah@example.com' },
  },
  {
    id: '3',
    name: 'Marketing',
    description: 'Marketing and growth initiatives',
    memberCount: 12,
    createdAt: '2024-01-17T00:00:00Z',
    lead: { name: 'Emily Davis', email: 'emily@example.com' },
  },
  {
    id: '4',
    name: 'Sales',
    description: 'Sales and customer success',
    memberCount: 10,
    createdAt: '2024-01-18T00:00:00Z',
  },
  {
    id: '5',
    name: 'Support',
    description: 'Customer support and operations',
    memberCount: 7,
    createdAt: '2024-01-19T00:00:00Z',
    lead: { name: 'John Smith', email: 'john@example.com' },
  },
];

export function TeamManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateTeamForm>({
    name: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    setIsLoading(true);
    try {
      // In production, fetch from API
      // const response = await api.get('/organizations/current/teams');
      await new Promise(resolve => setTimeout(resolve, 500));
      setTeams(mockTeams);
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // In production, call API
      // await api.post('/organizations/current/teams', createForm);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Add new team to list (mock)
      const newTeam: Team = {
        id: String(teams.length + 1),
        ...createForm,
        memberCount: 0,
        createdAt: new Date().toISOString(),
      };
      setTeams([...teams, newTeam]);

      setIsCreateModalOpen(false);
      setCreateForm({ name: '', description: '' });
    } catch (error) {
      console.error('Failed to create team:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      // In production, call API
      // await api.delete(`/organizations/current/teams/${teamId}`);
      setTeams(teams.filter(t => t.id !== teamId));
    } catch (error) {
      console.error('Failed to delete team:', error);
    }
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Team Management
          </h1>
          <p className="text-muted-foreground">Manage teams and their members</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">{filteredTeams.length} teams</Badge>
      </div>

      {/* Teams Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTeams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            onDelete={() => handleDeleteTeam(team.id)}
          />
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No teams found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Get started by creating your first team'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Team Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <form onSubmit={handleCreateTeam}>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Add a new team to your organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Engineering"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What does this team do?"
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Create Team
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeamCard({ team, onDelete }: { team: Team; onDelete: () => void }) {
  return (
    <Card hover className="group">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {team.name}
              <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardTitle>
            <CardDescription className="mt-1.5">{team.description}</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                Edit Team
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Members
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Team Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {team.lead && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                {team.lead.avatar ? (
                  <AvatarImage src={team.lead.avatar} alt={team.lead.name} />
                ) : (
                  <AvatarFallback className="text-xs">
                    {getInitials(team.lead.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <p className="text-xs font-medium">{team.lead.name}</p>
                <p className="text-xs text-muted-foreground">Team Lead</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">{team.memberCount} members</span>
            </div>
            <Button variant="ghost" size="sm">
              View Team
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TeamManagement;
