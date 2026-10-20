import { atom, onMount, task } from 'nanostores'

/* @__NO_SIDE_EFFECTS__ */
let computedAsyncStore = (stores, cb, cascade) => {
  if (!Array.isArray(stores)) stores = [stores]

  let $computed = atom({ status: 'loading', state: 'loading' })

  let lastArgs
  let load = () => {
    let args = stores.map($store => $store.get())
    if (!lastArgs || args.some((arg, i) => arg !== lastArgs[i])) {
      lastArgs = args
      let current = $computed.get()
      if (current.status !== 'loading' && !current.changing) {
        // If the state is already 'loading' or 'changing', leave it as is
        // so it doesn't trigger downstream updates unnecessarily.
        $computed.set({ ...current, changing: true })
      }
      let inputs = args
      if (cascade) {
        // Cascading mutates the array in place
        inputs = [...args]
        for (let i = 0; i < inputs.length; i++) {
          if (inputs[i]?.status === 'loading' || inputs[i]?.changing) {
            // Do not start loading if any of the input stores are async and
            // currently loading or changing. This prevents recomputing async values
            // in intermediary states.
            return
          }
          if (inputs[i]?.status === 'failed') {
            // Propagate failure if any of the input stores are async and currently failed.
            $computed.set({
              changing: false,
              error: inputs[i].error,
              status: 'failed',
              state: 'failed'
            })
            return
          }
          if (inputs[i]?.status === 'ready') {
            inputs[i] = inputs[i].value
          }
        }
      }
      // Ensures async so synchronous throws become async rejections
      task(() =>
        Promise.resolve()
          .then(() => {
            if (lastArgs === args) {
              // Prevent a stale call
              return cb(...inputs)
            }
          })
          .then(
            value => {
              if (lastArgs === args) {
                // Prevent a stale set
                $computed.set({
                  changing: false,
                  status: 'ready',
                  state: 'ready',
                  value
                })
              }
            },
            error => {
              if (lastArgs === args) {
                // Prevent a stale set
                $computed.set({
                  changing: false,
                  error,
                  status: 'failed',
                  state: 'failed'
                })
              }
            }
          )
      )
    }
  }

  onMount($computed, () => {
    let unbinds = stores.map($store => $store.listen(load))
    load()
    return () => {
      for (let unbind of unbinds) unbind()
    }
  })

  return $computed
}

/* @__NO_SIDE_EFFECTS__ */
export const computedAsync = (stores, fn) =>
  computedAsyncStore(stores, fn, true)

/* @__NO_SIDE_EFFECTS__ */
export const computedAsyncNoCascade = (stores, fn) =>
  computedAsyncStore(stores, fn, false)
