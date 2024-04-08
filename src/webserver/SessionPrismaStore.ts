import type { SessionStore } from '@fastify/session';
import type { Session } from 'fastify';
import { injectable } from 'tsyringe';
import DatabaseClient from '../database/DatabaseClient';

type Callback = (err?: any) => void;
type CallbackSession = (err: any, result?: Session | null) => void;

@injectable()
export default class SessionPrismaStore implements SessionStore {
  constructor(
    private readonly databaseClient: DatabaseClient
  ) {
  }

  set(sessionId: string, session: Session, callback: Callback): void {
    if (!(session.cookie.expires instanceof Date)) {
      throw new Error('Session cookie expires must be a Date');
    }

    this.databaseClient.sessions.upsert({
      where: { id: sessionId },
      update: {
        data: session as any,
        expires: session.cookie.expires
      },
      create: {
        id: sessionId,
        data: session as any,
        expires: session.cookie.expires
      }
    })
      .then(() => callback())
      .catch((err) => callback(err));
  }

  get(sessionId: string, callback: CallbackSession): void {
    this.databaseClient.sessions.findUnique({ where: { id: sessionId } })
      .then((session) => callback(null, (session?.data ?? null) as Session | null))
      .catch((err) => callback(err, null));
  }

  destroy(sessionId: string, callback: Callback): void {
    this.databaseClient.sessions.deleteMany({ where: { id: sessionId } })
      .then(() => callback())
      .catch((err) => callback(err));
  }

  async deleteExpiredSessions(): Promise<void> {
    const now = await this.databaseClient.fetchNow();
    await this.databaseClient.sessions.deleteMany({ where: { expires: { lt: now } } });
  }
}
