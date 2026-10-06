import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { SignedImg } from '@/components/shared/SignedImage';
import { Button } from '@/components/ui/button';

export const TYPE_LABEL = {
  workout_program: 'Workout program',
  nutrition_plan: 'Nutrition plan',
  coaching_package: 'Coaching package',
  guide_ebook: 'Ebook',
  video_course: 'Video course',
  bundle: 'Bundle',
  custom: 'Product',
};

const CATEGORY_LABEL = { workout: 'Workout', nutrition: 'Nutrition', coaching: 'Coaching', bundle: 'Bundle', other: 'Other' };

export const billingSuffix = (listing) =>
  listing.payment_type === 'subscription'
    ? `/${listing.billing_frequency === 'monthly' ? 'mo' : listing.billing_frequency === 'annual' ? 'yr' : 'qtr'}`
    : '';

export default function StoreProductCard({ listing, onEdit, onView }) {
  const [buyingOut, setBuyingOut] = useState(false);
  const isDiscounted = listing.original_price && Number(listing.original_price) > Number(listing.price);
  const typeLabel = TYPE_LABEL[listing.product_type] || CATEGORY_LABEL[listing.category] || 'Product';

  const handleBuyNow = async (e) => {
    e.stopPropagation();
    setBuyingOut(true);
    const res = await db.functions.invoke('storeCheckout', {
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

  const status = [
    listing.is_published ? 'Published' : 'Draft',
    listing.sales_count > 0 ? `${listing.sales_count} sold` : null,
    listing.rating ? `${listing.rating} rating${listing.rating_count > 0 ? ` (${listing.rating_count})` : ''}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <article className="panel overflow-hidden flex flex-col">
      <button
        type="button"
        onClick={() => onView(listing)}
        className="relative block w-full bg-secondary overflow-hidden text-left"
        style={{ aspectRatio: '16/9' }}
        aria-label={`Open ${listing.title}`}
      >
        {listing.image_url ? (
          <SignedImg src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-end p-4">
            <span className="display text-[28px] text-foreground/15 leading-none line-clamp-2">{listing.title}</span>
          </span>
        )}
      </button>

      <div className="p-5 flex flex-col flex-1">
        <p className="text-[13px] text-muted-foreground">
          {typeLabel}{listing.payment_type === 'subscription' ? ', subscription' : ''}
        </p>
        <h3 className="text-xl text-foreground leading-tight mt-1">
          <button type="button" onClick={() => onView(listing)} className="text-left hover:underline underline-offset-4 decoration-1">{listing.title}</button>
        </h3>
        {listing.description && (
          <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{listing.description}</p>
        )}

        <div className="mt-auto pt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            {listing.is_free ? (
              <p className="num text-[26px] leading-none text-foreground">Free</p>
            ) : (
              <p className="leading-none">
                <span className="num text-[26px] text-foreground">${listing.price}</span>
                {billingSuffix(listing) && <span className="num text-base text-foreground">{billingSuffix(listing)}</span>}
                {isDiscounted && <span className="text-sm text-muted-foreground line-through ml-2">${listing.original_price}</span>}
              </p>
            )}
            <p className={listing.is_published ? 'text-[13px] text-muted-foreground mt-1.5' : 'text-[13px] font-semibold text-warning mt-1.5'}>{status}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border flex items-center gap-4">
          <button type="button" onClick={() => onEdit(listing)} className="text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2">Edit</button>
          <button type="button" onClick={() => onView(listing)} className="text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2">Details</button>
          {listing.is_published && !listing.is_free && listing.price > 0 && (
            <Button size="sm" variant="outline" className="ml-auto" onClick={handleBuyNow} disabled={buyingOut}>
              {buyingOut ? <Loader2 className="animate-spin" /> : 'Open checkout'}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
