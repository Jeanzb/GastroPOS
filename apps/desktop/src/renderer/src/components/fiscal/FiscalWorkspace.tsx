import { AlertTriangle, FileCheck2, RefreshCw, Settings } from 'lucide-react';
import { StatusPill } from '@/components/operations';
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
import { FISCAL_QUEUE } from '@/constants';
import type { FiscalQueueItem } from '@/types/operations';

function FiscalQueueRow({ item }: { item: FiscalQueueItem }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{item.document}</TableCell>
      <TableCell>{item.customer}</TableCell>
      <TableCell>
        <StatusPill tone={item.tone}>{item.status}</StatusPill>
      </TableCell>
    </TableRow>
  );
}

function renderFiscalQueueRow(item: FiscalQueueItem) {
  return <FiscalQueueRow key={item.document} item={item} />;
}

export function FiscalWorkspace() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        <Card className="gap-5 border-border/80 py-5 shadow-none">
          <CardHeader className="px-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Perfil fiscal</CardTitle>
                <CardDescription>
                  Preparacion para proveedor tecnologico o integracion DIAN
                </CardDescription>
              </div>
              <Button variant="outline" className="bg-background" disabled>
                <Settings className="h-4 w-4" />
                Configurar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 px-5 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">Ambiente</p>
              <p className="mt-2 font-semibold">Pruebas</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">Resolucion</p>
              <p className="mt-2 font-semibold">Pendiente</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">Proveedor</p>
              <p className="mt-2 font-semibold">No conectado</p>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-4 border-border/80 py-5 shadow-none">
          <CardHeader className="px-5">
            <CardTitle>Monitor de documentos</CardTitle>
            <CardDescription>Estados, reintentos y referencias externas</CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{FISCAL_QUEUE.map(renderFiscalQueueRow)}</TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-4">
        <Card className="gap-4 border-border/80 py-5 shadow-none">
          <CardHeader className="px-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Readiness</CardTitle>
                <CardDescription>Sin promesa legal hasta validar</CardDescription>
              </div>
              <FileCheck2 className="h-5 w-5 text-orange" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-5">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <p className="text-sm">
                  La app esta preparada para integracion fiscal, no certificada.
                </p>
              </div>
            </div>
            <Button className="w-full" disabled>
              <RefreshCw className="h-4 w-4" />
              Reintentar rechazados
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
