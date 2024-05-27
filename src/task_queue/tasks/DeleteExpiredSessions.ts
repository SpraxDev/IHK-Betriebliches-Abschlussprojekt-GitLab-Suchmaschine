import { singleton } from 'tsyringe';
import SessionPrismaStore from '../../webserver/SessionPrismaStore';
import Task, { TaskPriority } from './Task';

@singleton()
export default class DeleteExpiredSessions extends Task {
  constructor(
    private readonly sessionPrismaStore: SessionPrismaStore
  ) {
    super('DeleteExpiredSessions', TaskPriority.NORMAL);
  }

  run(): Promise<void> {
    return this.sessionPrismaStore.deleteExpiredSessions();
  }

  equals(other: Task): boolean {
    return other instanceof DeleteExpiredSessions;
  }
}
