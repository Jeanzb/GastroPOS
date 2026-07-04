import { Separator } from "@gastroai/desktop"

export function Horizontal() {
  return (
    <div className="w-72">
      <div className="text-sm font-medium">Datos de facturación</div>
      <Separator className="my-3" />
      <div className="text-sm text-muted-foreground">Condición: IVA responsable</div>
    </div>
  )
}

export function Vertical() {
  return (
    <div className="flex h-6 items-center gap-3 text-sm">
      <span>Salón</span>
      <Separator orientation="vertical" />
      <span>Delivery</span>
      <Separator orientation="vertical" />
      <span>Para llevar</span>
    </div>
  )
}
