import React, { useEffect, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
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
      className="flex items-center gap-2 w-full px-2 py-2.5 rounded-md hover:bg-accent transition-colors text-left group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{food.name}</p>
        <p className="text-[13px] text-muted-foreground tabular-nums">{food.calories} kcal · {food.serving_size || '100 g'}</p>
      </div>
      <Plus className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
    </button>
  );

  return (
    <div className="space-y-5 p-4">
      {/* Recent */}
      {recent.length > 0 && (
        <div>
          <p className="text-[13px] text-muted-foreground mb-1">Recently added</p>
          <div className="space-y-0.5">
            {recent.slice(0, 5).map((f, i) => <QuickItem key={i} food={f} />)}
          </div>
        </div>
      )}

      {/* My Foods */}
      <div>
        <p className="text-[13px] text-muted-foreground mb-1">Your saved foods</p>
        {loadingMy ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : myFoods.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">No saved foods yet. Bookmark a food from search to keep it here.</p>
        ) : (
          <div className="space-y-0.5">
            {myFoods.slice(0, 10).map((f, i) => <QuickItem key={i} food={{ ...f, calories: f.calories || 0 }} />)}
          </div>
        )}
      </div>
    </div>
  );
}