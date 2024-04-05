import { FastifyReply } from 'fastify';
import ViewRenderer from '../ViewRenderer';

export default abstract class AbstractView<T extends object> {
  protected constructor(
    protected readonly viewRenderer: ViewRenderer
  ) {
  }

  protected abstract get templateFile(): string;

  public reply(reply: FastifyReply, templateData: T): Promise<void> {
    return this.viewRenderer.reply(reply, this.templateFile, templateData);
  }
}
