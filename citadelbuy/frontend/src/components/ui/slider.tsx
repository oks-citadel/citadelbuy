'use client';

import * as React from 'react';

export interface SliderProps {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      value: controlledValue,
      defaultValue = [0],
      onValueChange,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      className = '',
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const value = controlledValue ?? internalValue;

    const handleChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = [...value];
      newValue[index] = Number(e.target.value);

      if (!controlledValue) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    };

    const percentage = ((value[0] - min) / (max - min)) * 100;

    return (
      <div ref={ref} className={`relative flex items-center w-full ${className}`}>
        <div className="relative w-full h-2 bg-gray-200 rounded-full">
          <div
            className="absolute h-2 bg-blue-600 rounded-full"
            style={{ width: `${percentage}%` }}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value[0]}
            onChange={handleChange(0)}
            disabled={disabled}
            className="absolute w-full h-2 opacity-0 cursor-pointer"
          />
          <div
            className="absolute w-4 h-4 bg-white border-2 border-blue-600 rounded-full -top-1 shadow-md"
            style={{ left: `calc(${percentage}% - 0.5rem)` }}
          />
        </div>
      </div>
    );
  }
);

Slider.displayName = 'Slider';
