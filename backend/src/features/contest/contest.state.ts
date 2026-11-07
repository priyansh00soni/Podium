export type ContestState = 'before' | 'running' | 'ended';

export function getContestState(startsAt: Date, endsAt: Date, now: Date = new Date()): ContestState {
  if (now < startsAt) {
    return 'before';
  }
  
  if (now > endsAt) {
    return 'ended';
  }
  
  return 'running';
}