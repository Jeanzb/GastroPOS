import { Input } from "@gastroai/desktop"

export function Default() {
  return (
    <div className="w-72">
      <Input placeholder="Buscar producto…" />
    </div>
  )
}

export function Filled() {
  return (
    <div className="w-72">
      <Input defaultValue="Milanesa napolitana" />
    </div>
  )
}

export function States() {
  return (
    <div className="flex w-72 flex-col gap-3">
      <Input placeholder="Correo del empleado" type="email" />
      <Input defaultValue="Sin permiso de edición" disabled />
      <Input defaultValue="cuit-invalido" aria-invalid />
    </div>
  )
}
