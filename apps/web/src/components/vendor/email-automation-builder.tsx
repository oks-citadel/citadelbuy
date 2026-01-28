'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Mail,
  Users,
  Clock,
  Sparkles,
  Send,
  ChevronRight,
  ChevronLeft,
  Check,
  Eye,
  Loader2,
  Plus,
  Wand2,
  TestTube,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EmailCampaign, EmailCampaignType } from '@/types/vendor';
import {
  useCreateEmailCampaign,
  useSendTestEmail,
  useGenerateAIEmailContent,
} from '@/hooks/use-vendor';

const campaignSchema = z.object({
  name: z.string().min(3, 'Campaign name must be at least 3 characters'),
  type: z.enum([
    'WELCOME',
    'PROMOTIONAL',
    'ABANDONED_CART',
    'ORDER_FOLLOW_UP',
    'WIN_BACK',
    'PRODUCT_LAUNCH',
    'NEWSLETTER',
    'PERSONALIZED_RECOMMENDATIONS',
  ]),
  content: z.object({
    subject: z.string().min(1, 'Subject is required'),
    preheader: z.string().optional(),
    fromName: z.string().min(1, 'From name is required'),
    fromEmail: z.string().email('Invalid email'),
    htmlContent: z.string().min(1, 'Email content is required'),
  }),
  audience: z.object({
    type: z.enum(['ALL', 'SEGMENT', 'CUSTOM']),
    segmentIds: z.array(z.string()).optional(),
  }),
  schedule: z.object({
    type: z.enum(['IMMEDIATE', 'SCHEDULED', 'OPTIMAL_TIME']),
    scheduledAt: z.string().optional(),
  }),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

const campaignTypes: { value: EmailCampaignType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'WELCOME',
    label: 'Welcome Email',
    description: 'Greet new subscribers and customers',
    icon: <Mail className="h-6 w-6" />,
  },
  {
    value: 'ABANDONED_CART',
    label: 'Abandoned Cart',
    description: 'Recover lost sales from cart abandonment',
    icon: <Clock className="h-6 w-6" />,
  },
  {
    value: 'PROMOTIONAL',
    label: 'Promotional',
    description: 'Announce sales, discounts, or special offers',
    icon: <Sparkles className="h-6 w-6" />,
  },
  {
    value: 'PERSONALIZED_RECOMMENDATIONS',
    label: 'AI Recommendations',
    description: 'Send personalized product recommendations',
    icon: <Wand2 className="h-6 w-6" />,
  },
  {
    value: 'WIN_BACK',
    label: 'Win-Back',
    description: 'Re-engage inactive customers',
    icon: <Users className="h-6 w-6" />,
  },
  {
    value: 'PRODUCT_LAUNCH',
    label: 'Product Launch',
    description: 'Announce new products or collections',
    icon: <Send className="h-6 w-6" />,
  },
];

const audienceSegments = [
  { id: 'all-customers', name: 'All Customers', count: 15420 },
  { id: 'new-customers', name: 'New Customers (30 days)', count: 1245 },
  { id: 'vip-customers', name: 'VIP Customers', count: 892 },
  { id: 'cart-abandoners', name: 'Cart Abandoners', count: 2156 },
  { id: 'inactive-30', name: 'Inactive (30+ days)', count: 3421 },
  { id: 'high-value', name: 'High-Value Customers', count: 567 },
];

const emailTemplates = [
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    preview: 'Clean and simple design',
  },
  {
    id: 'bold-promotional',
    name: 'Bold Promotional',
    preview: 'Eye-catching sale template',
  },
  {
    id: 'product-showcase',
    name: 'Product Showcase',
    preview: 'Highlight multiple products',
  },
];

interface EmailAutomationBuilderProps {
  onSuccess?: (campaign: EmailCampaign) => void;
  initialData?: Partial<EmailCampaign>;
}

