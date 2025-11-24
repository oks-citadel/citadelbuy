'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  endTime: string;
  startTime?: string;
  onComplete?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showDays?: boolean;
  showIcon?: boolean;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  status: 'upcoming' | 'active' | 'ended';
}

const SIZE_CONFIG = {
  sm: {
    container: 'text-xs',
    unit: 'text-base font-bold',
    label: 'text-[10px]',
    icon: 'h-3 w-3',
  },
  md: {
    container: 'text-sm',
    unit: 'text-2xl font-bold',
    label: 'text-xs',
    icon: 'h-4 w-4',
  },
  lg: {
    container: 'text-base',
    unit: 'text-4xl font-bold',
    label: 'text-sm',
    icon: 'h-5 w-5',
  },
};

export function CountdownTimer({
  endTime,
  startTime,
  onComplete,
  size = 'md',
  showDays = true,
  showIcon = true,
  className,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());
  const config = SIZE_CONFIG[size];

  function calculateTimeLeft(): TimeLeft {
    const now = new Date();
    const start = startTime ? new Date(startTime) : null;
    const end = new Date(endTime);

    // Check if upcoming
    if (start && now < start) {
      const diff = start.getTime() - now.getTime();
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        status: 'upcoming',
      };
    }

    // Check if ended
    if (now > end) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        status: 'ended',
      };
    }

    // Active - count down to end
    const diff = end.getTime() - now.getTime();
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / 1000 / 60) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      status: 'active',
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      // Call onComplete when timer reaches zero
      if (
        newTimeLeft.status === 'ended' &&
        timeLeft.status !== 'ended' &&
        onComplete
      ) {
        onComplete();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, startTime]);

  if (timeLeft.status === 'ended') {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', config.container, className)}>
        {showIcon && <Clock className={config.icon} />}
        <span>Deal Ended</span>
      </div>
    );
  }

  const statusColor = timeLeft.status === 'upcoming' ? 'text-blue-600' : 'text-red-600';

  return (
    <div className={cn('flex items-center gap-3', config.container, className)}>
      {showIcon && <Clock className={cn(config.icon, statusColor)} />}

      <div className="flex items-center gap-2">
        {showDays && timeLeft.days > 0 && (
          <>
            <TimeUnit value={timeLeft.days} label="days" config={config} />
            <span className={cn('font-bold', config.unit)}>:</span>
          </>
        )}

        <TimeUnit value={timeLeft.hours} label="hrs" config={config} />
        <span className={cn('font-bold', config.unit)}>:</span>

        <TimeUnit value={timeLeft.minutes} label="min" config={config} />
        <span className={cn('font-bold', config.unit)}>:</span>

        <TimeUnit value={timeLeft.seconds} label="sec" config={config} />
      </div>

      {timeLeft.status === 'upcoming' && (
        <span className="text-xs text-muted-foreground ml-2">
          Starts Soon
        </span>
      )}
    </div>
  );
}

function TimeUnit({
  value,
  label,
  config,
}: {
  value: number;
  label: string;
  config: typeof SIZE_CONFIG[keyof typeof SIZE_CONFIG];
}) {
  const formattedValue = value.toString().padStart(2, '0');

  return (
    <div className="flex flex-col items-center">
      <span className={cn('tabular-nums', config.unit)}>{formattedValue}</span>
      <span className={cn('text-muted-foreground uppercase', config.label)}>
        {label}
      </span>
    </div>
  );
}
