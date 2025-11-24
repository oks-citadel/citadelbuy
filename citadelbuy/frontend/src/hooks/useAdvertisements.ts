import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  campaignsApi,
  advertisementsApi,
  publicAdsApi,
  CreateCampaignDto,
  CreateAdvertisementDto,
} from '@/lib/api/advertisements';
import { toast } from 'sonner';

// Campaign hooks
export const useCampaigns = (params?: { status?: string }) => {
  return useQuery({
    queryKey: ['campaigns', params],
    queryFn: () => campaignsApi.getAll(params),
  });
};

export const useCampaign = (id: string) => {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateCampaignDto) => campaignsApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create campaign');
    },
  });
};

export const useUpdateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateCampaignDto> & { status?: string } }) =>
      campaignsApi.update(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', variables.id] });
      toast.success('Campaign updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update campaign');
    },
  });
};

export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => campaignsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete campaign');
    },
  });
};

export const useCampaignPerformance = (id: string) => {
  return useQuery({
    queryKey: ['campaign-performance', id],
    queryFn: () => campaignsApi.getPerformance(id),
    enabled: !!id,
  });
};

// Advertisement hooks
export const useAdvertisements = (params?: { status?: string; type?: string; campaignId?: string }) => {
  return useQuery({
    queryKey: ['advertisements', params],
    queryFn: () => advertisementsApi.getAll(params),
  });
};

export const useAdvertisement = (id: string) => {
  return useQuery({
    queryKey: ['advertisement', id],
    queryFn: () => advertisementsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateAdvertisement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateAdvertisementDto) => advertisementsApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] });
      toast.success('Advertisement created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create advertisement');
    },
  });
};

export const useUpdateAdvertisement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateAdvertisementDto> & { status?: string } }) =>
      advertisementsApi.update(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] });
      queryClient.invalidateQueries({ queryKey: ['advertisement', variables.id] });
      toast.success('Advertisement updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update advertisement');
    },
  });
};

export const useDeleteAdvertisement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => advertisementsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] });
      toast.success('Advertisement deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete advertisement');
    },
  });
};

export const useAdPerformance = (id: string) => {
  return useQuery({
    queryKey: ['ad-performance', id],
    queryFn: () => advertisementsApi.getPerformance(id),
    enabled: !!id,
  });
};

// Public ad display hooks
export const useAdsForDisplay = (params: {
  placement?: string;
  categoryId?: string;
  keywords?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['ads-display', params],
    queryFn: () => publicAdsApi.getAdsForDisplay(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useTrackImpression = () => {
  return useMutation({
    mutationFn: ({ adId, placement, userId }: { adId: string; placement?: string; userId?: string }) =>
      publicAdsApi.trackImpression(adId, placement, userId),
  });
};

export const useTrackClick = () => {
  return useMutation({
    mutationFn: ({ adId, placement, userId }: { adId: string; placement?: string; userId?: string }) =>
      publicAdsApi.trackClick(adId, placement, userId),
  });
};
