import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@gastroai/desktop"

export function OrderChannels() {
  return (
    <Tabs defaultValue="salon" className="w-96">
      <TabsList className="gap-4">
        <TabsTrigger value="salon">Salón</TabsTrigger>
        <TabsTrigger value="delivery">Delivery</TabsTrigger>
        <TabsTrigger value="mostrador">Mostrador</TabsTrigger>
      </TabsList>
      <TabsContent value="salon" className="pt-3 text-sm text-muted-foreground">
        12 mesas abiertas · 3 esperando la cuenta.
      </TabsContent>
      <TabsContent value="delivery" className="pt-3 text-sm text-muted-foreground">
        5 pedidos en reparto · 2 en preparación.
      </TabsContent>
      <TabsContent value="mostrador" className="pt-3 text-sm text-muted-foreground">
        Fila de 4 clientes para llevar.
      </TabsContent>
    </Tabs>
  )
}
