'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Users,
  UserPlus,
  Mail,
  MoreVertical,
  Shield,
  Eye,
  Trash2,
  Send,
  Loader2,
  AlertCircle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { organizationsApiExtension } from '@/lib/organizations-api-extension';

interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'invited' | 'suspended';
  joinedAt: string;
  invitedAt?: string;
  lastActive?: string;
}

const roleOptions = [
  { value: 'admin', label: 'Admin', description: 'Full access except billing' },
  { value: 'member', label: 'Member', description: 'Can manage content' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
];

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'owner':
      return 'default';
    case 'admin':
      return 'destructive';
    case 'member':
      return 'secondary';
    default:
      return 'outline';
  }
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'invited':
      return 'warning';
    case 'suspended':
      return 'destructive';
    default:
      return 'outline';
  }
};

export default function MembersPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [inviteMessage, setInviteMessage] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Remove state
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [slug]);

  const loadMembers = async () => {
    try {
      setIsLoading(true);
      // For now, using mock data until backend is ready
      // const data = await organizationsApiExtension.getMembers(slug);

      // Mock data
      await new Promise((resolve) => setTimeout(resolve, 800));
      const mockMembers: Member[] = [
        {
          id: '1',
          userId: 'user_1',
          name: 'John Doe',
          email: 'john@example.com',
          avatar: undefined,
          role: 'owner',
          status: 'active',
          joinedAt: '2024-01-15T10:00:00Z',
          lastActive: '2024-12-02T08:30:00Z',
        },
        {
          id: '2',
          userId: 'user_2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          avatar: undefined,
          role: 'admin',
          status: 'active',
          joinedAt: '2024-02-20T14:30:00Z',
          lastActive: '2024-12-01T16:45:00Z',
        },
        {
          id: '3',
          userId: 'user_3',
          name: 'Bob Johnson',
          email: 'bob@example.com',
          avatar: undefined,
          role: 'member',
          status: 'active',
          joinedAt: '2024-03-10T09:15:00Z',
          lastActive: '2024-11-30T12:20:00Z',
        },
        {
          id: '4',
          userId: 'user_4',
          name: 'Alice Williams',
          email: 'alice@example.com',
          avatar: undefined,
          role: 'viewer',
          status: 'invited',
          joinedAt: '2024-11-28T11:00:00Z',
          invitedAt: '2024-11-28T11:00:00Z',
        },
      ];

      setMembers(mockMembers);
    } catch (err) {
      toast.error('Failed to load members');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setIsInviting(true);

      // API call
      // await organizationsApiExtension.inviteMember(slug, {
      //   email: inviteEmail,
      //   role: inviteRole,
      //   message: inviteMessage,
      // });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast.success(`Invitation sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      setInviteMessage('');
      loadMembers();
    } catch (err) {
      toast.error('Failed to send invitation');
      console.error(err);
    } finally {
      setIsInviting(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'admin' | 'member' | 'viewer') => {
    try {
      // await organizationsApiExtension.updateMemberRole(slug, memberId, newRole);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      toast.success('Member role updated successfully');
    } catch (err) {
      toast.error('Failed to update member role');
      console.error(err);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    try {
      setIsRemoving(true);

      // await organizationsApiExtension.removeMember(slug, selectedMember.id);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setMembers((prev) => prev.filter((m) => m.id !== selectedMember.id));
      toast.success(`${selectedMember.name} has been removed from the organization`);
      setShowRemoveModal(false);
      setSelectedMember(null);
    } catch (err) {
      toast.error('Failed to remove member');
      console.error(err);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleResendInvite = async (memberId: string) => {
    try {
      // await organizationsApiExtension.resendInvite(slug, memberId);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success('Invitation resent successfully');
    } catch (err) {
      toast.error('Failed to resend invitation');
      console.error(err);
    }
  };

  const activeMembers = members.filter((m) => m.status === 'active');
  const invitedMembers = members.filter((m) => m.status === 'invited');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Members</h1>
          <p className="text-muted-foreground mt-2">
            Manage your organization members and their roles
          </p>
        </div>
        <Button
          onClick={() => setShowInviteModal(true)}
          leftIcon={<UserPlus className="h-4 w-4" />}
        >
          Invite Member
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Members</CardDescription>
            <CardTitle className="text-3xl">{members.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Members</CardDescription>
            <CardTitle className="text-3xl">{activeMembers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Invites</CardDescription>
            <CardTitle className="text-3xl">{invitedMembers.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Members</CardTitle>
          <CardDescription>
            View and manage all organization members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No members yet</h3>
              <p className="text-muted-foreground mt-2">
                Get started by inviting your first team member
              </p>
              <Button
                onClick={() => setShowInviteModal(true)}
                className="mt-4"
                leftIcon={<UserPlus className="h-4 w-4" />}
              >
                Invite Member
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(member.status)}>
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(member.joinedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {member.lastActive
                        ? formatRelativeTime(member.lastActive)
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.role !== 'owner' && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleChangeRole(member.id, 'admin')
                                }
                                disabled={member.role === 'admin'}
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                Make Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleChangeRole(member.id, 'member')
                                }
                                disabled={member.role === 'member'}
                              >
                                <Users className="mr-2 h-4 w-4" />
                                Make Member
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleChangeRole(member.id, 'viewer')
                                }
                                disabled={member.role === 'viewer'}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Make Viewer
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {member.status === 'invited' && (
                            <DropdownMenuItem
                              onClick={() => handleResendInvite(member.id)}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Resend Invite
                            </DropdownMenuItem>
                          )}
                          {member.role !== 'owner' && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedMember(member);
                                setShowRemoveModal(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove Member
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite Member Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">
                Personal Message <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="message"
                placeholder="Add a personal note to the invitation"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInviteModal(false)}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInviteMember}
              isLoading={isInviting}
              leftIcon={<Mail className="h-4 w-4" />}
            >
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Modal */}
      <Dialog open={showRemoveModal} onOpenChange={setShowRemoveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedMember?.name} from the
              organization?
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This action cannot be undone. The member will lose access to all
              organization resources immediately.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRemoveModal(false)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              isLoading={isRemoving}
            >
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
