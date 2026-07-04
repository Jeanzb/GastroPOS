import { Badge } from "@gastroai/desktop"

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Abierta</Badge>
      <Badge variant="secondary">En cocina</Badge>
      <Badge variant="outline">Reservada</Badge>
      <Badge variant="destructive">Vencida</Badge>
      <Badge variant="ghost">Borrador</Badge>
      <Badge variant="link">Ver más</Badge>
    </div>
  )
}

export function OrderStatuses() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary">Mesa 4</Badge>
      <Badge>Para llevar</Badge>
      <Badge variant="outline">Delivery</Badge>
      <Badge variant="destructive">Demorada</Badge>
    </div>
  )
}
