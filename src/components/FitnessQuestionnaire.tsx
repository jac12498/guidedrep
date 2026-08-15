"use client";

import { useState } from "react";
import {
  AGE_BANDS,
  AVOID_AREAS,
  CAPABILITIES,
  countStrengthDays,
  DEFAULT_PROFILE,
  EQUIPMENT,
  EXPERIENCE,
  GOALS,
  INTENSITY,
  MAX_RECOMMENDED_STRENGTH_DAYS,
  MINUTES_OPTIONS,
  scheduleOf,
  SEX_OPTIONS,
  WEEKDAYS,
  type FitnessProfile,
  type WeekdayActivity,
} from "@/lib/fitness";

const ACTIVITIES: { value: WeekdayActivity; label: string; icon: string }[] = [
  { value: "strength", label: "Strength", icon: "💪" },
  { value: "aerobic", label: "Aerobic", icon: "🚶" },
  { value: "rest", label: "Rest", icon: "🌙" },
];

export default function FitnessQuestionnaire({
  initial,
  submitLabel,
  submitting,
  showProgram,
  onSubmit,
}: {
  initial?: Partial<FitnessProfile>;
  submitLabel: string;
  submitting?: boolean;
  /** Program setup: also ask the capability check + starting intensity. */
  showProgram?: boolean;
  onSubmit: (profile: FitnessProfile) => void;
}) {
  const start = { ...DEFAULT_PROFILE, ...initial };
  const [goal, setGoal] = useState(start.goal);
  const [experience, setExperience] = useState(start.experience);
  const [schedule, setSchedule] = useState<WeekdayActivity[]>(scheduleOf(start));
  const [scheduleAck, setScheduleAck] = useState(false);
  const [sessionMinutes, setMinutes] = useState(start.sessionMinutes);
  const [equipment, setEquipment] = useState<string[]>(start.equipment);
  const [avoid, setAvoid] = useState<string[]>(start.avoid);
  const [avoidNote, setAvoidNote] = useState(start.avoidNote ?? "");
  const [capabilities, setCapabilities] = useState<string[]>(start.capabilities ?? []);
  const [intensity, setIntensity] = useState(start.intensity ?? INTENSITY[1]);
  const [step, setStep] = useState(0);
  const [ageBand, setAgeBand] = useState(start.ageBand ?? "");
  const [sex, setSex] = useState(start.sex ?? "");
  const [heightFt, setHeightFt] = useState(start.heightIn ? Math.floor(start.heightIn / 12) : 0);
  const [heightIn, setHeightIn] = useState(start.heightIn ? start.heightIn % 12 : 0);
  const [weightLb, setWeightLb] = useState(start.weightLb ?? 0);

  function toggle(list: string[], set: (v: string[]) => void, value: string) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  const strengthCount = countStrengthDays(schedule);
  const tooManyStrength = strengthCount > MAX_RECOMMENDED_STRENGTH_DAYS;

  function setDayActivity(i: number, a: WeekdayActivity) {
    setSchedule((prev) => prev.map((v, idx) => (idx === i ? a : v)));
    setScheduleAck(false); // any change re-arms the "too many" confirmation
  }

  function submit() {
    onSubmit({
      goal,
      experience,
      schedule,
      daysPerWeek: strengthCount, // legacy field, derived from the schedule
      sessionMinutes,
      equipment: equipment.length ? equipment : ["Bodyweight only"],
      avoid,
      avoidNote: avoidNote.trim() || undefined,
      ageBand: ageBand || undefined,
      sex: sex || undefined,
      heightIn: heightFt > 0 ? heightFt * 12 + heightIn : undefined,
      weightLb: weightLb > 0 ? weightLb : undefined,
      capabilities: showProgram ? capabilities : start.capabilities,
      intensity: showProgram ? intensity : start.intensity,
      updatedAt: undefined, // stamped server-side
    });
  }

  // Grouped into a few short screens so the questionnaire feels light and builds
  // investment. Program setup gets an extra "where you're starting" step.
  const steps: { title: string; hint?: string; render: () => React.ReactNode }[] = [
    {
      title: "Your goal",
      render: () => (
        <>
          <Field label="What's your main goal?">
            <Chips options={GOALS} value={goal} onChange={setGoal} />
          </Field>
          <Field label="How would you describe yourself?">
            <Chips options={EXPERIENCE} value={experience} onChange={setExperience} />
          </Field>
        </>
      ),
    },
    {
      title: "Your week",
      render: () => (
        <>
          <Field label="Plan each day" hint="Strength, aerobic, or rest">
            <div className="space-y-1.5">
              {WEEKDAYS.map((w, i) => (
                <div key={w.code} className="flex items-center gap-2">
                  <span className="w-9 shrink-0 text-sm font-medium text-muted">{w.short}</span>
                  <div className="flex flex-1 gap-1">
                    {ACTIVITIES.map((a) => {
                      const active = schedule[i] === a.value;
                      return (
                        <button
                          key={a.value}
                          type="button"
                          onClick={() => setDayActivity(i, a.value)}
                          className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium transition ${
                            active
                              ? "bg-brand text-black"
                              : "bg-surface-2 text-muted hover:text-foreground"
                          }`}
                        >
                          <span aria-hidden>{a.icon}</span>
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {strengthCount === 0 ? (
              <p className="mt-3 rounded-xl bg-yellow-500/10 p-3 text-sm text-foreground">
                Pick at least one <strong>strength</strong> day to build a program.
              </p>
            ) : tooManyStrength ? (
              <div className="mt-3 rounded-xl border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">
                <p>
                  ⚠️ {strengthCount} strength days is a lot — most people need a rest or aerobic day
                  between strength sessions to recover well.
                </p>
                <label className="mt-2 flex items-start gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={scheduleAck}
                    onChange={(e) => setScheduleAck(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>Yes, keep {strengthCount} strength days — I recover fine.</span>
                </label>
              </div>
            ) : null}
          </Field>
          <Field label="Time per session">
            <Chips
              options={MINUTES_OPTIONS.map((m) => `${m} min`)}
              value={`${sessionMinutes} min`}
              onChange={(v) => setMinutes(Number(v.replace(" min", "")))}
            />
          </Field>
        </>
      ),
    },
    {
      title: "Equipment & injuries",
      render: () => (
        <>
          <Field label="What equipment do you have?" hint="Pick any that apply">
            <MultiChips
              options={EQUIPMENT}
              values={equipment}
              onToggle={(v) => toggle(equipment, setEquipment, v)}
            />
          </Field>
          <Field label="Anything to go easy on?" hint="We'll avoid loading these areas">
            <MultiChips options={AVOID_AREAS} values={avoid} onToggle={(v) => toggle(avoid, setAvoid, v)} />
            <input
              value={avoidNote}
              onChange={(e) => setAvoidNote(e.target.value)}
              placeholder="Anything else? (optional)"
              className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </Field>
        </>
      ),
    },
    ...(showProgram
      ? [
          {
            title: "Where you're starting",
            hint: "This calibrates where your program begins",
            render: () => (
              <>
                <Field label="Which of these can you do comfortably right now?" hint="Pick any">
                  <MultiChips
                    options={CAPABILITIES}
                    values={capabilities}
                    onToggle={(v) => toggle(capabilities, setCapabilities, v)}
                  />
                </Field>
                <Field label="How hard should we start?">
                  <Chips options={INTENSITY} value={intensity} onChange={setIntensity} />
                </Field>
              </>
            ),
          },
        ]
      : []),
    {
      title: "A few optional extras",
      hint: "Helps personalize and track progress — skip anything",
      render: () => (
        <>
          <Field label="Age range">
            <Chips options={AGE_BANDS} value={ageBand} onChange={setAgeBand} allowEmpty />
          </Field>
          <Field label="Sex">
            <Chips options={SEX_OPTIONS} value={sex} onChange={setSex} allowEmpty />
          </Field>
          <div className="flex flex-wrap gap-4">
            <div>
              <span className="mb-1 block text-sm font-medium">Height</span>
              <div className="flex items-center gap-2">
                <SelectNum value={heightFt} onChange={setHeightFt} min={3} max={7} suffix="ft" placeholder="—" />
                <SelectNum value={heightIn} onChange={setHeightIn} min={0} max={11} suffix="in" />
              </div>
            </div>
            <div>
              <span className="mb-1 block text-sm font-medium">Weight</span>
              <NumInput value={weightLb} onChange={setWeightLb} suffix="lb" width="w-24" />
            </div>
          </div>
        </>
      ),
    },
  ];

  const current = Math.min(step, steps.length - 1);
  const isLast = current === steps.length - 1;
  // The schedule step ("Your week") is index 1 — block advancing until it's valid.
  const scheduleBlocked =
    current === 1 && (strengthCount === 0 || (tooManyStrength && !scheduleAck));

  return (
    <div>
      {/* progress */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>
            Step {current + 1} of {steps.length}
          </span>
          <span className="font-medium text-foreground/80">{steps[current].title}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
            style={{ width: `${((current + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div key={current} className="qstep space-y-6">
        {steps[current].hint ? (
          <p className="text-sm text-muted">{steps[current].hint}</p>
        ) : null}
        {steps[current].render()}
      </div>

      <div className="mt-7 flex items-center gap-3">
        {current > 0 ? (
          <button
            type="button"
            onClick={() => setStep(current - 1)}
            className="rounded-2xl bg-surface-2 px-5 py-3.5 font-semibold transition hover:bg-border"
          >
            Back
          </button>
        ) : null}
        {isLast ? (
          <button
            onClick={submit}
            disabled={submitting || scheduleBlocked}
            className="flex-1 rounded-2xl bg-brand py-3.5 font-bold text-black disabled:opacity-60"
          >
            {submitting ? "Working…" : submitLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep(current + 1)}
            disabled={scheduleBlocked}
            className="flex-1 rounded-2xl bg-brand py-3.5 font-bold text-black disabled:opacity-60"
          >
            Next
          </button>
        )}
      </div>

      <style>{`.qstep{animation:qfade .25s ease}@keyframes qfade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.qstep{animation:none}}`}</style>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2">
        <span className="block text-sm font-medium">{label}</span>
        {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Chips({
  options,
  value,
  onChange,
  allowEmpty,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  allowEmpty?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(allowEmpty && active ? "" : o)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              active ? "bg-brand text-black" : "bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function MultiChips({
  options,
  values,
  onToggle,
}: {
  options: readonly string[];
  values: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = values.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              active ? "bg-brand text-black" : "bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function SelectNum({
  value,
  onChange,
  min,
  max,
  suffix,
  placeholder,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix: string;
  placeholder?: string;
}) {
  const opts: number[] = [];
  for (let i = min; i <= max; i++) opts.push(i);
  return (
    <label className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-2 py-2">
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-transparent outline-none tnum"
      >
        {placeholder ? <option value={0}>{placeholder}</option> : null}
        {opts.map((i) => (
          <option key={i} value={i}>
            {i}
          </option>
        ))}
      </select>
      <span className="text-xs text-muted">{suffix}</span>
    </label>
  );
}

function NumInput({
  value,
  onChange,
  suffix,
  width,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix: string;
  width: string;
}) {
  return (
    <label className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-2 py-2">
      <input
        type="number"
        min={0}
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className={`${width} bg-transparent text-center outline-none tnum`}
      />
      <span className="text-xs text-muted">{suffix}</span>
    </label>
  );
}
