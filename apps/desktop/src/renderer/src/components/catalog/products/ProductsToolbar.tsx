import type { ChangeEvent } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ProductsToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  onCreate: () => void;
}

export function ProductsToolbar({ search, onSearch, onCreate }: ProductsToolbarProps) {
  const onSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearch(event.target.value);
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="relative w-[min(420px,100%)]">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={onSearchChange}
          placeholder="Buscar por nombre o SKU"
          className="pl-9"
        />
      </div>
      <Button type="button" onClick={onCreate}>
        <Plus className="h-4 w-4" />
        Nuevo producto
      </Button>
    </div>
  );
}
