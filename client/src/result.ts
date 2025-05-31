export type Result<T, E> = Ok<T> | Warn<T> | Err<E>;

export type Ok<T> = {
  ok: true;
  value?: T;
};

export type Err<E> = {
  ok: false;
  error: E;
};

export type Warn<T> = {
  ok: 'warn';
  value?: T;
};

export function ok<T>(value?: T): Ok<T> {
  return { ok: true, value };
}

export function warn<T>(value?: T): Warn<T> {
  return { ok: 'warn', value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}
