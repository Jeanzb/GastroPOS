import { Label, Input } from "@gastroai/desktop"

export function WithInput() {
  return (
    <div className="flex w-72 flex-col gap-2">
      <Label htmlFor="branch">Nombre de la sucursal</Label>
      <Input id="branch" placeholder="Ej. Sucursal Centro" />
    </div>
  )
}

export function Standalone() {
  return (
    <div className="flex flex-col gap-3">
      <Label>Método de pago</Label>
      <Label className="text-muted-foreground">Campo opcional</Label>
    </div>
  )
}
