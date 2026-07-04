import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@gastroai/desktop"

export function BranchPicker() {
  return (
    <Select defaultValue="centro">
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Elegí una sucursal" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Sucursales</SelectLabel>
          <SelectItem value="centro">Sucursal Centro</SelectItem>
          <SelectItem value="norte">Sucursal Norte</SelectItem>
          <SelectItem value="costanera">Costanera</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export function Placeholder() {
  return (
    <Select>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Seleccioná un método de pago" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="efectivo">Efectivo</SelectItem>
        <SelectItem value="debito">Tarjeta de débito</SelectItem>
        <SelectItem value="qr">QR / billetera</SelectItem>
      </SelectContent>
    </Select>
  )
}
