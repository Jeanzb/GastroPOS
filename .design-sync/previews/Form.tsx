import { useForm } from "react-hook-form"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
} from "@gastroai/desktop"

export function ProductForm() {
  const form = useForm({ defaultValues: { name: "Milanesa napolitana", sku: "" } })
  return (
    <Form {...form}>
      <form className="flex w-80 flex-col gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del producto</FormLabel>
              <FormControl>
                <Input placeholder="Ej. Milanesa napolitana" {...field} />
              </FormControl>
              <FormDescription>Se muestra en la carta y el ticket.</FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código SKU</FormLabel>
              <FormControl>
                <Input placeholder="MILA-NAP-01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-fit">
          Guardar producto
        </Button>
      </form>
    </Form>
  )
}
