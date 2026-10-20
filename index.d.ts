import type { ReadableAtom, AnyStore, Store, StoreValue } from 'nanostores'

export type AsyncValue<T> =
  | {
      changing: boolean
      error: unknown
      status: 'failed'
      /** @deprecated use `status` */
      state: 'failed'
    }
  | {
      changing: boolean
      status: 'ready'
      /** @deprecated use `status` */
      state: 'ready'
      value: T
    }
  | {
      status: 'loading'
      /** @deprecated use `status` */
      state: 'loading'
    }

export type AsyncComputedStore<Value> = {
  readonly async: true
  readonly value: AsyncValue<Awaited<Value>>
} & ReadableAtom<AsyncValue<Awaited<Value>>>

export type AsyncStoreValue<SomeStore> = SomeStore extends {
  get(): AsyncValue<infer Value>
}
  ? Value
  : StoreValue<SomeStore>

export type AsyncStoreValues<Stores extends AnyStore[]> = {
  [Index in keyof Stores]: AsyncStoreValue<Stores[Index]>
}

interface ComputedAsync {
  <Value, OriginStore extends Store>(
    stores: OriginStore,
    cb: (value: AsyncStoreValue<OriginStore>) => Value
  ): AsyncComputedStore<Value>
  /**
   * Create a derived store that asynchronously computes its value from
   * other stores.
   *
   * When input stores are themselves async (created by `computedAsync`),
   * their values are automatically unwrapped: the callback receives
   * the resolved value directly and is only called once all inputs are
   * in the `'ready'` state. If any input transitions to `'changing'`,
   * the derived store also transitions to `'changing'` without
   * recomputing. If any input fails, the derived store inherits the
   * error from the leftmost failed input.
   *
   * Inputs that are not async are treated as always ready, and their
   * values are passed to the callback as-is.
   *
   * ```js
   * import { computedAsync } from '@nanostores/async'
   *
   * const $org = computedAsync($orgSlug, slug => {
   *   return fetchOrgBySlug(slug)
   * })
   *
   * // The callback receives the resolved org, not an AsyncValue wrapper.
   * const $profile = computedAsync([$org, $userId], (org, userId) => {
   *   return fetchUserProfile(org.id, userId)
   * })
   * ```
   *
   * The async callback is tracked as a {@link Task}, so
   * {@link allTasks} can wait for its completion.
   */
  <Value, OriginStores extends AnyStore[]>(
    stores: [...OriginStores],
    cb: (...values: AsyncStoreValues<OriginStores>) => Value
  ): AsyncComputedStore<Value>
}

export const computedAsync: ComputedAsync

interface ComputedAsyncNoCascade {
  <Value, OriginStore extends Store>(
    stores: OriginStore,
    cb: (value: StoreValue<OriginStore>) => Value
  ): AsyncComputedStore<Value>
  /**
   * Create a derived store that asynchronously computes its value from
   * other stores, **without** automatic async cascading.
   *
   * Unlike {@link computedAsync}, when input stores are themselves
   * async, their values are NOT unwrapped. The callback receives
   * the full {@link AsyncValue} wrapper as-is and is called on
   * every state transition, giving you full control over how to
   * handle loading, ready, and failed states of upstream stores.
   *
   * ```js
   * import { computedAsync, computedAsyncNoCascade } from '@nanostores/async'
   *
   * const $org = computedAsync($orgSlug, slug => {
   *   return fetchOrgBySlug(slug)
   * })
   *
   * // The callback receives the raw AsyncValue, not the resolved value.
   * const $profile = computedAsyncNoCascade($org, orgValue => {
   *   if (orgValue.state !== 'ready') return null
   *   return fetchUserProfile(orgValue.value.id)
   * })
   * ```
   *
   * The async callback is tracked as a {@link Task}, so
   * {@link allTasks} can wait for its completion.
   */
  <Value, OriginStores extends AnyStore[]>(
    stores: [...OriginStores],
    cb: (...values: StoreValues<OriginStores>) => Value
  ): AsyncComputedStore<Value>
}

export const computedAsyncNoCascade: ComputedAsyncNoCascade
