import type { ChangeEvent } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ProductsToolbarProps {
  search: string;
  total: number;
  onSearch: (value: string) => void;
}

export function ProductsToolbar({ search, total, onSearch }: ProductsToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="relative w-72">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onSearch(event.target.value)
          }
          placeholder="Buscar por nombre o SKU"
          className="pl-9"
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="nums text-sm text-muted-foreground">{total} productos</span>
        <Button disabled title="Disponible pronto">
          Nuevo producto
        </Button>
      </div>
    </div>
  );
}
