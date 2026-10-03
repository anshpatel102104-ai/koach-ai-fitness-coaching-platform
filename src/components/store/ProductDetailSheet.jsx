import React, { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Dumbbell, Salad, Users, Package, Layers, Edit, Trash2, Copy, Check, EyeOff, UserPlus, ShoppingCart, Loader2, Star } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { SignedImg } from '@/components/shared/SignedImage';

const CATEGORY_STYLES = {
  workout:   { icon: Dumbbell, gradient: 'from-accent/10 to-accent/10', badge: 'bg-accent/10 text-primary' },
  nutrition: { icon: Salad,    gradient: 'from-success/10 to-success/10', badge: 'bg-success/10 text-success' },
  coaching:  { icon: Users,    gradient: 'from-warning/10 to-warning/10', badge: 'bg-warning/10 text-warning' },
  bundle:    { icon: Layers,   gradient: 'from-ai/10 to-ai/10', badge: 'bg-ai/10 text-ai' },
  other:     { icon: Package,  gradient: 'from-muted to-border', badge: 'bg-muted text-foreground' },
};

const DELIVERY_LABELS = {
  downloadable_file: '📥 Downloadable File',
  app_access: '📱 App Access',
  coaching_messages: '💬 Direct Coach Messaging',
  scheduled_calls: '📞 Scheduled Calls',
  custom: '✨ Custom Delivery',
};

const BILLING_LABEL = { monthly: '/mo', quarterly: '/qtr', annual: '/yr' };

