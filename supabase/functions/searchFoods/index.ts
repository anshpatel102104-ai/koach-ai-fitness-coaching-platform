// Supabase Edge Function: searchFoods  (Migration Step 5e)
//
// Faithful port of base44/functions/searchFoods — USDA FoodData Central
// search with the same nutrient mapping. One fix: Base44 threw at MODULE load
// when USDA_API_KEY was missing (bricking the function with an opaque boot
// error); the check now happens per-request with a clean 500.
import { getCaller, cors, jsonResponse } from '../_shared/edgeClients.js';
import { serve } from '../_shared/observe.js';

function mapUsdaFood(food: Record<string, any>) {
  const get = (name: string) => {
    const n = food.foodNutrients?.find((n: Record<string, any>) =>
      n.nutrientName?.toLowerCase().includes(name.toLowerCase()) ||
      n.name?.toLowerCase().includes(name.toLowerCase())
    );
    return n ? Math.round((n.value || n.amount || 0) * 10) / 10 : 0;
  };

  return {
    usda_fdc_id: String(food.fdcId),
    name: food.description || food.lowercaseDescription || 'Unknown',
    brand: food.brandOwner || food.brandName || '',
    serving_size: food.servingSize ? `${food.servingSize}${food.servingSizeUnit || 'g'}` : '100g',
    serving_weight_g: food.servingSize || 100,
    calories: get('Energy') || get('Calories') || get('energy'),
    protein_g: get('Protein'),
    carbs_g: get('Carbohydrate') || get('carbohydrate'),
    fats_g: get('Total lipid') || get('Fat') || get('fat'),
    fiber_g: get('Fiber') || get('fiber'),
    sugar_g: get('Sugars') || get('sugar'),
    sodium_mg: get('Sodium') || get('sodium'),
    micronutrients: {
      vitamin_c_mg: get('Vitamin C'),
      iron_mg: get('Iron'),
      calcium_mg: get('Calcium'),
      potassium_mg: get('Potassium'),
      vitamin_d_iu: get('Vitamin D'),
    },
    category: food.foodCategory || food.foodCategoryLabel || '',
    source: 'usda',
  };
}

serve('searchFoods', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);

    const USDA_API_KEY = Deno.env.get('USDA_API_KEY');
    if (!USDA_API_KEY) return jsonResponse({ error: 'USDA_API_KEY not configured', foods: [] }, 500);

    const { query, pageSize = 20, dataType } = await req.json();
    if (!query || query.trim().length < 2) {
      return jsonResponse({ foods: [], total: 0 });
    }

    const params = new URLSearchParams({
      query: query.trim(),
      pageSize: String(pageSize),
      api_key: USDA_API_KEY,
      dataType: dataType || 'Foundation,SR Legacy,Branded',
    });

    const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?${params}`);
    if (!res.ok) {
      return jsonResponse({ error: `USDA API error: ${res.status}`, foods: [] }, 200);
    }

    const data = await res.json();
    const foods = (data.foods || []).map(mapUsdaFood);

    return jsonResponse({ foods, total: data.totalHits || foods.length });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message, foods: [] }, 500);
  }
});
