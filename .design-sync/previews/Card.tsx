import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Badge,
} from "@gastroai/desktop"

export function SalesSummary() {
  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Ventas de hoy</CardTitle>
        <CardDescription>Sucursal Centro · turno tarde</CardDescription>
        <CardAction>
          <Badge variant="secondary">+12%</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="font-display text-3xl font-semibold nums">$ 184.320</p>
        <p className="mt-1 text-sm text-muted-foreground">
          78 órdenes cobradas · ticket promedio $ 2.363
        </p>
      </CardContent>
      <CardFooter className="border-t">
        <Button variant="outline" size="sm">
          Ver reporte
        </Button>
      </CardFooter>
    </Card>
  )
}

export function TableStatus() {
  return (
    <Card className="w-72">
      <CardHeader>
        <CardTitle>Mesa 7</CardTitle>
        <CardDescription>4 comensales · abierta hace 32 min</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          3 platos servidos, 1 en cocina. Cuenta parcial de $ 9.850.
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm">Cobrar</Button>
        <Button size="sm" variant="ghost">
          Agregar ítem
        </Button>
      </CardFooter>
    </Card>
  )
}
