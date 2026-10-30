import { useState, type FormEvent } from 'react';
import { postJson } from '../api/client.js';
import { useRemoteData } from '../api/useRemoteData.js';

type Activity = { _id?: string; type: string; minutes: number; points: number; occurredAt?: string };
type ActivityResponse = { activities: Activity[] };

export default function Activities() {
  const { state, refresh } = useRemoteData<ActivityResponse>('/api/activities');
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  async function submitActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      await postJson('/api/activities', {
        userId: values.get('userId'),
        teamId: values.get('teamId'),
        type: values.get('type'),
        minutes: Number(values.get('minutes')),
      });
      form.reset();
      setMessage({ kind: 'success', text: 'Activity recorded.' });
      refresh();
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to record activity.' });
    }
  }

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">Activities</h2>
    <p>Track student activity minutes and points.</p>
    <form className="row g-3 mb-4" onSubmit={submitActivity}>
      <div className="col-md-6"><label className="form-label" htmlFor="activity-user-id">User ID</label><input className="form-control" id="activity-user-id" name="userId" required /></div>
      <div className="col-md-6"><label className="form-label" htmlFor="activity-team-id">Team ID</label><input className="form-control" id="activity-team-id" name="teamId" required /></div>
      <div className="col-md-4"><label className="form-label" htmlFor="activity-type">Activity type</label><input className="form-control" id="activity-type" name="type" required /></div>
      <div className="col-md-4"><label className="form-label" htmlFor="activity-minutes">Minutes</label><input className="form-control" id="activity-minutes" name="minutes" type="number" min="1" step="1" required /></div>
      <div className="col-md-4 d-flex align-items-end"><button className="btn btn-primary" type="submit">Record activity</button></div>
    </form>
    {message && <p role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
    {state.status === 'loading' && <p role="status">Loading activities…</p>}
    {state.status === 'error' && <p role="alert">Unable to load activities. {state.message}</p>}
    {state.status === 'success' && (state.data.activities.length === 0
      ? <p>No activities have been recorded yet.</p>
      : <ul className="list-group">{state.data.activities.map((activity, index) => <li className="list-group-item" key={activity._id ?? `${activity.type}-${index}`}>
        <strong>{activity.type}</strong> — {activity.minutes} minutes, {activity.points} points
        {activity.occurredAt && <span className="text-body-secondary"> · {new Date(activity.occurredAt).toLocaleDateString()}</span>}
      </li>)}</ul>)}
  </div></section>;
}
