import type { RequestActor } from '../auth/auth.types';

/** Who is performing a catalog action, plus request metadata for auditing. */
export type CatalogActor = RequestActor;
