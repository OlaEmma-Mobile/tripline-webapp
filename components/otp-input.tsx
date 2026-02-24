'use client';

import type React from 'react';
import { useRef, useState } from 'react';

interface OtpInputProps {
  length?: number;
  onComplete?: (value: string) => void;
}

export default function OtpInput({ length = 4, onComplete }: OtpInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const focusInput = (index: number) => {
    const target = inputsRef.current[index];
    if (target) {
      target.focus();
      target.select();
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;

    const nextValues = [...values];
    nextValues[index] = value;
    setValues(nextValues);

    if (value && index < length - 1) {
      focusInput(index + 1);
    }

    if (nextValues.every((digit) => digit.length === 1)) {
      onComplete?.(nextValues.join(''));
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && values[index] === '' && index > 0) {
      focusInput(index - 1);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const data = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!data) return;

    const nextValues = Array(length).fill('');
    data.split('').forEach((char, idx) => {
      nextValues[idx] = char;
    });
    setValues(nextValues);

    const lastIndex = Math.min(data.length, length) - 1;
    focusInput(lastIndex);

    if (data.length === length) {
      onComplete?.(data);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {values.map((value, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          className="h-14 w-14 rounded-xl border border-input bg-background text-center text-2xl font-semibold text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
