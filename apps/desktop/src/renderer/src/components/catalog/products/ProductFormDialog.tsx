import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { productFormSchema, type ProductFormValues } from '@/schemas/catalog';
import type { ProductCategoryDto, ProductDto } from '@/types/catalog';

interface ProductFormDialogProps {
  open: boolean;
  product?: ProductDto;
  categories: ProductCategoryDto[];
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProductFormValues) => Promise<void>;
}

const NO_CATEGORY_VALUE = '__none__';

function getDefaultValues(product?: ProductDto): ProductFormValues {
  return {
    name: product?.name ?? '',
    priceAmount: product?.priceAmount ?? 0,
    currency: product?.currency ?? 'COP',
    categoryId: product?.categoryId ?? undefined,
    sku: product?.sku ?? '',
    description: product?.description ?? '',
    isActive: product?.isActive ?? true,
    isSellable: product?.isSellable ?? true,
    isInventoried: product?.isInventoried ?? false,
  };
}

function renderCategoryOption(category: ProductCategoryDto) {
  return (
    <SelectItem key={category.id} value={category.id}>
      {category.name}
    </SelectItem>
  );
}

export function ProductFormDialog({
  open,
  product,
  categories,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: ProductFormDialogProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: getDefaultValues(product),
  });
  const mode = product ? 'edit' : 'create';

  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues(product));
    }
  }, [form, open, product]);

  const onFormSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    form.reset(getDefaultValues());
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nuevo producto' : 'Editar producto'}</DialogTitle>
          <DialogDescription>
            Mantén precios y disponibilidad controlados desde el backend.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onFormSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Bandeja paisa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="MENU-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priceAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={field.value}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    </FormControl>
                    <FormDescription>Para COP se guarda en pesos enteros.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moneda</FormLabel>
                    <FormControl>
                      <Input maxLength={3} placeholder="COP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Categoria</FormLabel>
                    <Select
                      value={field.value ?? NO_CATEGORY_VALUE}
                      onValueChange={(value) =>
                        field.onChange(value === NO_CATEGORY_VALUE ? undefined : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sin categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_CATEGORY_VALUE}>Sin categoria</SelectItem>
                        {categories.map(renderCategoryOption)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Descripcion</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notas internas del producto"
                        className="min-h-24"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-3">
                    <div>
                      <FormLabel>Activo</FormLabel>
                      <FormDescription>Visible para operar.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isSellable"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-3">
                    <div>
                      <FormLabel>Vendible</FormLabel>
                      <FormDescription>Aparece en POS.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isInventoried"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-3">
                    <div>
                      <FormLabel>Inventariable</FormLabel>
                      <FormDescription>Consume stock.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="bg-background"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {mode === 'create' ? 'Crear producto' : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
