"use client";
import { Input } from "./Input";

interface DatePickerProps {
  label?: string;
  value: string; // yyyy-mm-dd
  onChange: (value: string) => void;
  min?: string;
  required?: boolean;
}

export function DatePicker({ label, value, onChange, min, required }: DatePickerProps) {
  return (
    <Input
      type="date"
      label={label}
      value={value}
      min={min}
      required={required}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
