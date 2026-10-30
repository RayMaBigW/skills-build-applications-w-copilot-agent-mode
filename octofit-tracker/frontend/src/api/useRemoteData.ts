import { useEffect, useState } from 'react';
import { getJson } from './client.js';

export type RemoteState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

export function useRemoteData<T>(path: string) {
  const [state, setState] = useState<RemoteState<T>>({ status: 'loading' });
  const [requestNumber, setRequestNumber] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    getJson<T>(path)
      .then((data) => {
        if (active) setState({ status: 'success', data });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unexpected error',
          });
        }
      });
    return () => { active = false; };
  }, [path, requestNumber]);

  return { state, refresh: () => setRequestNumber((current) => current + 1) };
}