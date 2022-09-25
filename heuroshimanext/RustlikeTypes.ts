//Rust-like algebraic types <3
export type OK<T> = {_tag: "Ok", ok: T}
export type Err<E> = {_tag: "Err", err: E}
export const Ok = <T, E>(ok: T): ResultE<T, E> => ({_tag: "Ok", ok})
export const Err = <T, E>(err: E): ResultE<T, E> => ({_tag: "Err", err})
export type ResultE<T, E> = OK<T> | Err<E>
export type Result<T> = ResultE<T, string>