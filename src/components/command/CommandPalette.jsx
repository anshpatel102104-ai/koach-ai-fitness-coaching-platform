import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from '@/components/ui/command';
import { COMMANDS, COMMAND_SECTIONS } from '@/lib/commandRegistry';
import { useTheme } from '@/lib/theme';
import { track } from '@/lib/telemetry';

const CommandPaletteContext = createContext({ open: () => {}, close: () => {}, toggle: () => {} });

/** Open/close the command palette from anywhere (topbar search button, etc.). */
export function useCommandPalette() {
  return useContext(CommandPaletteContext);
}

/**
 * Global ⌘K / Ctrl+K command palette. Mount once near the app root. Reads the
 * central command registry so new commands need no changes here.
 */
export function CommandPaletteProvider({ children }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  const close = useCallback(() => setOpen(false), []);
  const openPalette = useCallback(() => { setOpen(true); track('command.open', { via: 'api' }); }, []);
  const toggle = useCallback(() => setOpen(o => !o), []);

  // Global keyboard shortcut.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => {
          if (!o) track('command.open', { via: 'hotkey' });
          return !o;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ctx = useMemo(() => ({
    navigate,
    setTheme,
    close,
    track,
  }), [navigate, setTheme, close]);

  const runCommand = useCallback((cmd) => {
    track('command.invoke', { id: cmd.id, section: cmd.section });
    cmd.run(ctx);
  }, [ctx]);

  const grouped = useMemo(() => {
    return COMMAND_SECTIONS.map(section => ({
      section,
      items: COMMANDS.filter(c => c.section === section),
    })).filter(g => g.items.length > 0);
  }, []);

  return (
    <CommandPaletteContext.Provider value={{ open: openPalette, close, toggle }}>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Jump to a page or run an action" />
        <CommandList>
          <CommandEmpty>Nothing matches. Try a page name, like Clients.</CommandEmpty>
          {grouped.map(({ section, items }) => (
            <CommandGroup key={section} heading={section} className="[&_[cmdk-group-heading]]:text-[13px] [&_[cmdk-group-heading]]:pt-3">
              {items.map(cmd => {
                const Icon = cmd.icon;
                return (
                  <CommandItem
                    key={cmd.id}
                    value={`${cmd.title} ${cmd.keywords || ''}`}
                    onSelect={() => runCommand(cmd)}
                    className="group cursor-pointer gap-3 rounded-md py-2.5 text-[15px] data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground"
                  >
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground group-data-[selected=true]:text-primary-foreground" />}
                    <span>{cmd.title}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </CommandPaletteContext.Provider>
  );
}
