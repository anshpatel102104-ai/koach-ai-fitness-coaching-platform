import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Dumbbell, Salad, Users, Package, Layers, EyeOff, Star, Edit, Eye, ShoppingCart, Loader2 } from 'lucide-react';
import { supabase as base44 } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { SignedImg } from '@/components/shared/SignedImage';

const CATEGORY_STYLES = {
  workout:   { badge: 'bg-accent/10 text-primary',   icon: Dumbbell, gradient: 'from-accent/10 to-accent/10' },
  nutrition: { badge: 'bg-success/10 text-success',   icon: Salad,    gradient: 'from-success/10 to-success/10' },
  coaching:  { badge: 'bg-warning/10 text-warning',   icon: Users,    gradient: 'from-warning/10 to-warning/10' },
  bundle:    { badge: 'bg-ai/10 text-ai',   icon: Layers,   gradient: 'from-ai/10 to-ai/10' },
  other:     { badge: 'bg-muted text-foreground',   icon: Package,  gradient: 'from-muted to-border' },
};

const TYPE_LABEL = {
  workout_program: 'Workout',
  nutrition_plan: 'Nutrition',
  coaching_package: 'Coaching',
  guide_ebook: 'Ebook',
  video_course: 'Course',
  bundle: 'Bundle',
  custom: 'Product',
};

export default function StoreProductCard({ listing, onEdit, onView }) {
  const [buyingOut, setBuyingOut] = useState(false);
  const cat = CATEGORY_STYLES[listing.category] || CATEGORY_STYLES.other;
  const CatIcon = cat.icon;
  const isDiscounted = listing.original_price && Number(listing.original_price) > Number(listing.price);
  const typeLabel = TYPE_LABEL[listing.product_type] || listing.category;

  const handleBuyNow = async () => {
    setBuyingOut(true);
    const res = await base44.functions.invoke('storeCheckout', {
      listing_id: listing.id,
      success_url: `${window.location.origin}/store?purchase=success`,
      cancel_url: `${window.location.origin}/store`,
    });
    if (res?.data?.checkout_url) {
      window.open(res.data.checkout_url, '_blank');
    } else {
      toast.error(res?.data?.error || 'Could not start checkout');
    }
    setBuyingOut(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200 group relative flex flex-col">
      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {listing.image_url ? (
          <SignedImg src={listing.image_url} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className={cn('w-full h-full flex items-center justify-center bg-gradient-to-br', cat.gradient)}>
            <CatIcon className="w-12 h-12 opacity-15" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full capitalize', cat.badge)}>
            {typeLabel}
          </span>
          {listing.is_free && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success">FREE</span>
          )}
          {!listing.is_published && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
              <EyeOff className="w-2.5 h-2.5" /> Draft
            </span>
          )}
          {listing.payment_type === 'subscription' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ai/10 text-ai">Subscription</span>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={() => onView(listing)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card text-foreground rounded-lg text-xs font-semibold hover:bg-muted transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> View
          </button>
          <button
            onClick={() => onEdit(listing)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sidebar text-white rounded-lg text-xs font-semibold hover:bg-black transition-colors"
          >
            <Edit className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-foreground text-sm leading-tight">{listing.title}</h3>
        {listing.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{listing.description}</p>
        )}

        {listing.features?.length > 0 && (
          <div className="mt-2.5 space-y-1">
            {listing.features.slice(0, 3).map((f, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
                <p className="text-xs text-muted-foreground truncate">{f}</p>
              </div>
            ))}
            {listing.features.length > 3 && (
              <p className="text-[11px] text-muted-foreground">+{listing.features.length - 3} more</p>
            )}
          </div>
        )}

        <div className="mt-auto pt-3">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-baseline gap-1.5">
              {listing.is_free ? (
                <span className="text-lg font-bold text-success">Free</span>
              ) : (
                <>
                  <span className="text-lg font-bold text-foreground">${listing.price}</span>
                  {listing.payment_type === 'subscription' && (
                    <span className="text-[11px] text-muted-foreground">/{listing.billing_frequency === 'monthly' ? 'mo' : listing.billing_frequency === 'annual' ? 'yr' : 'qtr'}</span>
                  )}
                  {isDiscounted && (
                    <span className="text-xs text-muted-foreground line-through">${listing.original_price}</span>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {listing.rating && (
                <span className="flex items-center gap-0.5 font-semibold text-foreground">
                  <Star className="w-3 h-3 fill-warning text-warning" /> {listing.rating}
                  {listing.rating_count > 0 && <span className="text-muted-foreground font-normal">({listing.rating_count})</span>}
                </span>
              )}
              {listing.sales_count > 0 && (
                <span>{listing.sales_count} sold</span>
              )}
            </div>
          </div>

          {/* Buy Now button — only show for published products with price */}
          {listing.is_published && !listing.is_free && listing.price > 0 && (
            <button
              onClick={handleBuyNow}
              disabled={buyingOut}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-primary-foreground transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,var(--tc-primary),var(--tc-ai))' }}
            >
              {buyingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ShoppingCart className="w-3.5 h-3.5" /> Buy Now — ${listing.price}</>}
            </button>
          )}
          {listing.is_free && listing.is_published && (
            <button className="w-full py-2 rounded-xl text-xs font-bold text-success bg-success/10 border border-success hover:bg-success/10 transition-colors">
              Get for Free
            </button>
          )}
        </div>
      </div>
    </div>
  );
}