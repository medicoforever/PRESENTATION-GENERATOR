
import React from 'react';

interface NumberInputProps {
  label: string;
  value: number; // Can be NaN if input is empty/invalid
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const NumberInput: React.FC<NumberInputProps> = ({ label, value, onChange, min = 1, max = 100, step = 1 }) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    if (rawValue === '') {
      onChange(NaN); // Indicate empty/invalid input
      return;
    }
    const numValue = parseInt(rawValue, 10);
    if (!isNaN(numValue)) {
      // Ensure value is within min/max if they are numbers
      let validatedValue = numValue;
      if (typeof min === 'number') {
        validatedValue = Math.max(min, validatedValue);
      }
      if (typeof max === 'number') {
        validatedValue = Math.min(max, validatedValue);
      }
      onChange(validatedValue);
    } else {
      // If parseInt results in NaN for a non-empty string (e.g. "abc")
      // We can choose to call onChange(NaN) or do nothing.
      // Calling onChange(NaN) makes the behavior consistent.
      onChange(NaN);
    }
  };

  return (
    <div className="w-full">
      <label htmlFor="number-input" className="block text-sm font-medium text-slate-300">
        {label}
      </label>
      <input
        type="number"
        id="number-input"
        value={isNaN(value) ? '' : value} // Display NaN as empty string
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm shadow-sm placeholder-slate-400
                   focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500
                   disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none"
      />
    </div>
  );
};

export default NumberInput;