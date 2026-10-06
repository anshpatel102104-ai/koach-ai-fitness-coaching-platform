import React, { useState } from 'react';
import { Plus, Trash2, Lock } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pill } from '@/components/portal/PortalUI';

// Card network brand colours (third-party brand marks).
const CARD_BRANDS = {
  visa: { color: '#1A1F71', label: 'Visa' },
  mastercard: { color: '#EB001B', label: 'MC' },
  amex: { color: '#2E77BC', label: 'Amex' },
  default: { color: null, label: 'Card' },
};

function MockCard({ card, isDefault, onSetDefault, onRemove, confirming }) {
  const brand = CARD_BRANDS[card.brand?.toLowerCase()] || CARD_BRANDS.default;
  const expiry = new Date(card.exp_year, card.exp_month - 1);
  const daysToExpiry = differenceInDays(expiry, new Date());
  const expiringSoon = daysToExpiry <= 60 && daysToExpiry > 0;

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-10 flex-shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground"
          style={brand.color ? { background: brand.color, color: '#fff' } : undefined}>
          {brand.label}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold tabular-nums text-foreground">•••• {card.last4}</span>
          <span className={`block text-[13px] ${expiringSoon ? 'text-warning' : 'text-muted-foreground'}`}>
            {expiringSoon ? `Expires in ${daysToExpiry} days. Update it soon.` : `Expires ${card.exp_month}/${card.exp_year}`}
          </span>
        </span>
        {isDefault && <Pill>Default</Pill>}
      </div>
      <div className="mt-2 flex gap-2 pl-[52px]">
        {!isDefault && <Button size="sm" variant="outline" onClick={() => onSetDefault(card.id)}>Make default</Button>}
        <Button size="sm" variant="outline" className={confirming ? 'border-destructive text-destructive' : ''} onClick={() => onRemove(card.id)}>
          <Trash2 /> {confirming ? 'Tap again to remove' : 'Remove'}
        </Button>
      </div>
    </li>
  );
}

export default function BillingPaymentMethods({ client }) {
  const [cards, setCards] = useState([
    { id: '1', brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2027 },
  ]);
  const [defaultCard, setDefaultCard] = useState('1');
  const [showAdd, setShowAdd] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(null);

  const handleRemove = (id) => {
    if (removeConfirm === id) {
      setCards(c => c.filter(card => card.id !== id));
      if (defaultCard === id) setDefaultCard(cards.find(c => c.id !== id)?.id || null);
      setRemoveConfirm(null);
    } else {
      setRemoveConfirm(id);
      setTimeout(() => setRemoveConfirm(null), 3000);
    }
  };

  return (
    <div className="space-y-3">
      <section className="panel px-4 pt-4 pb-1">
        <h2 className="text-xl text-foreground">Saved cards</h2>
        {cards.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">No saved cards.</p>
        ) : (
          <ul className="divide-y divide-border">
            {cards.map(card => (
              <MockCard
                key={card.id}
                card={card}
                isDefault={defaultCard === card.id}
                onSetDefault={setDefaultCard}
                onRemove={handleRemove}
                confirming={removeConfirm === card.id}
              />
            ))}
          </ul>
        )}
      </section>

      {!showAdd ? (
        <Button variant="outline" size="lg" className="w-full border-dashed" onClick={() => setShowAdd(true)}>
          <Plus /> Add a card
        </Button>
      ) : (
        <section className="panel p-4">
          <h2 className="text-lg text-foreground">New card</h2>
          <div className="mt-3 space-y-2.5">
            <Input placeholder="Card number" className="h-11 text-base" />
            <div className="flex gap-2.5">
              <Input placeholder="MM/YY" className="h-11 text-base" />
              <Input placeholder="CVC" className="h-11 text-base" />
            </div>
            <Input placeholder="Name on card" className="h-11 text-base" />
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button className="flex-1" onClick={() => setShowAdd(false)}>Add card</Button>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[13px] text-muted-foreground"><Lock className="h-3.5 w-3.5" /> Card details are handled by Stripe.</p>
        </section>
      )}
    </div>
  );
}
