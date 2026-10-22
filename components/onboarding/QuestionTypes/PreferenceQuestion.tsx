"use client";

import type { PreferenceAnswer, Question } from "@/types/questionnaire";
import { isPreferenceAnswer, PRIVATE_ANSWER } from "@/lib/questionnaire/answers";

export function PreferenceQuestion({ question, value, onChange }: {
  question: Question; value: unknown; onChange: (value: PreferenceAnswer) => void;
}) {
  const answer = isPreferenceAnswer(value) ? value : { self: "", acceptable: [], required: false };
  const options = question.options ?? [];
  return <div className="space-y-5">
    <label className="block text-sm font-semibold text-gray-700">
      Your answer
      <select className="mt-2 block w-full rounded-xl border border-gray-300 bg-white p-3"
        value={answer.self} onChange={event => onChange({ ...answer, self: event.target.value })}>
        <option value="" disabled>Choose an answer</option>
        {[...options, PRIVATE_ANSWER].map(option => <option key={option}>{option}</option>)}
      </select>
    </label>
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-semibold text-gray-700">Answers you would accept in a partner</legend>
      {options.map(option => <label key={option} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm">
        <input type="checkbox" checked={answer.acceptable.includes(option)} onChange={event => onChange({
          ...answer, acceptable: event.target.checked ? [...answer.acceptable, option] : answer.acceptable.filter(v => v !== option),
        })} />{option}
      </label>)}
      <button type="button" className="text-sm text-rose-600 underline" onClick={() => onChange({ ...answer, acceptable: [...options] })}>
        Accept any of these answers
      </button>
    </fieldset>
    <label className="flex items-start gap-3 rounded-xl bg-rose-50 p-3 text-sm text-gray-700">
      <input type="checkbox" className="mt-1" checked={answer.required}
        onChange={event => onChange({ ...answer, required: event.target.checked })} />
      This is a firm requirement. Only introduce people whose answer is known and accepted above.
    </label>
  </div>;
}
