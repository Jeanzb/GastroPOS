import type { ColumnDef } from "@tanstack/react-table"
import { DataTable, Badge } from "@gastroai/desktop"

type Order = {
  id: string
  channel: string
  status: "abierta" | "cobrada" | "demorada"
  total: string
}

const data: Order[] = [
  { id: "#1042", channel: "Mesa 7", status: "abierta", total: "$ 17.800" },
  { id: "#1041", channel: "Delivery", status: "demorada", total: "$ 9.300" },
  { id: "#1040", channel: "Mostrador", status: "cobrada", total: "$ 4.150" },
  { id: "#1039", channel: "Mesa 3", status: "cobrada", total: "$ 22.600" },
]

const columns: ColumnDef<Order>[] = [
  { accessorKey: "id", header: "Orden" },
  { accessorKey: "channel", header: "Canal" },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const s = row.original.status
      return (
        <Badge variant={s === "demorada" ? "destructive" : s === "cobrada" ? "secondary" : "default"}>
          {s}
        </Badge>
      )
    },
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => <span className="nums">{row.original.total}</span>,
  },
]

export function Orders() {
  return (
    <div className="w-[640px]">
      <DataTable columns={columns} data={data} />
    </div>
  )
}

export function Loading() {
  return (
    <div className="w-[640px]">
      <DataTable columns={columns} data={[]} isLoading />
    </div>
  )
}

export function EmptyState() {
  return (
    <div className="w-[640px]">
      <DataTable columns={columns} data={[]} emptyMessage="No hay órdenes en este turno." />
    </div>
  )
}
