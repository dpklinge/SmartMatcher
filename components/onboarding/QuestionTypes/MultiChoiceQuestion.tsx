"use client";

import { cn } from "@/lib/utils";

interface Props {
  options: string[];
  value?: string[];
  single?: boolean;
  onChange: (v: string | string[]) => void;
}

export function MultiChoiceQuestion({ options, value = [], single = false, onChange }: Props) {
  const toggle = (option: string) => {
    if (single) {
      onChange(option);
      return;
    }
    const current = value as string[];
    if (current.includes(option)) {
      onChange(current.filter((v) => v !== option));
    } else {
      onChange([...current, option]);
    }
  };

  const isSelected = (option: string) => {
    if (single) {
      if (Array.isArray(value)) return value[0] === option;
      return (value as unknown as string) === option;
    }
    return (value as string[]).includes(option);
  };

  return (
    <div className="space-y-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => toggle(option)}
          className={cn(
            "w-full px-4 py-3 rounded-xl border-2 text-left font-medium transition-all",
            isSelected(option)
              ? "border-rose-500 bg-rose-50 text-rose-700"
              : "border-gray-100 bg-gray-50 text-gray-700 hover:border-rose-200"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
              isSelected(option) ? "border-rose-500 bg-rose-500" : "border-gray-300"
            )}>
              {isSelected(option) && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            {option}
          </div>
        </button>
      ))}
    </div>
  );
}
