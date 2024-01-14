/* istanbul ignore file -- @preserve */
// We're not actually exporting this link
import type { AnyRouter, Observable } from '@trpc/core';
import { observable, share } from '@trpc/core';
import type { TRPCLink } from '../types';

/**
 * @internal used for testing
 */
export function dedupeLink<
  TRouter extends AnyRouter = AnyRouter,
>(): TRPCLink<TRouter> {
  // initialized config
  return () => {
    // initialized in app
    const pending: Record<string, Observable<any, any>> = {};
    return ({ op, next }) => {
      // initialized for request

      if (op.type !== 'query') {
        // pass through
        return next(op);
      }
      const key = JSON.stringify([op.path, op.input]);
      const obs$ = pending[key];
      if (obs$) {
        // console.log('hooking into pending', { op });
        return observable((observer) => obs$.subscribe(observer));
      }

      const shared$ = observable((observer) => {
        function reset() {
          delete pending[key];
        }
        const subscription = next(op).subscribe({
          ...observer,
          error(e) {
            reset();
            observer.error(e);
          },
          complete() {
            reset();
            observer.complete();
          },
        });
        return () => {
          reset();
          subscription.unsubscribe();
        };
      }).pipe(share());
      pending[key] = shared$;
      return shared$;
    };
  };
}
