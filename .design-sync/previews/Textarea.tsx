import { Textarea, Label } from "@gastroai/desktop"

export function Default() {
  return (
    <div className="flex w-80 flex-col gap-2">
      <Label htmlFor="notes">Notas de la orden</Label>
      <Textarea
        id="notes"
        placeholder="Ej. sin cebolla, salsa aparte…"
        rows={3}
      />
    </div>
  )
}

export function Filled() {
  return (
    <div className="w-80">
      <Textarea
        rows={4}
        defaultValue={
          "Mesa 12 — cumpleaños.\nTraer postre con vela al cierre de la cuenta.\nCliente frecuente, aplicar 10% de descuento."
        }
      />
    </div>
  )
}
