import { Body, Controller, Logger, Post } from '@nestjs/common';
import { RawEntriesService } from '../raw-entries/raw-entries.service';
import { Public } from '../auth/public.decorator';

interface AliceRequest {
  version?: string;
  request?: { command?: string };
  session?: { user_id?: string };
  state?: { session?: { mode?: string } };
}

@Controller()
export class AliceController {
  private readonly logger = new Logger('AliceController');

  constructor(private readonly rawEntries: RawEntriesService) {}

  @Public()
  @Post('webhook')
  async webhook(@Body() body: AliceRequest) {
    try {
      const command = body.request?.command ?? '';
      const userId = body.session?.user_id ?? 'alice';
      const mode = body.state?.session?.mode;

      if (!command.trim()) {
        return { response: { text: 'Пустая команда', end_session: true }, version: body.version };
      }
      if (mode === 'interactive') {
        await this.rawEntries.createRawEntry({ source: 'alice', text: command, author: userId });
        return { response: { text: 'Записала', end_session: true }, version: body.version };
      }
      if (command.toLowerCase() === 'интерактив') {
        return {
          response: { text: 'Что хотите записать?', end_session: false },
          session_state: { mode: 'interactive' },
          version: body.version,
        };
      }
      await this.rawEntries.createRawEntry({ source: 'alice', text: command, author: userId });
      return { response: { text: 'Записала', end_session: true }, version: body.version };
    } catch (err) {
      this.logger.error(`Alice webhook error: ${(err as Error).message}`);
      return { response: { text: 'Ошибка', end_session: true }, version: '1.0' };
    }
  }
}
