import { useState, type FormEvent } from 'react';
import { postJson } from '../api/client.js';
import { useRemoteData } from '../api/useRemoteData.js';

type Team = { _id?: string; name: string; mascot: string; members: string[] };
type TeamsResponse = { teams: Team[] };

export default function Teams() {
  const { state, refresh } = useRemoteData<TeamsResponse>('/api/teams');
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  async function submitTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const memberText = String(values.get('members') ?? '').trim();
    const members = memberText ? memberText.split(',').map((member) => member.trim()).filter(Boolean) : [];
    try {
      await postJson('/api/teams', { name: values.get('name'), mascot: values.get('mascot'), members });
      form.reset();
      setMessage({ kind: 'success', text: 'Team created.' });
      refresh();
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to create team.' });
    }
  }

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">Teams</h2>
    <p>Manage teams and members.</p>
    <form className="row g-3 mb-4" onSubmit={submitTeam}>
      <div className="col-md-4"><label className="form-label" htmlFor="team-name">Team name</label><input className="form-control" id="team-name" name="name" required /></div>
      <div className="col-md-4"><label className="form-label" htmlFor="team-mascot">Mascot</label><input className="form-control" id="team-mascot" name="mascot" required /></div>
      <div className="col-md-4"><label className="form-label" htmlFor="team-members">Member IDs (comma-separated)</label><input className="form-control" id="team-members" name="members" /></div>
      <div className="col-12"><button className="btn btn-primary" type="submit">Create team</button></div>
    </form>
    {message && <p role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
    {state.status === 'loading' && <p role="status">Loading teams…</p>}
    {state.status === 'error' && <p role="alert">Unable to load teams. {state.message}</p>}
    {state.status === 'success' && (state.data.teams.length === 0
      ? <p>No teams have been created yet.</p>
      : <ul className="list-group">{state.data.teams.map((team, index) => <li className="list-group-item" key={team._id ?? `${team.name}-${index}`}>
        <strong>{team.name}</strong> — {team.mascot}
        <div className="text-body-secondary">Members: {team.members.length ? team.members.map(String).join(', ') : 'None yet'}</div>
      </li>)}</ul>)}
  </div></section>;
}
