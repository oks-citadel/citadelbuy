'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Users,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  Loader2,
  AlertCircle,
  Search,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { organizationsApiExtension } from '@/lib/organizations-api-extension';

interface Team {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  members?: TeamMember[];
}

interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

interface OrgMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

export default function TeamsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Create/Edit team form state
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Members management state
  const [availableMembers, setAvailableMembers] = useState<OrgMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  useEffect(() => {
    loadTeams();
  }, [slug]);

  const loadTeams = async () => {
    try {
      setIsLoading(true);
      // For now, using mock data until backend is ready
      // const data = await organizationsApiExtension.getTeams(slug);

      // Mock data
      await new Promise((resolve) => setTimeout(resolve, 800));
      const mockTeams: Team[] = [
        {
          id: 'team_1',
          name: 'Engineering',
          description: 'Product development and technical operations',
          memberCount: 8,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-11-20T14:30:00Z',
          members: [
            {
              id: 'tm_1',
              userId: 'user_2',
              name: 'Jane Smith',
              email: 'jane@example.com',
              role: 'admin',
            },
            {
              id: 'tm_2',
              userId: 'user_3',
              name: 'Bob Johnson',
              email: 'bob@example.com',
              role: 'member',
            },
          ],
        },
        {
          id: 'team_2',
          name: 'Marketing',
          description: 'Marketing and customer acquisition',
          memberCount: 5,
          createdAt: '2024-02-10T11:00:00Z',
          updatedAt: '2024-11-25T09:15:00Z',
        },
        {
          id: 'team_3',
          name: 'Sales',
          description: 'Sales and business development',
          memberCount: 6,
          createdAt: '2024-03-05T13:30:00Z',
          updatedAt: '2024-11-28T16:45:00Z',
        },
      ];

      setTeams(mockTeams);
    } catch (err) {
      toast.error('Failed to load teams');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableMembers = async () => {
    // Mock available members for adding to teams
    const mockMembers: OrgMember[] = [
      {
        id: 'member_1',
        userId: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'owner',
      },
      {
        id: 'member_2',
        userId: 'user_2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'admin',
      },
      {
        id: 'member_3',
        userId: 'user_3',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        role: 'member',
      },
      {
        id: 'member_4',
        userId: 'user_4',
        name: 'Alice Williams',
        email: 'alice@example.com',
        role: 'member',
      },
    ];
    setAvailableMembers(mockMembers);
  };

  const handleCreateTeam = async () => {
    if (!teamName) {
      toast.error('Please enter a team name');
      return;
    }

    try {
      setIsCreating(true);

      // API call
      // await organizationsApiExtension.createTeam(slug, {
      //   name: teamName,
      //   description: teamDescription,
      // });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast.success(`Team "${teamName}" created successfully`);
      setShowCreateModal(false);
      setTeamName('');
      setTeamDescription('');
      loadTeams();
    } catch (err) {
      toast.error('Failed to create team');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditTeam = async () => {
    if (!selectedTeam || !teamName) {
      toast.error('Please enter a team name');
      return;
    }

    try {
      setIsCreating(true);

      // await organizationsApiExtension.updateTeam(slug, selectedTeam.id, {
      //   name: teamName,
      //   description: teamDescription,
      // });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setTeams((prev) =>
        prev.map((t) =>
          t.id === selectedTeam.id
            ? { ...t, name: teamName, description: teamDescription }
            : t
        )
      );
      toast.success('Team updated successfully');
      setShowEditModal(false);
      setSelectedTeam(null);
      setTeamName('');
      setTeamDescription('');
    } catch (err) {
      toast.error('Failed to update team');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeam) return;

    try {
      setIsDeleting(true);

      // await organizationsApiExtension.deleteTeam(slug, selectedTeam.id);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setTeams((prev) => prev.filter((t) => t.id !== selectedTeam.id));
      toast.success(`Team "${selectedTeam.name}" has been deleted`);
      setShowDeleteModal(false);
      setSelectedTeam(null);
    } catch (err) {
      toast.error('Failed to delete team');
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEditModal = (team: Team) => {
    setSelectedTeam(team);
    setTeamName(team.name);
    setTeamDescription(team.description || '');
    setShowEditModal(true);
  };

  const handleOpenMembersModal = async (team: Team) => {
    setSelectedTeam(team);
    await loadAvailableMembers();
    setShowMembersModal(true);
  };

  const handleAddMembers = async () => {
    if (!selectedTeam || selectedMembers.length === 0) {
      toast.error('Please select at least one member');
      return;
    }

    try {
      setIsAddingMembers(true);

      // await organizationsApiExtension.addTeamMembers(slug, selectedTeam.id, selectedMembers);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success(`${selectedMembers.length} member(s) added to ${selectedTeam.name}`);
      setShowMembersModal(false);
      setSelectedMembers([]);
      setMemberSearchQuery('');
      loadTeams();
    } catch (err) {
      toast.error('Failed to add members');
      console.error(err);
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleRemoveTeamMember = async (teamId: string, memberId: string) => {
    try {
      // await organizationsApiExtension.removeTeamMember(slug, teamId, memberId);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId
            ? {
                ...t,
                members: t.members?.filter((m) => m.id !== memberId),
                memberCount: t.memberCount - 1,
              }
            : t
        )
      );
      toast.success('Member removed from team');
    } catch (err) {
      toast.error('Failed to remove member');
      console.error(err);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const filteredMembers = availableMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="text-muted-foreground mt-2">
            Organize your members into teams for better collaboration
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Create Team
        </Button>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardDescription>Total Teams</CardDescription>
          <CardTitle className="text-3xl">{teams.length}</CardTitle>
        </CardHeader>
      </Card>

      {/* Teams Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : teams.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No teams yet</h3>
              <p className="text-muted-foreground mt-2">
                Get started by creating your first team
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="mt-4"
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Create Team
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground">
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleOpenMembersModal(team)}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Manage Members
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenEditModal(team)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Team
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedTeam(team);
                          setShowDeleteModal(true);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Team
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {team.description && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {team.description}
                  </p>
                )}
                {team.members && team.members.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Team Members
                    </p>
                    <div className="space-y-2">
                      {team.members.slice(0, 3).map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <div className="flex h-full w-full items-center justify-center bg-secondary text-secondary-foreground text-xs">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                            </Avatar>
                            <span className="truncate">{member.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              handleRemoveTeamMember(team.id, member.id)
                            }
                          >
                            <UserMinus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {team.memberCount > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{team.memberCount - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                  Created {formatDate(team.createdAt)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Create a team to organize your organization members
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                placeholder="Engineering, Marketing, etc."
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-description">
                Description <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Textarea
                id="team-description"
                placeholder="What does this team do?"
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTeam} isLoading={isCreating}>
              Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Team Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>
              Update team information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-team-name">Team Name</Label>
              <Input
                id="edit-team-name"
                placeholder="Engineering, Marketing, etc."
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-team-description">
                Description <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Textarea
                id="edit-team-description"
                placeholder="What does this team do?"
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleEditTeam} isLoading={isCreating}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Team Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Team</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedTeam?.name}?
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This action cannot be undone. All team data will be permanently deleted.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTeam}
              isLoading={isDeleting}
            >
              Delete Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Modal */}
      <Dialog open={showMembersModal} onOpenChange={setShowMembersModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Team Members</DialogTitle>
            <DialogDescription>
              Add or remove members from {selectedTeam?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member-search">Search Members</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="member-search"
                  placeholder="Search by name or email..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="border rounded-md max-h-64 overflow-y-auto">
              {filteredMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No members found
                </div>
              ) : (
                <div className="divide-y">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer"
                      onClick={() => toggleMemberSelection(member.id)}
                    >
                      <Checkbox
                        checked={selectedMembers.includes(member.id)}
                        onCheckedChange={() => toggleMemberSelection(member.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <div className="flex h-full w-full items-center justify-center bg-secondary text-secondary-foreground text-sm">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{member.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {member.email}
                        </div>
                      </div>
                      <Badge variant="outline">{member.role}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedMembers.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowMembersModal(false);
                setSelectedMembers([]);
                setMemberSearchQuery('');
              }}
              disabled={isAddingMembers}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMembers}
              isLoading={isAddingMembers}
              disabled={selectedMembers.length === 0}
            >
              Add Members
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
