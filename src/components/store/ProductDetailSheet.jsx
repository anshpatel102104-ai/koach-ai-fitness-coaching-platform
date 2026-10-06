import React, { useState } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Stat, KeyValue } from '@/components/kit';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { SignedImg } from '@/components/shared/SignedImage';
import { TYPE_LABEL } from './StoreProductCard';

const DELIVERY_LABELS = {
  downloadable_file: 'Downloadable file',
  app_access: 'App access',
  coaching_messages: 'Direct coach messaging',
  scheduled_calls: 'Scheduled calls',
  custom: 'Custom delivery',
};

const BILLING_LABEL = { monthly: '/mo', quarterly: '/qtr', annual: '/yr' };

function Section({ title, children }) {
  return (
    <section className="py-5 border-t border-border">
      <p className="text-sm font-semibold text-foreground mb-3">{title}</p>
      {children}
    </section>
  );
}

export default function ProductDetailSheet({ listing, clients = [], open, onClose, onEdit, onDelete }) {
  const [assignClient, setAssignClient] = useState('');
  const [copied, setCopied] = useState(false);
  const [buyingOut, setBuyingOut] = useState(false);

  if (!listing) return null;

  const isDiscounted = listing.original_price && Number(listing.original_price) > Number(listing.price);
  const revenue = (Number(listing.price) * (listing.sales_count || 0)).toFixed(0);
  const typeLabel = TYPE_LABEL[listing.product_type] || listing.category || 'Product';

  const copyLink = () => {
    const slug = listing.slug || listing.id;
    navigator.clipboard.writeText(`${window.location.origin}/store/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBuyNow = async () => {
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

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto">
        {listing.image_url && (
          <div className="bg-secondary" style={{ aspectRatio: '16/9' }}>
            <SignedImg src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="px-6 pt-7">
          <p className="text-sm font-medium text-muted-foreground">
            {typeLabel}{listing.is_published ? '' : ', draft'}
          </p>
          <SheetTitle asChild>
            <h2 className="text-[30px] leading-tight text-foreground mt-1">{listing.title}</h2>
          </SheetTitle>
          <SheetDescription className="text-[15px] text-muted-foreground mt-1.5">
            {listing.description || (listing.is_published ? 'Live in your store.' : 'Not visible to buyers until you publish it.')}
          </SheetDescription>

          <p className="mt-4 leading-none">
            {listing.is_free ? (
              <span className="num text-[40px]">Free</span>
            ) : (
              <>
                <span className="num text-[40px]">${listing.price}</span>
                {listing.payment_type === 'subscription' && (
                  <span className="num text-xl">{BILLING_LABEL[listing.billing_frequency] || '/mo'}</span>
                )}
                {isDiscounted && <span className="text-base text-muted-foreground line-through ml-2">${listing.original_price}</span>}
              </>
            )}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-5">
            <Button variant="outline" onClick={() => { onClose(); onEdit(listing); }}>Edit</Button>
            <Button variant="outline" onClick={copyLink}>{copied ? 'Link copied' : 'Copy store link'}</Button>
          </div>
          {listing.is_published && !listing.is_free && listing.price > 0 && (
            <Button className="w-full mt-2" onClick={handleBuyNow} disabled={buyingOut}>
              {buyingOut ? <Loader2 className="animate-spin" /> : `Open checkout, $${listing.price}`}
            </Button>
          )}

          <div className="grid grid-cols-3 gap-4 mt-6 mb-5">
            <Stat size="sm" label="Revenue" value={`$${Number(revenue).toLocaleString()}`} />
            <Stat size="sm" label="Sales" value={listing.sales_count || 0} />
            <Stat size="sm" label="Rating" value={listing.rating || '—'} sub={listing.rating_count > 0 ? `${listing.rating_count} reviews` : undefined} />
          </div>
        </div>

        <div className="px-6 pb-8">
          {listing.long_description && (
            <Section title="Description">
              <p className="text-[15px] text-foreground/90 leading-relaxed whitespace-pre-line">{listing.long_description}</p>
            </Section>
          )}

          {listing.features?.length > 0 && (
            <Section title="What's included">
              <ul className="divide-y divide-border">
                {listing.features.map((f, i) => (
                  <li key={i} className="py-2.5 text-[15px] text-foreground">{f}</li>
                ))}
              </ul>
            </Section>
          )}

          {(listing.delivery_types?.length > 0 || listing.delivery_instructions || listing.stripe_price_id) && (
            <Section title="Delivery">
              {listing.delivery_types?.map(d => (
                <KeyValue
                  key={d}
                  label={DELIVERY_LABELS[d] || d}
                  value={d === 'scheduled_calls' && listing.scheduled_calls_count > 0 ? `${listing.scheduled_calls_count} calls` : 'Included'}
                />
              ))}
              {listing.stripe_price_id && <KeyValue label="Stripe price" value={<span className="font-mono text-[13px]">{listing.stripe_price_id}</span>} />}
              {listing.delivery_instructions && (
                <p className="text-sm text-foreground bg-secondary rounded-lg px-3 py-2.5 mt-3 leading-relaxed">
                  <span className="font-semibold">After purchase:</span> {listing.delivery_instructions}
                </p>
              )}
            </Section>
          )}

          <Section title="Give it to a client">
            <div className="flex gap-2">
              <Select value={assignClient} onValueChange={setAssignClient}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Choose a client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button disabled={!assignClient}>Assign</Button>
            </div>
          </Section>

          <div className="pt-5 border-t border-border">
            <button
              onClick={() => { onDelete(listing.id); onClose(); }}
              className="text-sm font-semibold text-destructive underline underline-offset-4 decoration-1 hover:decoration-2"
            >
              Delete product
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
