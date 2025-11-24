'use client';

import { useCampaigns, useDeleteCampaign, useUpdateCampaign } from '@/hooks/useAdvertisements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Campaign } from '@/lib/api/advertisements';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus, Play, Pause, Trash2, BarChart } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface CampaignListProps {
  onCreateClick: () => void;
}

export function CampaignList({ onCreateClick }: CampaignListProps) {
  const { data: campaigns, isLoading } = useCampaigns();
  const deleteCampaign = useDeleteCampaign();
  const updateCampaign = useUpdateCampaign();

  const handleStatusChange = (id: string, status: 'ACTIVE' | 'PAUSED') => {
    updateCampaign.mutate({ id, dto: { status } });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      deleteCampaign.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      DRAFT: { variant: 'secondary', label: 'Draft' },
      ACTIVE: { variant: 'default', label: 'Active' },
      PAUSED: { variant: 'outline', label: 'Paused' },
      COMPLETED: { variant: 'secondary', label: 'Completed' },
      CANCELLED: { variant: 'destructive', label: 'Cancelled' },
    };

    const config = statusConfig[status] || statusConfig.DRAFT;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading campaigns...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Ad Campaigns</CardTitle>
        <Button onClick={onCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </CardHeader>
      <CardContent>
        {!campaigns || campaigns.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No campaigns yet</p>
            <Button onClick={onCreateClick}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Campaign
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Spent</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign: Campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{campaign.name}</div>
                      {campaign.description && (
                        <div className="text-sm text-gray-500 line-clamp-1">{campaign.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell>
                    <div>
                      <div>${campaign.totalBudget.toFixed(2)}</div>
                      {campaign.dailyBudget && (
                        <div className="text-xs text-gray-500">
                          ${campaign.dailyBudget.toFixed(2)}/day
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div>${campaign.spentAmount.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">
                        {((campaign.spentAmount / campaign.totalBudget) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{campaign.impressions.toLocaleString()} impressions</div>
                      <div>{campaign.clicks.toLocaleString()} clicks</div>
                      <div className="text-xs text-gray-500">
                        CTR:{' '}
                        {campaign.impressions > 0
                          ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
                          : 0}
                        %
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/vendor/ads/campaigns/${campaign.id}`}>
                            <BarChart className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        {campaign.status === 'ACTIVE' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(campaign.id, 'PAUSED')}>
                            <Pause className="mr-2 h-4 w-4" />
                            Pause
                          </DropdownMenuItem>
                        )}
                        {(campaign.status === 'PAUSED' || campaign.status === 'DRAFT') && (
                          <DropdownMenuItem onClick={() => handleStatusChange(campaign.id, 'ACTIVE')}>
                            <Play className="mr-2 h-4 w-4" />
                            Activate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(campaign.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
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
  );
}
