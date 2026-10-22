"use client";

import { useEffect, useState } from "react";
import type { FeedbackInput, ResearchState, Stage } from "@/lib/research/contracts";
import { CONSENT_VERSION, STAGE_LABELS, STATUS_LABELS } from "@/lib/research/contracts";

async function request(url: string, method = "GET", body?: unknown) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Could not save. Please try again.");
  return data;
}
export function ResearchDashboard() {
  const [data, setData] = useState<ResearchState>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => setData(await request("/api/research"));
  useEffect(() => { load().catch(e => setError(e.message)); }, []);
  const consent = async (enabled: boolean) => {
    setBusy(true); setError("");
    try { await request("/api/research", "POST", { enabled, policyVersion: CONSENT_VERSION }); await load(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return <div className="space-y-6">
    <h1 className="text-2xl font-bold">Relationship check-ins</h1>
    <p>Help us learn whether introductions lead to relationships both people enjoy and want to continue.</p>
    <div className="rounded-2xl bg-white p-5 space-y-4 border border-gray-200">
      <p className="text-sm text-gray-600">Participation is optional and does not change your ranking. If you join, we record your questionnaire, priorities, and optional personality answers when future matches form. Your check-ins and those saved answers may be used to evaluate and improve matching within this app. They are private from other users and are not sent to external AI services.</p>
      <p className="text-sm text-gray-600">You can export your records or withdraw and delete them at any time. Unmatching deletes check-ins for that match. Choosing not to respond is never treated as a failed relationship.</p>
      {data && (data.consent.enabled ? <>
        <p className="font-semibold text-emerald-700">You have opted in.</p>
        <a className="inline-block underline mr-4" href="/api/research/export">Download my research data</a>
        <button disabled={busy} className="text-red-700 underline disabled:opacity-50" onClick={() => consent(false)}>Stop participating and delete my research data</button>
      </> : <button disabled={busy} onClick={() => consent(true)} className="rounded-xl bg-rose-600 text-white px-5 py-3 disabled:opacity-50">I agree to participate</button>)}
    </div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!data && !error && <p>Loading…</p>}
    {data?.consent.enabled && data.matches.length === 0 && <p>Your matches will appear here. No check-in is required to keep using the app.</p>}
    {data?.consent.enabled && data.matches.map(match => <CheckIn key={match.id} match={match} onSaved={load} />)}
  </div>;
}

function CheckIn({ match, onSaved }: { match: ResearchState["matches"][number]; onSaved: () => Promise<void> }) {
  const [stage, setStage] = useState<Stage>("AFTER_MEETING");
  const blank = (next: Stage): FeedbackInput => ({ matchId: match.id, stage: next, status: "NOT_MET", metAt: null,
    relationshipStartedAt: null, satisfaction: null, respect: null, wantsToContinue: null });
  const [form, setForm] = useState<FeedbackInput>(() => {
    const previous = match.reports.find(r => r.stage === "AFTER_MEETING");
    return previous ? { ...blank("AFTER_MEETING"), ...previous, metAt: previous.metAt ? String(previous.metAt).slice(0, 10) : null,
      relationshipStartedAt: previous.relationshipStartedAt ? String(previous.relationshipStartedAt).slice(0, 10) : null } : blank("AFTER_MEETING");
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const chooseStage = (next: Stage) => {
    const report = match.reports.find(r => r.stage === next);
    const latest = [...match.reports].reverse().find(r => r.relationshipStartedAt);
    setStage(next); setMessage(""); setError("");
    setForm(report ? { ...blank(next), ...report, metAt: report.metAt ? String(report.metAt).slice(0, 10) : null,
      relationshipStartedAt: report.relationshipStartedAt ? String(report.relationshipStartedAt).slice(0, 10) : null }
      : { ...blank(next), status: next === "AFTER_MEETING" ? "NOT_MET" : "IN_RELATIONSHIP",
        metAt: latest?.metAt ? String(latest.metAt).slice(0, 10) : null,
        relationshipStartedAt: latest?.relationshipStartedAt ? String(latest.relationshipStartedAt).slice(0, 10) : null });
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      // Send only contract fields, never identifiers from a saved report.
      const payload = { ...blank(stage), status: form.status, metAt: form.metAt, relationshipStartedAt: form.relationshipStartedAt,
        satisfaction: form.satisfaction, respect: form.respect, wantsToContinue: form.wantsToContinue };
      await request("/api/research/follow-ups", "POST", payload); await onSaved(); setMessage("Your private check-in was saved.");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const selectClass = "block mt-2 w-full border border-gray-300 rounded-lg p-3 bg-white";
  return <form onSubmit={save} className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
    <h2 className="text-lg font-semibold">Your connection with {match.name}</h2>
    <p className="text-sm text-gray-500">Only your responses appear here. Your match cannot see them.</p>
    <label className="block text-sm">Check-in
      <select className={selectClass} value={stage} onChange={e => chooseStage(e.target.value as Stage)}>
        {match.checkpoints.map(c => <option key={c.stage} value={c.stage} disabled={!c.available}>
          {STAGE_LABELS[c.stage]}{match.reports.some(r => r.stage === c.stage) ? " (saved)" : ""}{!c.available ? c.dueAt ? ` — due ${c.dueAt.slice(0, 10)}` : " — after a relationship starts" : ""}
        </option>)}
      </select>
    </label>
    <label className="block text-sm">Where do things stand?
      <select className={selectClass} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as FeedbackInput["status"],
        ...(e.target.value === "NOT_MET" ? { metAt: null, relationshipStartedAt: null, satisfaction: null, respect: null, wantsToContinue: null }
          : e.target.value === "GETTING_TO_KNOW" ? { relationshipStartedAt: null } : {}) })}>
        {Object.entries(STATUS_LABELS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      </select>
    </label>
    {form.status !== "NOT_MET" && <>
      <label className="block text-sm">When did you first meet in person?
        <input type="date" required className={selectClass} value={form.metAt ?? ""} onChange={e => setForm({ ...form, metAt: e.target.value || null })} />
      </label>
      {form.status !== "GETTING_TO_KNOW" && <label className="block text-sm">When did the relationship begin? {form.status === "ENDED" && "(optional if you only dated)"}
        <input type="date" required={form.status === "IN_RELATIONSHIP"} className={selectClass} value={form.relationshipStartedAt ?? ""} onChange={e => setForm({ ...form, relationshipStartedAt: e.target.value || null })} />
      </label>}
      {([ ["satisfaction", "How satisfied are you with this connection?", "Very dissatisfied", "Very satisfied"],
        ["respect", "How respected did you feel in your interactions?", "Not at all respected", "Very respected"] ] as const).map(([key, label, low, high]) =>
        <label key={key} className="block text-sm">{label}
          <select className={selectClass} value={form[key] ?? ""} onChange={e => setForm({ ...form, [key]: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Skip this rating</option>{[1, 2, 3, 4, 5, 6, 7].map(v => <option key={v} value={v}>{v}{v === 1 ? ` — ${low}` : v === 7 ? ` — ${high}` : ""}</option>)}
          </select>
        </label>)}
      <label className="block text-sm">Do you want this connection to continue?
        <select className={selectClass} value={form.wantsToContinue ?? ""} onChange={e => setForm({ ...form, wantsToContinue: (e.target.value || null) as FeedbackInput["wantsToContinue"] })}>
          <option value="">Skip this question</option><option value="YES">Yes</option><option value="NO">No</option><option value="UNSURE">Not sure</option>
        </select>
      </label>
    </>}
    {error && <p role="alert" className="text-red-700">{error}</p>}{message && <p role="status" className="text-emerald-700">{message}</p>}
    <button disabled={busy} className="rounded-xl bg-rose-600 text-white px-5 py-3 disabled:opacity-50">{busy ? "Saving…" : "Save private check-in"}</button>
  </form>;
}
