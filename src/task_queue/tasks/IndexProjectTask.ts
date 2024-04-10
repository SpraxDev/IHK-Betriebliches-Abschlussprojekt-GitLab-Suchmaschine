import ProjectIndexer from '../../indexer/ProjectIndexer';
import Task, { TaskPriority } from './Task';

export default class IndexProjectTask extends Task {
  constructor(
    private readonly projectId: number,
    priority: TaskPriority,
    private readonly projectIndexer: ProjectIndexer
  ) {
    super(`IndexProject{projectId=${projectId}}`, priority);
  }

  run(): Promise<void> {
    return this.projectIndexer.indexProject(this.projectId);
  }

  equals(other: Task): boolean {
    return other instanceof IndexProjectTask &&
      other.projectId === this.projectId;
  }
}
