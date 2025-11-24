'use client';

import { useState } from 'react';
import { useCreateCampaign } from '@/hooks/useAdvertisements';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

interface CampaignFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CampaignForm({ onSuccess, onCancel }: CampaignFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [dailyBudget, setDailyBudget] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const createCampaign = useCreateCampaign();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !totalBudget || !startDate) {
      return;
    }

    try {
      await createCampaign.mutateAsync({
        name,
        description: description || undefined,
        totalBudget: parseFloat(totalBudget),
        dailyBudget: dailyBudget ? parseFloat(dailyBudget) : undefined,
        startDate: startDate.toISOString(),
        endDate: endDate?.toISOString(),
      });

      onSuccess?.();
    } catch (error) {
      console.error('Failed to create campaign:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Ad Campaign</CardTitle>
        <CardDescription>
          Set up a new advertising campaign with budget and schedule
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Campaign Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Summer Sale 2025"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your campaign goals..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="totalBudget">Total Budget ($) *</Label>
              <Input
                id="totalBudget"
                type="number"
                step="0.01"
                min="0"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                placeholder="500.00"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Total amount you want to spend on this campaign
              </p>
            </div>

            <div>
              <Label htmlFor="dailyBudget">Daily Budget ($)</Label>
              <Input
                id="dailyBudget"
                type="number"
                step="0.01"
                min="0"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
                placeholder="50.00"
              />
              <p className="text-xs text-gray-500 mt-1">Optional daily spending limit</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => setStartDate(date as Date | undefined)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>End Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : 'No end date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={(date) => setEndDate(date as Date | undefined)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={createCampaign.isPending}>
              {createCampaign.isPending ? 'Creating...' : 'Create Campaign'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
