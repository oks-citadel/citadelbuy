'use client';

import React, { useState } from 'react';
import { UserPlus, Mail, Send, Loader2, Check, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { validateEmail } from '@/lib/utils';

interface InviteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSuccess?: (invitation: Invitation) => void;
}

interface Invitation {
  email: string;
  role: string;
  teams: string[];
  department?: string;
  message?: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

interface Team {
  id: string;
  name: string;
}

const mockRoles: Role[] = [
  { id: '1', name: 'Owner', description: 'Full access to all resources' },
  { id: '2', name: 'Admin', description: 'Administrative access' },
  { id: '3', name: 'Manager', description: 'Manage products and orders' },
  { id: '4', name: 'Member', description: 'Basic access' },
];

const mockTeams: Team[] = [
  { id: '1', name: 'Engineering' },
  { id: '2', name: 'Product' },
  { id: '3', name: 'Marketing' },
  { id: '4', name: 'Sales' },
  { id: '5', name: 'Support' },
];

const departments = [
  'Engineering',
  'Product',
  'Marketing',
  'Sales',
  'Support',
  'Operations',
  'Finance',
  'Human Resources',
];

export function InviteMemberModal({
  open,
  onOpenChange,
  onInviteSuccess,
}: InviteMemberModalProps) {
  const [formData, setFormData] = useState<Invitation>({
    email: '',
    role: '',
    teams: [],
    department: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [inviteSent, setInviteSent] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // In production, call API
      // await api.post('/organizations/current/invitations', formData);
      await new Promise(resolve => setTimeout(resolve, 1500));

      setInviteSent(true);
      onInviteSuccess?.(formData);

      // Reset form after delay
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to send invitation:', error);
      setErrors({ submit: 'Failed to send invitation. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      email: '',
      role: '',
      teams: [],
      department: '',
      message: '',
    });
    setErrors({});
    setInviteSent(false);
    onOpenChange(false);
  };

  const toggleTeam = (teamId: string) => {
    setFormData(prev => ({
      ...prev,
      teams: prev.teams.includes(teamId)
        ? prev.teams.filter(id => id !== teamId)
        : [...prev.teams, teamId],
    }));
  };

  if (inviteSent) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-green-100 p-3 mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-xl mb-2">Invitation Sent!</DialogTitle>
            <DialogDescription className="text-center">
              An invitation has been sent to{' '}
              <span className="font-medium text-foreground">{formData.email}</span>.
              They will receive an email with instructions to join your organization.
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Team Member
            </DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                leftIcon={<Mail className="h-4 w-4" />}
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setErrors({ ...errors, email: '' });
                }}
                error={errors.email}
                disabled={isSubmitting}
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">
                Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => {
                  setFormData({ ...formData, role: value });
                  setErrors({ ...errors, role: '' });
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger id="role" className={errors.role ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {mockRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div>
                        <div className="font-medium">{role.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {role.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.role}
                </p>
              )}
            </div>

            {/* Teams */}
            <div className="space-y-2">
              <Label>Teams (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Select teams this member will be part of
              </p>
              <div className="flex flex-wrap gap-2">
                {mockTeams.map((team) => (
                  <Badge
                    key={team.id}
                    variant={formData.teams.includes(team.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => !isSubmitting && toggleTeam(team.id)}
                  >
                    {formData.teams.includes(team.id) && (
                      <Check className="h-3 w-3 mr-1" />
                    )}
                    {team.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department">Department (Optional)</Label>
              <Select
                value={formData.department}
                onValueChange={(value) =>
                  setFormData({ ...formData, department: value })
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept.toLowerCase()}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Personal Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal note to the invitation..."
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                rows={3}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                This message will be included in the invitation email
              </p>
            </div>

            {errors.submit && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {errors.submit}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} loadingText="Sending...">
              <Send className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default InviteMemberModal;
