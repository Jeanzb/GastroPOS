import { Boxes, ClipboardList, Plus, TrendingDown } from 'lucide-react';
import { KpiCard, StatusPill } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { INVENTORY_ALERTS } from '@/constants';
import type { InventoryAlert } from '@/types/operations';

function InventoryAlertRow({ alert }: { alert: InventoryAlert }) {
  const tone = alert.status === 'critical' ? 'red' : 'amber';

  return (
    <div className="motion-press flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 hover:border-orange/30">
      <div>
        <p className="text-sm font-semibold text-white">{alert.item}</p>
        <p className="nums mt-1 text-xs text-white/50">
          Actual {alert.current} - Minimo {alert.minimum}
        </p>
      </div>
      <StatusPill tone={tone}>{alert.status === 'critical' ? 'Critico' : 'Bajo'}</StatusPill>
    </div>
  );
}

function renderInventoryAlert(alert: InventoryAlert) {
  return <InventoryAlertRow key={alert.item} alert={alert} />;
}

export function InventoryWorkspace() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard label="Insumos" value="128" hint="Activos en sede" />
          <KpiCard label="Alertas" value="3" hint="Requieren compra" accent="warning" />
          <KpiCard label="Valor stock" value="$18.4M" hint="Costo estimado" />
          <KpiCard label="Merma semana" value="$214K" hint="Registrada" accent="danger" />
        </div>

        <Card className="gap-4 rounded-2xl border-border/80 bg-card py-5 shadow-sm">
          <CardHeader className="px-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Stock operativo</CardTitle>
                <CardDescription>Insumos, unidades y disponibilidad por sede</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" disabled>
                  <ClipboardList className="h-4 w-4" />
                  Ajuste
                </Button>
                <Button disabled>
                  <Plus className="h-4 w-4" />
                  Insumo
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5">
            <div className="max-h-[calc(100vh-330px)] overflow-y-auto rounded-2xl border border-border bg-surface-raised shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insumo</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Carne molida</TableCell>
                    <TableCell>kg</TableCell>
                    <TableCell className="nums text-right">4.2</TableCell>
                    <TableCell className="nums text-right">$18.400</TableCell>
                    <TableCell>
                      <StatusPill tone="red">Critico</StatusPill>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Arroz blanco</TableCell>
                    <TableCell>kg</TableCell>
                    <TableCell className="nums text-right">38</TableCell>
                    <TableCell className="nums text-right">$4.200</TableCell>
                    <TableCell>
                      <StatusPill tone="green">Normal</StatusPill>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Limon tahiti</TableCell>
                    <TableCell>und</TableCell>
                    <TableCell className="nums text-right">36</TableCell>
                    <TableCell className="nums text-right">$620</TableCell>
                    <TableCell>
                      <StatusPill tone="amber">Bajo</StatusPill>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-4 rounded-2xl border-border/80 bg-card py-5 shadow-sm">
          <CardHeader className="px-5">
            <CardTitle>Kardex reciente</CardTitle>
            <CardDescription>Nunca se actualiza stock sin movimiento trazable</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-5">
            <div className="rounded-lg border border-success/20 bg-success-soft p-4">
              <p className="text-sm font-semibold">PURCHASE - Carne molida</p>
              <p className="mt-1 text-xs text-muted-foreground">+8 kg desde compra OC-0018</p>
            </div>
            <div className="rounded-lg border border-orange/20 bg-orange/10 p-4">
              <p className="text-sm font-semibold">SALE_CONSUMPTION - Bandeja paisa</p>
              <p className="mt-1 text-xs text-muted-foreground">-1.6 kg por recetas del turno</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-4">
        <Card className="gap-4 rounded-2xl border-transparent bg-carbon py-5 text-white shadow-lg shadow-carbon/10">
          <CardHeader className="px-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Alertas</CardTitle>
                <CardDescription className="text-white/55">Reabastecimiento recomendado</CardDescription>
              </div>
              <Boxes className="h-5 w-5 text-orange" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-5">
            {INVENTORY_ALERTS.map(renderInventoryAlert)}
          </CardContent>
        </Card>

        <Card className="gap-4 rounded-2xl border-border/80 bg-card py-5 shadow-sm">
          <CardHeader className="px-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Consumo receta</CardTitle>
                <CardDescription>Impacto esperado por ventas</CardDescription>
              </div>
              <TrendingDown className="size-5 text-orange" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-5">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Bandeja paisa</span>
                <span className="nums font-bold">-8.4 kg</span>
              </div>
              <div className="h-2 rounded-full bg-surface-quiet">
                <span className="block h-full w-[72%] rounded-full bg-orange" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Limonada de coco</span>
                <span className="nums font-bold">-36 und</span>
              </div>
              <div className="h-2 rounded-full bg-surface-quiet">
                <span className="block h-full w-[54%] rounded-full bg-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
