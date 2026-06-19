import { StatusPill } from '@/components/operations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CASH_REGISTER_SUMMARY, FISCAL_SUMMARY, TOP_PRODUCTS } from '@/constants';
import type { TopProduct } from '@/types/operations';

function FiscalStat({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone?: 'success' | 'warning';
}) {
  return (
    <div className="rounded-xl bg-surface-quiet px-3 py-3">
      <p
        className={
          tone === 'success'
            ? 'nums text-[24px] font-bold leading-none text-success'
            : tone === 'warning'
              ? 'nums text-[24px] font-bold leading-none text-[#9A6A1C]'
              : 'nums text-[24px] font-bold leading-none'
        }
      >
        {value}
      </p>
      <p className="mt-1.5 text-[12px] text-[#6B6359]">{label}</p>
    </div>
  );
}

function TopProductRow({ product, index }: { product: TopProduct; index: number }) {
  return (
    <div className="grid grid-cols-[18px_1fr_auto] items-center gap-2 py-1.5">
      <span className="nums text-[12px] text-[#B08D78]">{index + 1}</span>
      <span className="truncate text-[14px] font-semibold">{product.name}</span>
      <span className="nums text-[13px] font-bold">{product.quantity}</span>
    </div>
  );
}

export function DashboardSidePanel() {
  return (
    <div className="space-y-4">
      <Card className="gap-4 rounded-2xl border-transparent bg-carbon py-5 text-white shadow-lg shadow-carbon/10">
        <CardHeader className="px-5 pb-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardDescription className="font-semibold text-white/62">
                Caja · Sede Centro
              </CardDescription>
              <CardTitle className="nums mt-2 font-display text-[28px] font-bold text-white">
                {CASH_REGISTER_SUMMARY.amount}
              </CardTitle>
            </div>
            <StatusPill
              tone="green"
              className="h-6 border-success/20 bg-success/20 px-2 text-[10px] font-bold uppercase text-success-soft"
            >
              {CASH_REGISTER_SUMMARY.status}
            </StatusPill>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-5">
          <Separator className="bg-white/10" />
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-[12px] text-white/45">Base</p>
              <p className="nums mt-1 font-bold">{CASH_REGISTER_SUMMARY.base}</p>
            </div>
            <div>
              <p className="text-[12px] text-white/45">Apertura</p>
              <p className="nums mt-1 font-bold">{CASH_REGISTER_SUMMARY.openedAt}</p>
            </div>
            <div>
              <p className="text-[12px] text-white/45">Cajero</p>
              <p className="mt-1 text-sm font-bold">{CASH_REGISTER_SUMMARY.cashier}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-4 rounded-2xl border-border/80 bg-card py-5 shadow-sm">
        <CardHeader className="px-5 pb-0">
          <div className="flex items-center justify-between">
            <CardTitle>Facturación electrónica</CardTitle>
            <span className="size-2.5 rounded-full bg-success shadow-[0_0_0_4px_rgba(20,134,90,0.12)]" />
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 px-5">
          <FiscalStat value={FISCAL_SUMMARY.emitted} label="Emitidas" />
          <FiscalStat value={FISCAL_SUMMARY.queued} label="En cola" tone="warning" />
          <FiscalStat value={FISCAL_SUMMARY.rejected} label="Rechazos" tone="success" />
        </CardContent>
      </Card>

      <Card className="gap-4 rounded-2xl border-border/80 bg-card py-5 shadow-sm">
        <CardHeader className="px-5 pb-0">
          <CardTitle>Top del dia</CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          {TOP_PRODUCTS.map((product, index) => (
            <TopProductRow key={product.name} product={product} index={index} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
