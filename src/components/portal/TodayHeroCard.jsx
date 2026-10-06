import React from 'react';
import { Bell, Check } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Rough session length from the prescribed sets (about 2.5 min a set, 30 min floor). */
export function estimateMinutes(exercises = []) {
  const sets = exercises.reduce((t, ex) => t + (Number(ex.sets) || 3), 0);
  return Math.max(30, Math.round((sets * 2.5) / 5) * 5);
}

function HeroIconButton({ onClick, label, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn('touch-compact relative inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/15 transition-colors', className)}
    >
      {children}
    </button>
  );
}

/**
 * Client Today hero — the graphite block at the top of the client app.
 * Holds the logo, the date, today's session and the one action that matters
 * (brand blue). Always dark, in both themes.
 */
export default function TodayHeroCard({
  program,
  todayWorkout,
  workoutDone,
  onStartWorkout,
  weekNumber,
  unreadNotifications = 0,
  onNotifications,
  userName,
  onProfile,
  logoUrl,
}) {
  const exercises = todayWorkout?.exercises || [];
  const isRest = !todayWorkout || (todayWorkout?.day_name || '').toLowerCase().includes('rest');
  const dateLine = `${format(new Date(), 'EEEE')}${weekNumber ? `, week ${weekNumber}` : `, ${format(new Date(), 'MMMM d')}`}`;
  const initial = (userName || '').trim()[0]?.toUpperCase();

  return (
    <section
      className="rounded-b-[20px] bg-sidebar px-5 pb-6 text-white md:mx-4 md:mt-4 md:rounded-[20px]"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 18px)' }}
    >
      {/* Top row: logo, date, bell, profile */}
      <div className="flex items-center gap-2">
        <img src={logoUrl || '/koach-logo-white.png'} alt="KOACH AI" className="h-6 w-auto" />
        <p className="ml-auto mr-1 text-sm text-white/70 truncate">{dateLine}</p>
        {onNotifications && (
          <HeroIconButton onClick={onNotifications} label={unreadNotifications > 0 ? `${unreadNotifications} unread notifications` : 'Notifications'}>
            <Bell className="h-[18px] w-[18px]" />
            {unreadNotifications > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold tabular-nums text-brand-foreground">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </HeroIconButton>
        )}
        {onProfile && (
          <HeroIconButton onClick={onProfile} label="Your profile" className="rounded-full text-[13px] font-semibold">
            {initial || '?'}
          </HeroIconButton>
        )}
      </div>

      {/* Today's session */}
      <div className="mt-7">
        {!program ? (
          <>
            <p className="text-base text-white/80">Today's training</p>
            <h1 className="mt-1 text-[40px] text-white">Program coming</h1>
            <p className="mt-1.5 text-[15px] text-white/70">Your coach is building your plan. It will show up here when it's ready.</p>
          </>
        ) : isRest ? (
          <>
            <p className="text-base text-white/80">Today's training</p>
            <h1 className="mt-1 text-[44px] text-white">Rest day</h1>
            <p className="mt-1.5 text-[15px] text-white/70">Nothing scheduled. Walk, stretch and get to bed on time.</p>
          </>
        ) : (
          <>
            <p className="text-base text-white/80">Today's training</p>
            <h1 className="mt-1 text-[44px] text-white break-words">{todayWorkout.day_name || 'Workout'}</h1>
            <p className="mt-1.5 text-[15px] text-white/70">
              {exercises.length} exercise{exercises.length === 1 ? '' : 's'}, about {estimateMinutes(exercises)} minutes
            </p>
          </>
        )}
      </div>

      {program && !isRest && (
        workoutDone ? (
          <div className="mt-5 flex h-12 items-center justify-center gap-2 rounded-lg bg-white/10 text-[15px] font-semibold">
            <Check className="h-4 w-4" strokeWidth={3} /> Done for today
          </div>
        ) : (
          <Button variant="brand" size="lg" className="mt-5 h-[52px] w-full text-base font-bold" onClick={onStartWorkout}>
            Start workout
          </Button>
        )
      )}
    </section>
  );
}
