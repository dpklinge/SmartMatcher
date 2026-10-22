"use client";

import type { Question } from "@/types/questionnaire";
import { ScaleQuestion } from "./QuestionTypes/ScaleQuestion";
import { MultiChoiceQuestion } from "./QuestionTypes/MultiChoiceQuestion";
import { RankQuestion } from "./QuestionTypes/RankQuestion";
import { PreferenceQuestion } from "./QuestionTypes/PreferenceQuestion";

interface Props {
  question: Question;
  value: unknown;
  onChange: (v: unknown) => void;
}

export function QuestionCard({ question, value, onChange }: Props) {
  const renderInput = () => {
    switch (question.type) {
      case "PREFERENCE":
        return <PreferenceQuestion question={question} value={value} onChange={onChange} />;
      case "SCALE":
        return (
          <ScaleQuestion
            questionId={question.id}
            minLabel={question.minLabel}
            maxLabel={question.maxLabel}
            value={value as number}
            onChange={(v) => onChange(v)}
          />
        );
      case "SINGLE_CHOICE":
        return (
          <MultiChoiceQuestion
            options={question.options ?? []}
            value={value ? [value as string] : []}
            single
            onChange={(v) => onChange(v)}
          />
        );
      case "MULTI_CHOICE":
        return (
          <MultiChoiceQuestion
            options={question.options ?? []}
            value={value as string[] ?? []}
            onChange={(v) => onChange(v)}
          />
        );
      case "RANK":
        return (
          <RankQuestion
            options={question.options ?? []}
            value={value as string[] ?? question.options}
            onChange={(v) => onChange(v)}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-lg font-semibold text-gray-800 leading-snug">{question.text}</p>
      <p className="text-sm text-gray-500">{question.required ? "Required card" : "Optional"} · {question.description}</p>
      {renderInput()}
      {!question.required && <button type="button" onClick={() => onChange(null)} className="text-sm text-gray-500 underline">
        {value === null ? "Skipped" : "Skip this question"}
      </button>}
    </div>
  );
}
