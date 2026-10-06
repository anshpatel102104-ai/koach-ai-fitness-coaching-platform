import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Dumbbell, Salad, ClipboardList, Trophy, Activity, Apple,
  Sparkles, Bot, BarChart3,
  UserPlus, ShoppingBag, Globe, Flame,
  LayoutTemplate, Palette, Settings, CreditCard,
  UsersRound, FileText, Mail, BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { track } from '@/lib/telemetry';

// Mirrors the consolidated desktop IA: the bottom bar holds Home/Clients/
// Messages/Calendar/Business; everything else lives here (routes preserved).
const SECTIONS = [
  {
    title: 'Coaching',
    items: [
      { icon: Dumbbell,      label: 'Programs',   path: '/programs' },
      { icon: Salad,         label: 'Nutrition',  path: '/nutrition' },
      { icon: ClipboardList, label: 'Check-ins',  path: '/checkin-review' },
      { icon: Trophy,        label: 'Adherence',  path: '/adherence' },
      { icon: Activity,      label: 'Exercises',  path: '/exercises' },
      { icon: Apple,         label: 'Food Library', path: '/food-library' },
    ],
  },
  {
    title: 'Grow',
    items: [
      { icon: UserPlus,    label: 'Leads',      path: '/sales' },
      { icon: ShoppingBag, label: 'Store',      path: '/store' },
      { icon: Globe,       label: 'Community',  path: '/community' },
      { icon: Flame,       label: 'Challenges', path: '/challenges' },
    ],
  },
  {
    title: 'Automate',
    items: [
      { icon: Sparkles,  label: 'Assistant',   path: '/assistant' },
      { icon: Bot,       label: 'Automations', path: '/automations' },
      { icon: BarChart3, label: 'Analytics',   path: '/analytics' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { icon: LayoutTemplate, label: 'Templates',      path: '/coaching-templates' },
      { icon: Palette,        label: 'White Label',    path: '/white-label' },
      { icon: UsersRound,     label: 'Team',           path: '/team' },
      { icon: FileText,       label: 'Weekly Summary', path: '/weekly-summary' },
      { icon: Mail,           label: 'Email Center',   path: '/email-center' },
      { icon: BookOpen,       label: 'Onboarding',     path: '/onboarding-manager' },
      { icon: Settings,       label: 'Settings',       path: '/settings' },
    ],
  },
];

export default function MoreSheet({ open, onClose }) {
  const location = useLocation();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-[rgb(17_19_24/0.55)] lg:hidden"
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 right-0 z-50 lg:hidden flex flex-col rounded-t-2xl overflow-hidden bg-card"
            style={{ bottom: '60px', maxHeight: 'calc(80dvh - 60px)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
              <div className="w-9 h-1 rounded-full bg-muted-foreground/40" />
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 px-4 pt-2 pb-8">
              {SECTIONS.map((section) => (
                <div key={section.title} className="mb-5">
                  <p className="text-[13px] font-medium mb-2 px-1 text-muted-foreground">
                    {section.title}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {section.items.map((item) => {
                      const isActive = location.pathname === item.path ||
                        (item.path !== '/' && location.pathname.startsWith(item.path));
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => { track('nav.click', { path: item.path, label: item.label, surface: 'moresheet' }); onClose(); }}
                          className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all active:scale-95"
                        >
                          <div className={cn(
                            'w-12 h-12 rounded-lg flex items-center justify-center',
                            isActive ? 'bg-primary' : 'bg-secondary'
                          )}>
                            <item.icon strokeWidth={1.75} className={cn('w-5 h-5', isActive ? 'text-primary-foreground' : 'text-foreground')} />
                          </div>
                          <span className={cn(
                            'text-[11px] text-center leading-tight',
                            isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'
                          )}>
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Account links */}
              <div className="border-t border-border pt-4 mt-1">
                <div className="grid grid-cols-4 gap-2">
                  {[{ icon: CreditCard, label: 'Plan', path: '/subscription' }].map(item => {
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                      <Link key={item.path} to={item.path} onClick={onClose} className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all active:scale-95">
                        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', isActive ? 'bg-primary' : 'bg-secondary')}>
                          <item.icon strokeWidth={1.75} className={cn('w-5 h-5', isActive ? 'text-primary-foreground' : 'text-foreground')} />
                        </div>
                        <span className="text-[11px] text-muted-foreground text-center leading-tight">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}