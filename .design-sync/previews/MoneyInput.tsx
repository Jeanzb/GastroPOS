import { useState } from "react"
import { MoneyInput, Label } from "@gastroai/desktop"

export function Price() {
  const [value, setValue] = useState<number>(1500000)
  return (
    <div className="flex w-64 flex-col gap-2">
      <Label htmlFor="price">Precio de venta (COP)</Label>
      <MoneyInput id="price" value={value} onChange={setValue} />
      <span className="text-xs text-muted-foreground nums">
        Valor limpio: {value}
      </span>
    </div>
  )
}

export function Empty() {
  const [value, setValue] = useState<number | null>(null)
  return (
    <div className="w-64">
      <MoneyInput
        value={value}
        onChange={setValue}
        placeholder="0"
      />
    </div>
  )
}
