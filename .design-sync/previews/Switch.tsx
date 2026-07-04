import { Switch, Label } from "@gastroai/desktop"

export function States() {
  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <Switch id="s1" defaultChecked />
        <Label htmlFor="s1">Disponible</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="s2" />
        <Label htmlFor="s2">Agotado</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="s3" defaultChecked disabled />
        <Label htmlFor="s3" className="text-muted-foreground">
          Bloqueado
        </Label>
      </div>
    </div>
  )
}

export function SettingsRow() {
  return (
    <div className="flex w-80 items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-col">
        <span className="text-sm font-medium">Imprimir comanda en cocina</span>
        <span className="text-xs text-muted-foreground">
          Envía cada ítem a la impresora térmica
        </span>
      </div>
      <Switch defaultChecked />
    </div>
  )
}
