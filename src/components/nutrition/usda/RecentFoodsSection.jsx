import React, { useEffect, useState } from 'react';
import { Clock, TrendingUp, Plus, Loader2 } from 'lucide-react';
import { getRecentFoods } from '@/lib/nutritionUtils';
import { db } from '@/api/supabaseClient';

export default function RecentFoodsSection({ onAdd }) {
  const [recent, setRecent] = useState([]);
  const [myFoods, setMyFoods] = useState([]);
  const [loadingMy, setLoadingMy] = useState(true);

  useEffect(() => {
    setRecent(getRecentFoods());
    db.entities.FoodItem.list('-created_date', 20)
      .then(setMyFoods).catch(() => {})
      .finally(() => setLoadingMy(false));
  }, []);

  const QuickItem = ({ food }) => (
    <button onClick={() => onAdd(food, 100, 'g')}
      className="flex items-center gap-2 w-full p-2.5 rounded-xl hover:bg-secondary/60 transition-colors text-left group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{food.name}</p>
        <p className="text-[11px] text-muted-foreground">{food.calories}cal · {food.serving_size || '100g'}</p>
      </div>
      <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </button>
  );

  return (
    <div className="space-y-5 p-4">
      {/* Recent */}
      {recent.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recently Added</p>
          </div>
          <div className="space-y-0.5">
            {recent.slice(0, 5).map((f, i) => <QuickItem key={i} food={f} />)}
          </div>
        </div>
      )}

      {/* My Foods */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">My Saved Foods</p>
        </div>
        {loadingMy ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : myFoods.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">No saved foods yet. Search and bookmark foods to save them here.</p>
        ) : (
          <div className="space-y-0.5">
            {myFoods.slice(0, 10).map((f, i) => <QuickItem key={i} food={{ ...f, calories: f.calories || 0 }} />)}
          </div>
        )}
      </div>
    </div>
  );
}