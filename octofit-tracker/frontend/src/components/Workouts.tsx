import { useRemoteData } from '../api/useRemoteData.js';

type Workout = { _id?: string; title: string; focus: string; minutes: number; difficulty: string; reason: string };
type WorkoutsResponse = { suggestions: Workout[] };
const demoUserEmail = 'mona@example.com';

export default function Workouts() {
  const path = `/api/workouts/suggestions/${encodeURIComponent(demoUserEmail)}`;
  const { state } = useRemoteData<WorkoutsResponse>(path);
  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">Workout suggestions</h2>
    <p>Recommendations for {demoUserEmail}, based on fitness goals and recent activity.</p>
    {state.status === 'loading' && <p role="status">Loading workout suggestions…</p>}
    {state.status === 'error' && <p role="alert">Unable to load workout suggestions. {state.message}</p>}
    {state.status === 'success' && (state.data.suggestions.length === 0
      ? <p>No workout suggestions are available yet.</p>
      : <ul className="list-group">{state.data.suggestions.map((workout, index) => <li className="list-group-item" key={workout._id ?? `${workout.title}-${index}`}>
        <h3 className="h6">{workout.title}</h3>
        <p className="mb-1">{workout.focus} · {workout.minutes} minutes · {workout.difficulty}</p>
        <p className="mb-0 text-body-secondary">{workout.reason}</p>
      </li>)}</ul>)}
  </div></section>;
}
