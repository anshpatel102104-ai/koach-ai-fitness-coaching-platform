import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Play, Star, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignedImg } from '@/components/shared/SignedImage';

const MUSCLE_COLORS = {
  chest: 'text-chart-1 bg-chart-1/10',
  back: 'text-chart-2 bg-chart-2/10',
  shoulders: 'text-chart-3 bg-chart-3/10',
  biceps: 'text-primary bg-primary/10',
  triceps: 'text-primary bg-primary/10',
  legs: 'text-chart-5 bg-chart-5/10',
  glutes: 'text-chart-5 bg-chart-5/10',
  core: 'text-chart-4 bg-chart-4/10',
  full_body: 'text-accent bg-accent/10',
  cardio: 'text-accent bg-accent/10',
};

export default function ExercisePickerModal({ open, onOpenChange, onSelect }) {
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('all');

  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => db.entities.ExerciseLibrary.list('-created_date', 200),
    enabled: open,
  });

  const filtered = exercises.filter(ex => {
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase());
    const matchMuscle = muscleFilter === 'all' || ex.muscle_group === muscleFilter;
    return matchSearch && matchMuscle;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading">Exercise Library</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search exercises..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={muscleFilter} onValueChange={setMuscleFilter}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Muscle" />
            </SelectTrigger>
            <SelectContent>
              {['all','chest','back','shoulders','biceps','triceps','legs','glutes','core','full_body','cardio'].map(m => (
                <SelectItem key={m} value={m}>{m === 'all' ? 'All Muscles' : m.replace('_',' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center py-10">
              <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No exercises found</p>
            </div>
          ) : (
            filtered.map(ex => (
              <div
                key={ex.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60 cursor-pointer transition-colors group"
                onClick={() => { onSelect(ex); onOpenChange(false); }}
              >
                <div className="w-10 h-10 rounded-lg bg-secondary/80 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {ex.thumbnail_url ? (
                    <SignedImg src={ex.thumbnail_url} alt={ex.name} className="w-full h-full object-cover rounded-lg" />
                  ) : ex.video_url ? (
                    <Play className="w-4 h-4 text-primary" />
                  ) : (
                    <Dumbbell className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">{ex.name}</p>
                    {ex.is_coach_branded && <Star className="w-3 h-3 text-chart-4 flex-shrink-0" fill="currentColor" />}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {ex.muscle_group && (
                      <Badge className={cn("text-[10px] px-1.5 py-0 border-0 h-4", MUSCLE_COLORS[ex.muscle_group] || 'bg-secondary text-muted-foreground')}>
                        {ex.muscle_group.replace('_',' ')}
                      </Badge>
                    )}
                    {ex.equipment && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        {ex.equipment.replace('_',' ')}
                      </Badge>
                    )}
                  </div>
                </div>
                {ex.video_url && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-3 h-3 text-primary ml-0.5" fill="currentColor" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}