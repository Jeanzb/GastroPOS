import { useNavigate } from '@tanstack/react-router';
import { ChevronDown, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/auth';
import { useAuthStore } from '@/stores';

export function Topbar() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { logout } = useAuth();

  const onLogout = async () => {
    await logout();
    await navigate({ to: '/login' });
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
      <div>
        <p className="text-sm font-medium">Catálogo</p>
        <p className="text-xs text-muted-foreground">Productos y categorías</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange/15 text-xs font-semibold text-orange">
              {user?.fullName?.charAt(0) ?? 'U'}
            </span>
            <span className="text-sm">{user?.fullName ?? 'Usuario'}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
