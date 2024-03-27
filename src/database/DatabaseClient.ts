import { PrismaClient } from '@prisma/client';
import { singleton } from 'tsyringe';

@singleton()
export default class DatabaseClient extends PrismaClient {
}
