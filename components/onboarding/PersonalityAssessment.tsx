"use client";
import { useEffect, useState } from "react";
import { PERSONALITY_ITEMS, PERSONALITY_ANCHORS, PERSONALITY_VERSION } from "@/lib/questionnaire/personality";

export function PersonalityAssessment() {
  const [answers, setAnswers] = useState<(number | null)[]>(Array(20).fill(null));
  const [scores, setScores] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const load = async () => {
    const response = await fetch("/api/personality");
    if (!response.ok) throw new Error("Could not load your responses.");
    const data = await response.json(); setAnswers(data.answers ?? Array(20).fill(null)); setScores(data.scores);
  };
  useEffect(() => { load().catch(e => setError(e.message)).finally(() => setBusy(false)); }, []);
  const save = async (method: "POST" | "DELETE") => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/personality", { method, headers: { "Content-Type": "application/json" },
        ...(method === "POST" ? { body: JSON.stringify({ version: PERSONALITY_VERSION, answers }) } : {}) });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not save your responses.");
      await load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return <div className="space-y-5">
    <h1 className="text-2xl font-bold">Optional personality reflection</h1>
    <p className="text-sm text-gray-600">Describe yourself as you generally are now. Rate how accurately each statement describes you. This 20-item Mini-IPIP provides a brief, imperfect view of broad traits. It is private, is not a diagnosis, and does not affect matching rank.</p>
    <p className="text-sm text-gray-600">If you opt into relationship check-ins, these answers may also be recorded when future matches form to evaluate matching. You can delete your responses and saved research copies below.</p>
    {PERSONALITY_ITEMS.map((item, i) => <label key={i} className="block bg-white border rounded-xl p-4 text-sm">{i + 1}. {item}
      <select disabled={busy} className="block w-full mt-2 border rounded-lg p-3" value={answers[i] ?? ""}
        onChange={e => setAnswers(prev => prev.map((v, j) => i === j ? Number(e.target.value) : v))}>
        <option value="" disabled>Choose an answer</option>{PERSONALITY_ANCHORS.map((a, j) => <option key={a} value={j + 1}>{a}</option>)}
      </select>
    </label>)}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <button disabled={busy || answers.some(a => a === null)} onClick={() => save("POST")} className="rounded-xl bg-rose-600 px-5 py-3 text-white disabled:opacity-50">Save and view my scores</button>
    <button disabled={busy} onClick={() => save("DELETE")} className="ml-4 text-red-700 underline disabled:opacity-50">Delete my personality responses</button>
    {scores && <div className="rounded-xl bg-white p-5 space-y-2"><h2 className="font-bold">Your scores on a 1–5 scale</h2>
      {Object.entries(scores).map(([label, score]) => <p key={label}>{label}: {score.toFixed(2)}</p>)}
      <p className="text-sm text-gray-500">Higher means more of the named trait; these are not quality ratings or population percentiles. Short scales have measurement uncertainty.</p>
    </div>}
    <p className="text-xs text-gray-500">Public-domain items: <a className="underline" href="https://ipip.ori.org/MiniIPIPKey.htm">IPIP Mini-IPIP scoring key</a>. Donnellan et al. (2006).</p>
  </div>;
}