export function EmailAutomationBuilder({ onSuccess, initialData }: EmailAutomationBuilderProps) {
  const [step, setStep] = React.useState(1);
  const [testEmail, setTestEmail] = React.useState('');
  const [showPreview, setShowPreview] = React.useState(false);
  const totalSteps = 4;

  const createCampaign = useCreateEmailCampaign();
  const sendTest = useSendTestEmail();
  const generateAI = useGenerateAIEmailContent();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || 'PROMOTIONAL',
      content: {
        subject: '',
        preheader: '',
        fromName: 'Your Store',
        fromEmail: 'hello@yourstore.com',
        htmlContent: '',
      },
      audience: {
        type: 'ALL',
        segmentIds: [],
      },
      schedule: {
        type: 'IMMEDIATE',
      },
    },
    mode: 'onChange',
  });

  const watchedType = watch('type');
  const watchedContent = watch('content');
  const watchedAudience = watch('audience');

  const estimatedRecipients = React.useMemo(() => {
    if (watchedAudience.type === 'ALL') {
      return audienceSegments[0].count;
    }
    return (
      watchedAudience.segmentIds?.reduce((sum, id) => {
        const segment = audienceSegments.find((s) => s.id === id);
        return sum + (segment?.count || 0);
      }, 0) || 0
    );
  }, [watchedAudience]);

  const handleGenerateAIContent = async () => {
    try {
      const result = await generateAI.mutateAsync({
        type: watchedType,
        tone: 'friendly',
        length: 'medium',
      });
      setValue('content.subject', result.subject);
      setValue('content.htmlContent', result.content);
    } catch (error) {
      console.error('Failed to generate AI content:', error);
    }
  };

  const handleSendTestEmail = async (campaignId: string) => {
    if (!testEmail) return;
    await sendTest.mutateAsync({ id: campaignId, email: testEmail });
  };

  const onSubmit = async (data: CampaignFormData) => {
    try {
      const campaign = await createCampaign.mutateAsync(data as unknown as Partial<EmailCampaign>);
      onSuccess?.(campaign);
    } catch (error) {
      console.error('Failed to create campaign:', error);
    }
  };

  const nextStep = () => setStep((prev) => Math.min(prev + 1, totalSteps));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const steps = [
    { number: 1, title: 'Campaign Type', description: 'Choose email type' },
    { number: 2, title: 'Content', description: 'Design your email' },
    { number: 3, title: 'Audience', description: 'Select recipients' },
    { number: 4, title: 'Schedule', description: 'When to send' },
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
              <CardTitle>Choose Email Type</CardTitle>
              <CardDescription>
                Select the type of email campaign you want to create
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

        {/* Step 2: Content */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Design Your Email</CardTitle>
                  <CardDescription>
                    Create compelling email content
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateAIContent}
                  disabled={generateAI.isPending}
                >
                  {generateAI.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate with AI
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* From */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">From Name</label>
                  <Input
                    {...register('content.fromName')}
                    placeholder="Your Store"
                    error={errors.content?.fromName?.message}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">From Email</label>
                  <Input
                    {...register('content.fromEmail')}
                    placeholder="hello@yourstore.com"
                    error={errors.content?.fromEmail?.message}
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="text-sm font-medium mb-2 block">Subject Line</label>
                <Input
                  {...register('content.subject')}
                  placeholder="Enter your email subject..."
                  error={errors.content?.subject?.message}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tip: Keep it under 50 characters for best results
                </p>
              </div>

              {/* Preheader */}
              <div>
                <label className="text-sm font-medium mb-2 block">Preheader Text (Optional)</label>
                <Input
                  {...register('content.preheader')}
                  placeholder="Preview text shown in inbox..."
                />
              </div>

              {/* Template Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Email Template</label>
                <div className="grid grid-cols-3 gap-4">
                  {emailTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className="p-4 rounded-lg border hover:border-primary transition-colors text-left"
                    >
                      <div className="aspect-[4/3] bg-muted rounded-md mb-2" />
                      <p className="text-sm font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground">{template.preview}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Editor */}
              <div>
                <label className="text-sm font-medium mb-2 block">Email Content</label>
                <textarea
                  {...register('content.htmlContent')}
                  rows={10}
                  className="w-full p-3 rounded-lg border bg-background resize-none"
                  placeholder="Enter your email content here..."
                />
                {errors.content?.htmlContent && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.content.htmlContent.message}
                  </p>
                )}
              </div>

              {/* Preview Button */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Audience */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Your Audience</CardTitle>
              <CardDescription>
                Choose who will receive this email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Audience Type */}
              <Controller
                name="audience.type"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => field.onChange('ALL')}
                      className={cn(
                        'p-4 rounded-lg border-2 text-center',
                        field.value === 'ALL'
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      )}
                    >
                      <Users className="h-6 w-6 mx-auto mb-2" />
                      <p className="font-medium">All Customers</p>
                      <p className="text-sm text-muted-foreground">
                        {audienceSegments[0].count.toLocaleString()}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange('SEGMENT')}
                      className={cn(
                        'p-4 rounded-lg border-2 text-center',
                        field.value === 'SEGMENT'
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      )}
                    >
                      <Users className="h-6 w-6 mx-auto mb-2" />
                      <p className="font-medium">Segments</p>
                      <p className="text-sm text-muted-foreground">Target specific groups</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange('CUSTOM')}
                      className={cn(
                        'p-4 rounded-lg border-2 text-center',
                        field.value === 'CUSTOM'
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      )}
                    >
                      <Plus className="h-6 w-6 mx-auto mb-2" />
                      <p className="font-medium">Custom</p>
                      <p className="text-sm text-muted-foreground">Create filters</p>
                    </button>
                  </div>
                )}
              />

              {/* Segment Selection */}
              {watchedAudience.type === 'SEGMENT' && (
                <Controller
                  name="audience.segmentIds"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      {audienceSegments.slice(1).map((segment) => (
                        <label
                          key={segment.id}
                          className={cn(
                            'flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors',
                            field.value?.includes(segment.id)
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={field.value?.includes(segment.id)}
                              onChange={(e) => {
                                const newValue = e.target.checked
                                  ? [...(field.value || []), segment.id]
                                  : field.value?.filter((id) => id !== segment.id) || [];
                                field.onChange(newValue);
                              }}
                              className="h-4 w-4 rounded"
                            />
                            <span className="font-medium">{segment.name}</span>
                          </div>
                          <Badge variant="secondary">
                            {segment.count.toLocaleString()} contacts
                          </Badge>
                        </label>
                      ))}
                    </div>
                  )}
                />
              )}

              {/* Estimated Recipients */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Estimated Recipients</p>
                    <p className="text-sm text-muted-foreground">
                      Based on your audience selection
                    </p>
                  </div>
                  <p className="text-2xl font-bold">{estimatedRecipients.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Schedule */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Schedule Your Campaign</CardTitle>
              <CardDescription>
                Choose when to send your email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Schedule Type */}
              <Controller
                name="schedule.type"
                control={control}
                render={({ field }) => (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => field.onChange('IMMEDIATE')}
                      className={cn(
                        'w-full p-4 rounded-lg border-2 text-left',
                        field.value === 'IMMEDIATE'
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Send className="h-5 w-5" />
                        <div>
                          <p className="font-medium">Send Now</p>
                          <p className="text-sm text-muted-foreground">
                            Send immediately after creating
                          </p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange('SCHEDULED')}
                      className={cn(
                        'w-full p-4 rounded-lg border-2 text-left',
                        field.value === 'SCHEDULED'
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5" />
                        <div>
                          <p className="font-medium">Schedule for Later</p>
                          <p className="text-sm text-muted-foreground">
                            Choose a specific date and time
                          </p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange('OPTIMAL_TIME')}
                      className={cn(
                        'w-full p-4 rounded-lg border-2 text-left',
                        field.value === 'OPTIMAL_TIME'
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-5 w-5" />
                        <div>
                          <p className="font-medium">AI Optimal Time</p>
                          <p className="text-sm text-muted-foreground">
                            Let AI determine the best time for each recipient
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              />

              {/* Date/Time Picker */}
              {watch('schedule.type') === 'SCHEDULED' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Schedule Date & Time</label>
                  <Input
                    type="datetime-local"
                    {...register('schedule.scheduledAt')}
                  />
                </div>
              )}

              {/* Test Email */}
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-3">Send Test Email</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="your@email.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!testEmail || sendTest.isPending}
                    onClick={() => handleSendTestEmail('draft')}
                  >
                    {sendTest.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <TestTube className="mr-2 h-4 w-4" />
                    )}
                    Send Test
                  </Button>
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
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium">
                      {campaignTypes.find((t) => t.value === watchedType)?.label || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subject</span>
                    <span className="font-medium truncate max-w-[200px]">
                      {watchedContent.subject || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recipients</span>
                    <span className="font-medium">
                      {estimatedRecipients.toLocaleString()} contacts
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
                  <Send className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
