import { Button } from "@gastroai/desktop"

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Nueva orden</Button>
      <Button variant="secondary">Guardar borrador</Button>
      <Button variant="outline">Ver detalle</Button>
      <Button variant="ghost">Cancelar</Button>
      <Button variant="destructive">Anular ticket</Button>
      <Button variant="link">Historial de caja</Button>
    </div>
  )
}

export function Sizes() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="xs">Extra chico</Button>
      <Button size="sm">Chico</Button>
      <Button size="default">Normal</Button>
      <Button size="lg">Grande</Button>
    </div>
  )
}

export function States() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Cobrar $ 450</Button>
      <Button disabled>Procesando…</Button>
      <Button variant="outline" disabled>
        Sin stock
      </Button>
    </div>
  )
}
