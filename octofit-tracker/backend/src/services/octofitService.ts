import { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

function activityFocus(type: string) {
  const normalized = type.trim().toLowerCase();
  if (['run', 'running', 'cycle', 'cycling', 'walk', 'walking'].includes(normalized)) return 'endurance';
  if (['strength', 'weights', 'lifting'].includes(normalized)) return 'strength';
  if (['yoga', 'stretching', 'mobility'].includes(normalized)) return 'mobility';
  return normalized;
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) throw httpError(400, 'Activity details are required');
  const { userId, teamId, type, minutes } = input;
  if (!isObjectId(userId) || !isObjectId(teamId)) throw httpError(400, 'Valid userId and teamId are required');
  if (typeof type !== 'string' || !type.trim()) throw httpError(400, 'Activity type is required');
  if (typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes < 1) {
    throw httpError(400, 'Minutes must be a positive whole number');
  }

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) throw httpError(404, 'User or team was not found');

  const activity = await Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
  return activity.toObject();
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) throw httpError(400, 'Team details are required');
  const { name, mascot } = input;
  if (typeof name !== 'string' || !name.trim()) throw httpError(400, 'Team name is required');
  if (typeof mascot !== 'string' || !mascot.trim()) throw httpError(400, 'Team mascot is required');

  const members = input.members ?? [];
  if (!Array.isArray(members) || !members.every(isObjectId)) {
    throw httpError(400, 'Members must be an array of valid user IDs');
  }
  const memberIds = [...new Set(members)];
  if (memberIds.length) {
    const existingUsers = await User.find({ _id: { $in: memberIds } }).select('_id').lean();
    if (existingUsers.length !== memberIds.length) throw httpError(404, 'One or more team members were not found');
  }

  const team = await Team.create({ name: name.trim(), mascot: mascot.trim(), members: memberIds });
  if (memberIds.length) {
    await Promise.all([
      User.updateMany({ _id: { $in: memberIds } }, { $set: { team: team._id } }),
      Team.updateMany(
        { _id: { $ne: team._id }, members: { $in: memberIds } },
        { $pull: { members: { $in: memberIds } } },
      ),
    ]);
  }
  return team.toObject();
}

export async function getLeaderboard() {
  const entries = await Activity.aggregate<{ teamName: string; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $lookup: { from: Team.collection.name, localField: '_id', foreignField: '_id', as: 'team' } },
    { $unwind: '$team' },
    { $project: { _id: 0, teamName: '$team.name', totalPoints: 1 } },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);
  return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) throw httpError(404, 'User was not found');

  const recentActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const goal = user.fitnessGoal?.trim().toLowerCase();
  const focus = goal || (recentActivity ? activityFocus(recentActivity.type) : 'general');
  const workouts = await Workout.find().lean();
  workouts.sort((left, right) => {
    const leftMatches = left.focus.toLowerCase() === focus ? 1 : 0;
    const rightMatches = right.focus.toLowerCase() === focus ? 1 : 0;
    return rightMatches - leftMatches || left.title.localeCompare(right.title);
  });

  return workouts.map((workout) => ({
    ...workout,
    reason: workout.focus.toLowerCase() === focus
      ? `Matches your ${focus} fitness goal${recentActivity ? ` and recent ${recentActivity.type} activity` : ''}.`
      : `An alternative workout based on your ${focus} fitness goal.`,
  }));
}

export { User };
