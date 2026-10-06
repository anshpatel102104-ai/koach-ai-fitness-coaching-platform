import React from 'react';
import { Dumbbell } from 'lucide-react';
import { BSSection, BSRow, BSSelect, BSInput, BSTextarea, BSGroup } from './BSSection';

const MACRO_METHODS = [
  { value: 'manual', label: 'Manual (coach sets custom macros)' },
  { value: 'auto', label: 'Auto-calculate (based on client stats)' },
  { value: 'harris_benedict', label: 'Harris-Benedict formula' },
  { value: 'mifflin_st_jeor', label: 'Mifflin-St Jeor formula' },
];

const DEFAULTS = {
  program_progression: 'manual', progression_completion_pct: 80,
  progression_adherence_pct: 80, progression_adherence_weeks: 2,
  default_rest_day_text: '', default_program_notes: '',
  macro_method: 'manual', default_protein_per_lb: 1.0,
  default_deficit_pct: 15, default_surplus_pct: 10,
  default_water_liters: 2.5, default_meal_frequency: 3,
};

export default function BSProgramNutrition({ s, set }) {
  return (
    <BSSection icon={Dumbbell} title="Programs and nutrition" subtitle="Starting points for every new program and meal plan." onReset={() => Object.entries(DEFAULTS).forEach(([k, v]) => set(k, v))}>
      <BSGroup>Program settings</BSGroup>
      <BSRow label="Program progression" hint="How a client moves on to their next program.">
        <div className="space-y-3">
          <BSSelect value={s.program_progression} onChange={v => set('program_progression', v)}
            options={[{ value: 'manual', label: 'Manual, you decide' }, { value: 'auto', label: 'Automatic, by the rules below' }]} />
          {s.program_progression === 'auto' && (
            <div className="space-y-3 rounded-lg bg-secondary p-4">
              <p className="text-[13px] font-semibold text-foreground">Move a client on when</p>
              <div className="flex items-center gap-2">
                                <BSInput type="number" value={s.progression_completion_pct} onChange={v => set('progression_completion_pct', v)} min={0} max={100} className="w-20" />
                <span className="text-sm text-muted-foreground">% of program completed</span>
              </div>
              <div className="flex items-center gap-2">
                                <BSInput type="number" value={s.progression_adherence_pct} onChange={v => set('progression_adherence_pct', v)} min={0} max={100} className="w-20" />
                <span className="text-sm text-muted-foreground">% adherence for</span>
                <BSInput type="number" value={s.progression_adherence_weeks} onChange={v => set('progression_adherence_weeks', v)} min={1} className="w-16" />
                <span className="text-sm text-muted-foreground">weeks</span>
              </div>
            </div>
          )}
        </div>
      </BSRow>
      <BSRow label="Default rest day text" hint="What clients see on a rest day.">
        <BSTextarea value={s.default_rest_day_text} onChange={v => set('default_rest_day_text', v)}
          placeholder="Today is a rest day. Focus on recovery — sleep, hydration, and light movement." rows={2} />
      </BSRow>
      <BSRow label="Default program notes" hint="Shown at the top of every program.">
        <BSTextarea value={s.default_program_notes} onChange={v => set('default_program_notes', v)}
          placeholder="Shown at the top of every program" rows={3} />
      </BSRow>
      <BSGroup>Nutrition settings</BSGroup>
      <BSRow label="Macro calculation method">
        <BSSelect value={s.macro_method} onChange={v => set('macro_method', v)} options={MACRO_METHODS} />
      </BSRow>
      <BSRow label="Default protein target">
        <div className="flex items-center gap-2">
          <BSInput type="number" value={s.default_protein_per_lb} onChange={v => set('default_protein_per_lb', v)} min={0.5} max={2} className="w-24" />
          <span className="text-sm text-muted-foreground">g per lb of bodyweight</span>
        </div>
      </BSRow>
      <BSRow label="Calorie deficit (weight loss)">
        <div className="flex items-center gap-2">
          <BSInput type="number" value={s.default_deficit_pct} onChange={v => set('default_deficit_pct', v)} min={5} max={40} className="w-24" />
          <span className="text-sm text-muted-foreground">% below TDEE</span>
        </div>
      </BSRow>
      <BSRow label="Calorie surplus (muscle gain)">
        <div className="flex items-center gap-2">
          <BSInput type="number" value={s.default_surplus_pct} onChange={v => set('default_surplus_pct', v)} min={2} max={30} className="w-24" />
          <span className="text-sm text-muted-foreground">% above TDEE</span>
        </div>
      </BSRow>
      <BSRow label="Daily water intake goal">
        <div className="flex items-center gap-2">
          <BSInput type="number" value={s.default_water_liters} onChange={v => set('default_water_liters', v)} min={1} max={6} className="w-24" />
          <span className="text-sm text-muted-foreground">liters per day</span>
        </div>
      </BSRow>
      <BSRow label="Default meal frequency">
        <div className="flex items-center gap-2">
          <BSInput type="number" value={s.default_meal_frequency} onChange={v => set('default_meal_frequency', v)} min={2} max={8} className="w-24" />
          <span className="text-sm text-muted-foreground">meals per day</span>
        </div>
      </BSRow>
    </BSSection>
  );
}