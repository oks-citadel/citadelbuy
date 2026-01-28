'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Megaphone,
  Target,
  DollarSign,
  Calendar,
  Image as ImageIcon,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AdCampaign,
  AdCampaignType,
  AudienceTargeting,
  CampaignBudget,
  AdCreative,
} from '@/types/vendor';
import { useCreateCampaign, useEstimateAudienceReach } from '@/hooks/use-vendor';

const campaignSchema = z.object({
  name: z.string().min(3, 'Campaign name must be at least 3 characters'),
  type: z.enum([
    'SPONSORED_PRODUCT',
    'DISPLAY_AD',
    'FEATURED_LISTING',
    'BRAND_SHOWCASE',
    'FLASH_SALE',
    'RETARGETING',
  ]),
  budget: z.object({
    type: z.enum(['DAILY', 'LIFETIME']),
    amount: z.number().min(1, 'Budget must be at least $1'),
    bidStrategy: z.enum(['MANUAL_CPC', 'AUTO_OPTIMIZE', 'TARGET_ROAS', 'MAXIMIZE_CLICKS']),
    maxBid: z.number().optional(),
  }),
  targeting: z.object({
    demographics: z.object({
      ageMin: z.number().optional(),
      ageMax: z.number().optional(),
      genders: z.array(z.enum(['MALE', 'FEMALE', 'OTHER'])),
    }),
    interests: z.array(z.string()),
    locations: z.array(z.object({
      type: z.enum(['COUNTRY', 'STATE', 'CITY', 'POSTAL_CODE', 'RADIUS']),
      value: z.string(),
    })),
  }),
  schedule: z.object({
    startDate: z.string(),
    endDate: z.string().optional(),
  }),
  products: z.array(z.string()).min(1, 'Select at least one product'),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

const campaignTypes: { value: AdCampaignType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'SPONSORED_PRODUCT',
    label: 'Sponsored Product',
    description: 'Promote individual products in search results',
    icon: <Megaphone className="h-6 w-6" />,
  },
  {
    value: 'DISPLAY_AD',
    label: 'Display Ad',
    description: 'Show visual ads across the platform',
    icon: <ImageIcon className="h-6 w-6" />,
  },
  {
    value: 'FEATURED_LISTING',
    label: 'Featured Listing',
    description: 'Get premium placement on category pages',
    icon: <Target className="h-6 w-6" />,
  },
  {
    value: 'RETARGETING',
    label: 'Retargeting',
    description: 'Re-engage visitors who viewed your products',
    icon: <Sparkles className="h-6 w-6" />,
  },
];

const bidStrategies = [
  { value: 'AUTO_OPTIMIZE', label: 'Auto-optimize', description: 'AI optimizes bids for conversions' },
  { value: 'MANUAL_CPC', label: 'Manual CPC', description: 'Set your own cost-per-click bids' },
  { value: 'TARGET_ROAS', label: 'Target ROAS', description: 'Optimize for return on ad spend' },
  { value: 'MAXIMIZE_CLICKS', label: 'Maximize Clicks', description: 'Get the most clicks within budget' },
];

const interestCategories = [
  'Electronics', 'Fashion', 'Home & Garden', 'Sports & Outdoors', 'Beauty',
  'Toys & Games', 'Books', 'Health & Wellness', 'Automotive', 'Pet Supplies',
];

interface AdCampaignBuilderProps {
  onSuccess?: (campaign: AdCampaign) => void;
  initialData?: Partial<AdCampaign>;
}

export function AdCampaignBuilder({ onSuccess, initialData }: AdCampaignBuilderProps) {
  const [step, setStep] = React.useState(1);
  const totalSteps = 5;

  const createCampaign = useCreateCampaign();
  const estimateReach = useEstimateAudienceReach();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || 'SPONSORED_PRODUCT',
      budget: {
        type: 'DAILY',
        amount: 50,
        bidStrategy: 'AUTO_OPTIMIZE',
      },
      targeting: {
        demographics: {
          genders: ['MALE', 'FEMALE', 'OTHER'],
        },
        interests: [],
        locations: [{ type: 'COUNTRY', value: 'US' }],
      },
      schedule: {
        startDate: new Date().toISOString().split('T')[0],
      },
      products: [],
    },
    mode: 'onChange',
  });

  const watchedType = watch('type');
  const watchedBudget = watch('budget');
  const watchedTargeting = watch('targeting');
  const watchedProducts = watch('products');

  const [estimatedReach, setEstimatedReach] = React.useState<number | null>(null);

  // Estimate audience reach when targeting changes
  React.useEffect(() => {
    const targeting = watchedTargeting as unknown as AudienceTargeting;
    if (targeting) {
      estimateReach.mutate(targeting, {
        onSuccess: (data) => setEstimatedReach(data.reach),
      });
    }
  }, [watchedTargeting]);

  const onSubmit = async (data: CampaignFormData) => {
    try {
      const campaign = await createCampaign.mutateAsync(data as unknown as Partial<AdCampaign>);
      onSuccess?.(campaign);
    } catch (error) {
      console.error('Failed to create campaign:', error);
    }
  };

  const nextStep = () => setStep((prev) => Math.min(prev + 1, totalSteps));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const steps = [
    { number: 1, title: 'Campaign Type', description: 'Choose your campaign objective' },
    { number: 2, title: 'Products', description: 'Select products to promote' },
    { number: 3, title: 'Targeting', description: 'Define your audience' },
    { number: 4, title: 'Budget', description: 'Set your budget and bids' },
    { number: 5, title: 'Schedule', description: 'Choose when to run' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s, index) => (
            <React.Fragment key={s.number}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    step > s.number
                      ? 'bg-primary text-primary-foreground'
                      : step === s.number
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {step > s.number ? <Check className="h-5 w-5" /> : s.number}
                </div>
                <p className="text-xs mt-2 font-medium hidden sm:block">{s.title}</p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-1 mx-2 rounded',
                    step > s.number ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Campaign Type */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Campaign Type</CardTitle>
              <CardDescription>
                Select the type of campaign that best fits your advertising goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                <Input
                  {...register('name')}
                  placeholder="Campaign name"
                  error={errors.name?.message}
                />
              </div>

              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {campaignTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => field.onChange(type.value)}
                        className={cn(
                          'p-4 rounded-lg border-2 text-left transition-all',
                          field.value === type.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={cn(
                              'p-2 rounded-lg',
                              field.value === type.value
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            )}
                          >
                            {type.icon}
                          </div>
                          <div>
                            <p className="font-medium">{type.label}</p>
                            <p className="text-sm text-muted-foreground">{type.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Step 2: Products */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Products</CardTitle>
              <CardDescription>
                Choose the products you want to promote in this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Controller
                name="products"
                control={control}
                render={({ field }) => (
                  <div>
                    {/* Mock product selector - in real app, this would fetch products */}
                    <div className="mb-4">
                      <Input placeholder="Search products..." />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {['prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5', 'prod-6'].map((productId) => (
                        <button
                          key={productId}
                          type="button"
                          onClick={() => {
                            const newValue = field.value.includes(productId)
                              ? field.value.filter((p) => p !== productId)
                              : [...field.value, productId];
                            field.onChange(newValue);
                          }}
                          className={cn(
                            'p-4 rounded-lg border-2 text-left transition-all',
                            field.value.includes(productId)
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <div className="aspect-square bg-muted rounded-md mb-2" />
                          <p className="text-sm font-medium truncate">Product {productId}</p>
                          <p className="text-sm text-muted-foreground">$99.99</p>
                          {field.value.includes(productId) && (
                            <Check className="h-4 w-4 text-primary absolute top-2 right-2" />
                          )}
                        </button>
                      ))}
                    </div>
                    {field.value.length > 0 && (
                      <p className="mt-4 text-sm text-muted-foreground">
                        {field.value.length} product(s) selected
                      </p>
                    )}
                    {errors.products && (
                      <p className="mt-2 text-sm text-destructive">{errors.products.message}</p>
                    )}
                  </div>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Step 3: Targeting */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Define Your Audience</CardTitle>
              <CardDescription>
                Target the right customers for your products
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Demographics */}
              <div>
                <h4 className="font-medium mb-3">Demographics</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Min Age</label>
                    <Input
                      type="number"
                      {...register('targeting.demographics.ageMin', { valueAsNumber: true })}
                      placeholder="18"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Max Age</label>
                    <Input
                      type="number"
                      {...register('targeting.demographics.ageMax', { valueAsNumber: true })}
                      placeholder="65+"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Gender</label>
                  <Controller
                    name="targeting.demographics.genders"
                    control={control}
                    render={({ field }) => (
                      <div className="flex gap-2">
                        {(['MALE', 'FEMALE', 'OTHER'] as const).map((gender) => (
                          <button
                            key={gender}
                            type="button"
                            onClick={() => {
                              const newValue = field.value.includes(gender)
                                ? field.value.filter((g) => g !== gender)
                                : [...field.value, gender];
                              field.onChange(newValue);
                            }}
                            className={cn(
                              'px-4 py-2 rounded-lg border transition-colors',
                              field.value.includes(gender)
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            {gender.charAt(0) + gender.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                    )}
                  />
                </div>
              </div>

              {/* Interests */}
              <div>
                <h4 className="font-medium mb-3">Interests</h4>
                <Controller
                  name="targeting.interests"
                  control={control}
                  render={({ field }) => (
                    <div className="flex flex-wrap gap-2">
                      {interestCategories.map((interest) => (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => {
                            const newValue = field.value.includes(interest)
                              ? field.value.filter((i) => i !== interest)
                              : [...field.value, interest];
                            field.onChange(newValue);
                          }}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-sm border transition-colors',
                            field.value.includes(interest)
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                  )}
                />
              </div>

              {/* Estimated Reach */}
              {estimatedReach !== null && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Estimated Reach</span>
                  </div>
                  <p className="text-2xl font-bold">{estimatedReach.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">potential customers</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Budget */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Set Your Budget</CardTitle>
              <CardDescription>
                Define how much you want to spend on this campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Budget Type */}
              <div>
                <h4 className="font-medium mb-3">Budget Type</h4>
                <Controller
                  name="budget.type"
                  control={control}
                  render={({ field }) => (
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => field.onChange('DAILY')}
                        className={cn(
                          'p-4 rounded-lg border-2 text-left',
                          field.value === 'DAILY'
                            ? 'border-primary bg-primary/5'
                            : 'border-border'
                        )}
                      >
                        <p className="font-medium">Daily Budget</p>
                        <p className="text-sm text-muted-foreground">
                          Set a daily spending limit
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange('LIFETIME')}
                        className={cn(
                          'p-4 rounded-lg border-2 text-left',
                          field.value === 'LIFETIME'
                            ? 'border-primary bg-primary/5'
                            : 'border-border'
                        )}
                      >
                        <p className="font-medium">Lifetime Budget</p>
                        <p className="text-sm text-muted-foreground">
                          Set a total budget for the campaign
                        </p>
                      </button>
                    </div>
                  )}
                />
              </div>

              {/* Budget Amount */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {watchedBudget.type === 'DAILY' ? 'Daily Budget' : 'Total Budget'}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    {...register('budget.amount', { valueAsNumber: true })}
                    className="pl-10"
                    placeholder="50"
                  />
                </div>
                {errors.budget?.amount && (
                  <p className="text-sm text-destructive mt-1">{errors.budget.amount.message}</p>
                )}
              </div>

              {/* Bid Strategy */}
              <div>
                <h4 className="font-medium mb-3">Bid Strategy</h4>
                <Controller
                  name="budget.bidStrategy"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      {bidStrategies.map((strategy) => (
                        <button
                          key={strategy.value}
                          type="button"
                          onClick={() => field.onChange(strategy.value)}
                          className={cn(
                            'w-full p-4 rounded-lg border text-left transition-colors',
                            field.value === strategy.value
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{strategy.label}</p>
                              <p className="text-sm text-muted-foreground">
                                {strategy.description}
                              </p>
                            </div>
                            {field.value === strategy.value && (
                              <Check className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                />
              </div>

              {/* AI Recommendation */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">AI Recommendation</p>
                    <p className="text-sm text-muted-foreground">
                      Based on your product category and targeting, we recommend a daily budget of{' '}
                      <strong>$75</strong> with <strong>Auto-optimize</strong> bidding for best results.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Schedule */}
        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>Campaign Schedule</CardTitle>
              <CardDescription>
                Choose when your campaign should run
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Start Date</label>
                  <Input type="date" {...register('schedule.startDate')} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">End Date (Optional)</label>
                  <Input type="date" {...register('schedule.endDate')} />
                </div>
              </div>

              {/* Campaign Summary */}
              <div className="p-4 rounded-lg bg-muted">
                <h4 className="font-medium mb-4">Campaign Summary</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Campaign Name</span>
                    <span className="font-medium">{watch('name') || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Campaign Type</span>
                    <span className="font-medium">
                      {campaignTypes.find((t) => t.value === watchedType)?.label || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Products</span>
                    <span className="font-medium">{watchedProducts.length} selected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Budget</span>
                    <span className="font-medium">
                      ${watchedBudget.amount} {watchedBudget.type.toLowerCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Reach</span>
                    <span className="font-medium">
                      {estimatedReach?.toLocaleString() || '-'} people
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={step === 1}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          {step < totalSteps ? (
            <Button type="button" onClick={nextStep}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={createCampaign.isPending}>
              {createCampaign.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Launch Campaign
                  <Megaphone className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
