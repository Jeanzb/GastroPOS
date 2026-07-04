import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@gastroai/desktop"

const rows = [
  { item: "Milanesa napolitana", qty: 2, price: "$ 8.900", total: "$ 17.800" },
  { item: "Ensalada César", qty: 1, price: "$ 5.400", total: "$ 5.400" },
  { item: "Agua con gas 500ml", qty: 3, price: "$ 1.200", total: "$ 3.600" },
]

export function OrderLines() {
  return (
    <Table className="w-[520px]">
      <TableCaption>Detalle de la orden · Mesa 7</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Producto</TableHead>
          <TableHead className="text-right">Cant.</TableHead>
          <TableHead className="text-right">Precio</TableHead>
          <TableHead className="text-right">Subtotal</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.item}>
            <TableCell className="font-medium">{r.item}</TableCell>
            <TableCell className="text-right nums">{r.qty}</TableCell>
            <TableCell className="text-right nums">{r.price}</TableCell>
            <TableCell className="text-right nums">{r.total}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
