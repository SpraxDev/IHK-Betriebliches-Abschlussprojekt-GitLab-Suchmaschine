export enum TaskPriority {
  HIGH = 0,
  INCREMENTAL_INDEX = 10,
  FULL_INDEX = 20,
}

export default abstract class Task {
  protected constructor(
    public readonly displayName: string,
    public readonly priority: TaskPriority
  ) {
  }

  abstract run(): Promise<void>;

  abstract equals(other: Task): boolean;
}
