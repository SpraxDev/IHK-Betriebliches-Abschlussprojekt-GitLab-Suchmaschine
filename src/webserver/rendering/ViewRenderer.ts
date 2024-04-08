import { FastifyReply } from 'fastify';
import Fs from 'node:fs';
import Path from 'node:path';
import * as Squirrelly from 'squirrelly';
import type { TemplateFunction } from 'squirrelly/dist/types/compile';
import type { PartialConfig } from 'squirrelly/dist/types/config';
import { singleton } from 'tsyringe';
import { IS_PRODUCTION, RESOURCE_VIEWS_DIR } from '../../constants';

@singleton()
export default class ViewRenderer {
  private static readonly FILTER_ERROR_ON_NULL = 'errorOnNull';
  private readonly SQUIRRELLY_OPTIONS = {
    async: true,
    defaultFilter: ViewRenderer.FILTER_ERROR_ON_NULL,
    autoEscape: true,
    cache: IS_PRODUCTION,
    root: RESOURCE_VIEWS_DIR
  } satisfies PartialConfig;
  private readonly templateCache = new Map<string, TemplateFunction>();

  constructor() {
    ViewRenderer.initializeSquirrellyGlobals();
  }

  async render(viewTemplate: string, data: object = {}): Promise<string> {
    return Squirrelly.render(await this.resolveTemplateFunction(viewTemplate), data, this.SQUIRRELLY_OPTIONS);
  }

  async reply(reply: FastifyReply, viewTemplate: string, data: object = {}): Promise<void> {
    const html = await this.render(viewTemplate, data);
    await reply
      .type('text/html; charset=utf-8')
      .send(html);
  }

  private async resolveTemplateFunction(viewTemplate: string): Promise<TemplateFunction> {
    let templateFunction = this.templateCache.get(viewTemplate);
    if (templateFunction == null) {
      templateFunction = Squirrelly.compile(await this.readTemplateFileContent(viewTemplate), this.SQUIRRELLY_OPTIONS);
    }

    if (IS_PRODUCTION) {
      this.templateCache.set(viewTemplate, templateFunction);
    }
    return templateFunction;
  }

  private async readTemplateFileContent(viewTemplate: string): Promise<string> {
    try {
      return await Fs.promises.readFile(Path.join(RESOURCE_VIEWS_DIR, viewTemplate + '.sqrl.html'), 'utf-8');
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new Error(`Could not find view template file: ${viewTemplate}`);
      }

      throw new Error(`Error reading view template file ${JSON.stringify(viewTemplate)}: ${err.message}`);
    }
  }

  private static initializeSquirrellyGlobals(): void {
    Squirrelly.filters.define(this.FILTER_ERROR_ON_NULL, (reference: unknown) => {
      if (reference != null) {
        return reference;
      }
      throw new Error('A reference was null while rendering the view template');
    });
    Squirrelly.filters.define('json', (reference: unknown) => {
      return JSON.stringify(reference, null, 2);
    });
  }
}
