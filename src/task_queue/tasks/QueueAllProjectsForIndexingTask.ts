import { singleton } from 'tsyringe';
import AppConfiguration from '../../config/AppConfiguration';
import AppGitLabApiClient from '../../gitlab/AppGitLabApiClient';
import { Project } from '../../gitlab/GitLabApiClient';
import Paginated from '../../gitlab/Paginated';
import ProjectIndexer from '../../indexer/ProjectIndexer';
import TaskQueue from '../TaskQueue';
import IndexProjectTask from './IndexProjectTask';
import Task, { TaskPriority } from './Task';

@singleton()
export default class QueueAllProjectsForIndexingTask extends Task {
  constructor(
    private readonly appConfiguration: AppConfiguration,
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

    const topicsToIndex = this.appConfiguration.config.projectsToIndex.topics;
    if (topicsToIndex.length > 0) {
      for (const topic of topicsToIndex) {
        projects.push(...(await this.fetchAllPaginatedItems(this.gitLabApiClient.fetchProjects(topic))));
      }
    }

    return projects;
  }

  private async fetchAllPaginatedItems<T>(paginated: Promise<Paginated<T>>): Promise<T[]> {
    const items: T[] = [];

    let current = await paginated;
    do {
      items.push(...current.getItems());

      if (current.hasNextPage()) {
        current = await current.fetchNext();
      }
    } while (current.hasNextPage());

    return items;
  }
}
