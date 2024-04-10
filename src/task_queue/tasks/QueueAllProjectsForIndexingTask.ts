import { singleton } from 'tsyringe';
import AppGitLabApiClient from '../../indexer/gitlab/AppGitLabApiClient';
import { Project } from '../../indexer/gitlab/GitLabApiClient';
import ProjectIndexer from '../../indexer/ProjectIndexer';
import TaskQueue from '../TaskQueue';
import IndexProjectTask from './IndexProjectTask';
import Task, { TaskPriority } from './Task';

@singleton()
export default class QueueAllProjectsForIndexingTask extends Task {
  constructor(
    private readonly gitLabApiClient: AppGitLabApiClient,
    private readonly projectIndexer: ProjectIndexer,
    private readonly taskQueue: TaskQueue
  ) {
    super('QueueAllProjectsForIndexing', TaskPriority.HIGH);
  }

  async run(): Promise<void> {
    const tasksToQueue: Task[] = [];

    const projects = await this.findProjectsToIndex();
    for (const project of projects) {
      let taskPriority = TaskPriority.INCREMENTAL_INDEX;
      if (await this.projectIndexer.wouldProjectNeedFullIndex(project)) {
        taskPriority = TaskPriority.FULL_INDEX;
      }

      tasksToQueue.push(new IndexProjectTask(project.id, taskPriority, this.projectIndexer));
    }

    this.taskQueue.add(tasksToQueue);
  }

  equals(other: Task): boolean {
    return other instanceof QueueAllProjectsForIndexingTask;
  }

  private async findProjectsToIndex(): Promise<Project[]> {
    const projects: Project[] = [];

    let projectsPaginated = await this.gitLabApiClient.fetchProjectList();
    do {
      projects.push(...projectsPaginated.getItems());

      if (projectsPaginated.hasNextPage()) {
        projectsPaginated = await projectsPaginated.fetchNext();
      }
    } while (projectsPaginated.hasNextPage());

    return projects;
  }
}
