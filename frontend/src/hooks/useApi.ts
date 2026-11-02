import { useCallback, useEffect, useState, type DependencyList } from "react"



/**
 * Runs an async loader whenever `deps` change and tracks loading/error state.
 * Stale responses from earlier runs are ignored.
 */
export function useApi<T>(loader: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<ApiState<T>>({ data: undefined, error: undefined, loading: true })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    setState((current) => ({ ...current, loading: true, error: undefined }))
    loader()
      .then((data) => active && setState({ data, error: undefined, loading: false }))
      .catch((error: Error) => active && setState((current) => ({ ...current, error, loading: false })))
    return () => {
      active = false
    }
    // The caller controls when to reload through `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const setData = useCallback(
    (update: T | ((current: T | undefined) => T)) =>
      setState((current) => ({
        ...current,
        data: typeof update === "function" ? (update as (c: T | undefined) => T)(current.data) : update,
      })),
    [],
  )

  return { ...state, reload, setData }
}
