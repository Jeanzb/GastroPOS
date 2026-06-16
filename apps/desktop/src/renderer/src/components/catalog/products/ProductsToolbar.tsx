import type { ChangeEvent } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ProductsToolbarProps {
  search: string;
  total: number;
  onSearch: (value: string) => void;
}

export function ProductsToolbar({ search, total, onSearch }: ProductsToolbarProps) {
  const onSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearch(event.target.value);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={onSearchChange}
          placeholder="Buscar por nombre o SKU"
          className="pl-9"
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="nums text-sm text-muted-foreground">{total} productos</span>
        <Button disabled>
          <Plus className="h-4 w-4" />
          Nuevo producto
        </Button>
      </div>
    </div>
  );
}