export default function ProductDetailSheet({ listing, clients = [], open, onClose, onEdit, onDelete }) {
  const [assignClient, setAssignClient] = useState('');
  const [copied, setCopied] = useState(false);
  const [buyingOut, setBuyingOut] = useState(false);

  if (!listing) return null;

  const cat = CATEGORY_STYLES[listing.category] || CATEGORY_STYLES.other;
  const CatIcon = cat.icon;
  const isDiscounted = listing.original_price && Number(listing.original_price) > Number(listing.price);
  const revenue = (Number(listing.price) * (listing.sales_count || 0)).toFixed(0);

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
      <SheetContent side="right" className="w-full max-w-md p-0 overflow-y-auto">
        {/* Hero image or dark header */}
        {listing.image_url ? (
          <div className="relative" style={{ aspectRatio: '16/9' }}>
            <SignedImg src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-4 left-5 right-5">
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full capitalize mb-2 inline-block', cat.badge)}>
                {listing.category}
              </span>
              {!listing.is_published && (
                <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--kc-w-10)] text-white/60 inline-flex items-center gap-1">
                  <EyeOff className="w-2.5 h-2.5" /> Draft
                </span>
              )}
              <h2 className="text-xl font-bold text-white leading-tight mt-1">{listing.title}</h2>
              <div className="flex items-baseline gap-2 mt-2">
                {listing.is_free ? (
                  <span className="text-2xl font-bold text-success">Free</span>
                ) : (
                  <>
                    <span className="text-2xl font-bold text-white">${listing.price}</span>
                    {listing.payment_type === 'subscription' && (
                      <span className="text-sm text-white/60">{BILLING_LABEL[listing.billing_frequency] || '/mo'}</span>
                    )}
                    {isDiscounted && <span className="text-sm text-white/40 line-through">${listing.original_price}</span>}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-sidebar p-6 text-white">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br', cat.gradient)}>
              <CatIcon className="w-6 h-6 text-foreground/60" />
            </div>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full capitalize mb-2 inline-block', cat.badge)}>
              {listing.category}
            </span>
            {!listing.is_published && (
              <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--kc-w-10)] text-white/60 inline-flex items-center gap-1">
                <EyeOff className="w-2.5 h-2.5" /> Draft
              </span>
            )}
            <h2 className="text-xl font-semibold mt-1 leading-tight">{listing.title}</h2>
            {listing.description && <p className="text-sm text-white/60 mt-1">{listing.description}</p>}
            <div className="flex items-baseline gap-2 mt-4">
              {listing.is_free ? (
                <span className="text-3xl font-bold text-success">Free</span>
              ) : (
                <>
                  <span className="text-3xl font-bold">${listing.price}</span>
                  {listing.payment_type === 'subscription' && (
                    <span className="text-sm text-white/50">{BILLING_LABEL[listing.billing_frequency] || '/mo'}</span>
                  )}
                  {isDiscounted && <span className="text-sm text-white/40 line-through">${listing.original_price}</span>}
                </>
              )}
            </div>
          </div>
        )}

        <div className="p-5 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-background rounded-xl p-3 text-center border border-border">
              <p className="text-lg font-bold text-foreground">${revenue}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Revenue</p>
            </div>
            <div className="bg-background rounded-xl p-3 text-center border border-border">
              <p className="text-lg font-bold text-foreground">{listing.sales_count || 0}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Sales</p>
            </div>
            <div className="bg-background rounded-xl p-3 text-center border border-border">
              <p className="text-lg font-bold text-foreground">
                {listing.rating ? (
                  <span className="flex items-center justify-center gap-0.5">
                    <Star className="w-3.5 h-3.5 fill-warning text-warning" />{listing.rating}
                  </span>
                ) : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Rating {listing.rating_count > 0 ? `(${listing.rating_count})` : ''}</p>
            </div>
          </div>

          {/* Stripe IDs */}
          {listing.stripe_price_id && (
            <div className="text-[11px] text-muted-foreground bg-background rounded-lg px-3 py-2 border border-border">
              <span className="font-semibold text-foreground">Stripe:</span> {listing.stripe_price_id}
            </div>
          )}

          {/* Description */}
          {listing.long_description && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Description</p>
              <p className="text-sm text-foreground leading-relaxed">{listing.long_description}</p>
            </div>
          )}

          {/* Features */}
          {listing.features?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">What's Included</p>
              <div className="space-y-2">
                {listing.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-sidebar flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="text-sm text-foreground">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivery types */}
          {listing.delivery_types?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Delivery</p>
              <div className="space-y-1.5">
                {listing.delivery_types.map(d => (
                  <div key={d} className="text-sm text-foreground px-3 py-1.5 bg-background border border-border rounded-lg">
                    {DELIVERY_LABELS[d] || d}
                    {d === 'scheduled_calls' && listing.scheduled_calls_count > 0 && ` (${listing.scheduled_calls_count})`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivery instructions */}
          {listing.delivery_instructions && (
            <div className="p-3 bg-accent border border-accent rounded-xl">
              <p className="text-xs font-bold text-primary mb-1">Delivery Instructions</p>
              <p className="text-xs text-primary leading-relaxed">{listing.delivery_instructions}</p>
            </div>
          )}

          {/* Buy Now */}
          {listing.is_published && !listing.is_free && listing.price > 0 && (
            <button
              onClick={handleBuyNow}
              disabled={buyingOut}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-primary-foreground transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,var(--tc-primary),var(--tc-ai))' }}
            >
              {buyingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShoppingCart className="w-4 h-4" /> Buy Now — ${listing.price}</>}
            </button>
          )}

          {/* Assign to client */}
          <div className="border border-border rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Assign to Client</p>
            <Select value={assignClient} onValueChange={setAssignClient}>
              <SelectTrigger className="mb-2"><SelectValue placeholder="Select a client…" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button disabled={!assignClient} className="w-full bg-sidebar hover:bg-black text-white text-sm" size="sm">
              <UserPlus className="w-3.5 h-3.5 mr-2" /> Assign Plan
            </Button>
          </div>

          {/* Share link */}
          <button
            onClick={copyLink}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-background transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Link Copied!' : 'Copy Store Link'}
          </button>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button variant="outline" className="flex-1" onClick={() => { onClose(); onEdit(listing); }}>
              <Edit className="w-3.5 h-3.5 mr-2" /> Edit
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-destructive border-destructive hover:bg-destructive/10"
              onClick={() => { onDelete(listing.id); onClose(); }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}