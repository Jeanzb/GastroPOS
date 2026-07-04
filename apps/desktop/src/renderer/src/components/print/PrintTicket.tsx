import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Ticket destinado solo a impresion en rollo 58/80mm.
 *
 * Se monta como hijo directo de <body> para que la hoja `@media print`
 * (assets/index.css) pueda ocultar el resto de la app y mostrar unicamente
 * este nodo. En pantalla permanece oculto. Renderizar solo mientras el
 * dialogo dueno este abierto para que nunca haya dos tickets a la vez.
 */
export function PrintTicket({ children }: { children: ReactNode }) {
  return createPortal(<div className="print-ticket">{children}</div>, document.body);
}

export function TicketDivider() {
  return <div className="print-ticket-divider" aria-hidden="true" />;
}

export function TicketRow({
  label,
  value,
  strong = false,
}: {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className={strong ? 'print-ticket-row print-ticket-strong' : 'print-ticket-row'}>
      <span className="print-ticket-row-label">{label}</span>
      <span className="print-ticket-row-value">{value}</span>
    </div>
  );
}

export function TicketHeader({
  branchName,
  title,
  lines,
}: {
  branchName?: string | null;
  title: string;
  lines?: Array<string | null | undefined>;
}) {
  return (
    <header className="print-ticket-header">
      <p className="print-ticket-brand">{branchName ?? 'GastroIA'}</p>
      <p className="print-ticket-title">{title}</p>
      {lines
        ?.filter((line): line is string => Boolean(line))
        .map((line) => (
          <p key={line} className="print-ticket-meta">
            {line}
          </p>
        ))}
    </header>
  );
}
