// Extended API methods for organizations

import { apiClient } from './api-client';

export const organizationsApiExtension = {
  // Members management
  getMembers: async (orgId: string) => {
    const response = await apiClient.get<Array<{
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
    }>>(`/api/organizations/${orgId}/members`);
    return response.data;
  },

  inviteMember: async (orgId: string, data: {
    email: string;
    role: 'admin' | 'member' | 'viewer';
    message?: string;
  }) => {
    const response = await apiClient.post<{
      id: string;
      email: string;
      role: string;
      status: string;
    }>(`/api/organizations/${orgId}/members`, data);
    return response.data;
  },

  updateMemberRole: async (orgId: string, memberId: string, role: 'admin' | 'member' | 'viewer') => {
    const response = await apiClient.patch<any>(
      `/api/organizations/${orgId}/members/${memberId}`,
      { role }
    );
    return response.data;
  },

  removeMember: async (orgId: string, memberId: string) => {
    await apiClient.delete(`/api/organizations/${orgId}/members/${memberId}`);
  },

  resendInvite: async (orgId: string, memberId: string) => {
    const response = await apiClient.post<any>(
      `/api/organizations/${orgId}/members/${memberId}/resend-invite`
    );
    return response.data;
  },

  // Teams management
  getTeams: async (orgId: string) => {
    const response = await apiClient.get<Array<{
      id: string;
      name: string;
      description?: string;
      avatar?: string;
      memberCount: number;
      createdAt: string;
      updatedAt: string;
      members?: Array<{
        id: string;
        name: string;
        email: string;
        avatar?: string;
        role: string;
      }>;
    }>>(`/api/organizations/${orgId}/teams`);
    return response.data;
  },

  createTeam: async (orgId: string, data: {
    name: string;
    description?: string;
    memberIds?: string[];
  }) => {
    const response = await apiClient.post<{
      id: string;
      name: string;
      description?: string;
      memberCount: number;
    }>(`/api/organizations/${orgId}/teams`, data);
    return response.data;
  },

  updateTeam: async (orgId: string, teamId: string, data: {
    name?: string;
    description?: string;
  }) => {
    const response = await apiClient.patch<any>(
      `/api/organizations/${orgId}/teams/${teamId}`,
      data
    );
    return response.data;
  },

  deleteTeam: async (orgId: string, teamId: string) => {
    await apiClient.delete(`/api/organizations/${orgId}/teams/${teamId}`);
  },

  getTeamMembers: async (orgId: string, teamId: string) => {
    const response = await apiClient.get<Array<{
      id: string;
      userId: string;
      name: string;
      email: string;
      avatar?: string;
      role: string;
      addedAt: string;
    }>>(`/api/organizations/${orgId}/teams/${teamId}/members`);
    return response.data;
  },

  addTeamMembers: async (orgId: string, teamId: string, memberIds: string[]) => {
    const response = await apiClient.post<any>(
      `/api/organizations/${orgId}/teams/${teamId}/members`,
      { memberIds }
    );
    return response.data;
  },

  removeTeamMember: async (orgId: string, teamId: string, memberId: string) => {
    await apiClient.delete(
      `/api/organizations/${orgId}/teams/${teamId}/members/${memberId}`
    );
  },

  // Organization stats (for dashboard)
  getStats: async (orgId: string) => {
    const response = await apiClient.get<{
      members: {
        total: number;
        active: number;
        invited: number;
      };
      teams: {
        total: number;
      };
      apiKeys: {
        total: number;
        active: number;
      };
      activity: Array<{
        id: string;
        type: string;
        description: string;
        user: {
          name: string;
          avatar?: string;
        };
        timestamp: string;
      }>;
    }>(`/api/organizations/${orgId}/stats`);
    return response.data;
  },
};
