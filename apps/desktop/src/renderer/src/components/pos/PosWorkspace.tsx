import { Minus, Plus, ReceiptText, Search, Trash2 } from 'lucide-react';
import { StatusPill } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { POS_CATEGORIES, POS_PRODUCTS, TICKET_LINES } from '@/constants';
import { cn } from '@/lib/utils';
import type { PosCategory, PosProduct, TicketLine } from '@/types/operations';

function CategoryButton({ category }: { category: PosCategory }) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-10 items-center justify-between rounded-lg border px-3 text-left text-sm font-medium transition-colors',
        category.active
          ? 'border-orange bg-orange text-white'
          : 'border-border bg-card hover:border-orange/40',
      )}
    >
      <span>{category.name}</span>
      <span className="nums text-xs opacity-75">{category.count}</span>
    </button>
  );
}

function ProductButton({ product }: { product: PosProduct }) {
  return (
    <button
      type="button"
      className="rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-orange/40 hover:bg-orange/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{product.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{product.station}</p>
        </div>
        <StatusPill tone={product.available.includes('Ultimas') ? 'amber' : 'green'}>
          {product.available}
        </StatusPill>
      </div>
      <p className="nums mt-5 font-display text-xl font-semibold">{product.price}</p>
    </button>
  );
}

function TicketLineRow({ line }: { line: TicketLine }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{line.name}</p>
          <p className="nums mt-1 text-xs text-muted-foreground">Cantidad {line.quantity}</p>
        </div>
        <p className="nums text-sm font-semibold">{line.total}</p>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-xs" disabled>
            <Minus className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="icon-xs" disabled>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <Button variant="ghost" size="icon-xs" disabled>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function renderCategoryButton(category: PosCategory) {
  return <CategoryButton key={category.name} category={category} />;
}

function renderProductButton(product: PosProduct) {
  return <ProductButton key={product.name} product={product} />;
}

function renderTicketLine(line: TicketLine) {
  return <TicketLineRow key={line.name} line={line} />;
}

export function PosWorkspace() {
  return (
    <div className="grid h-full min-h-[calc(100vh-120px)] gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        <Card className="gap-4 border-border/80 py-5 shadow-none">
          <CardHeader className="px-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Venta rapida</CardTitle>
                <CardDescription>Productos disponibles para la sede activa</CardDescription>
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar producto o SKU" className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-5">
            <div className="grid gap-2 md:grid-cols-5">
              {POS_CATEGORIES.map(renderCategoryButton)}
            </div>
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
              {POS_PRODUCTS.map(renderProductButton)}
            </div>
          </CardContent>
        </Card>
      </section>

      <aside>
        <Card className="h-full gap-4 border-border/80 py-5 shadow-none">
          <CardHeader className="px-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Ticket actual</CardTitle>
                <CardDescription>Mesa 08 - 5 productos</CardDescription>
              </div>
              <ReceiptText className="h-5 w-5 text-orange" />
            </div>
          </CardHeader>
          <CardContent className="flex h-full flex-col px-5">
            <div className="space-y-2">{TICKET_LINES.map(renderTicketLine)}</div>
            <div className="mt-auto space-y-3 pt-5">
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="nums font-medium">$91.000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Impuestos</span>
                  <span className="nums font-medium">$0</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="nums">$91.000</span>
                </div>
              </div>
              <Button className="h-11 w-full" disabled>
                Registrar pago
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
