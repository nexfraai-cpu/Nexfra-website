import { Request, Response } from 'express';
import { supabase } from '../database/client.js';
import { asyncWrap } from '../middleware/async-wrap.js';
import { logger } from '../config/logger.js';

export class StorageController {
  get = asyncWrap(async (req: Request, res: Response) => {
    const { key } = req.params;
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      logger.error({ error, key }, 'Storage get failed');
      res.status(500).json({ error: 'StorageError', message: 'Failed to read storage' });
      return;
    }

    res.json({ value: data?.value ?? null });
  });

  set = asyncWrap(async (req: Request, res: Response) => {
    const { key } = req.params;
    const { value } = req.body;

    const { error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key,
          value,
          description: `Frontend storage: ${key}`,
          updated_by: req.user?.id ?? null,
        },
        { onConflict: 'key' },
      );

    if (error) {
      logger.error({ error, key }, 'Storage set failed');
      res.status(500).json({ error: 'StorageError', message: 'Failed to write storage' });
      return;
    }

    logger.info({ key, actorId: req.user?.id }, 'Storage key set');
    res.json({ value });
  });

  remove = asyncWrap(async (req: Request, res: Response) => {
    const { key } = req.params;
    const { error } = await supabase
      .from('app_settings')
      .delete()
      .eq('key', key);

    if (error) {
      logger.error({ error, key }, 'Storage remove failed');
      res.status(500).json({ error: 'StorageError', message: 'Failed to remove storage key' });
      return;
    }

    logger.info({ key, actorId: req.user?.id }, 'Storage key removed');
    res.json({ deleted: true });
  });

  clear = asyncWrap(async (_req: Request, res: Response) => {
    const { error } = await supabase
      .from('app_settings')
      .delete()
      .like('key', 'NEXFRA_%');

    if (error) {
      logger.error({ error }, 'Storage clear failed');
      res.status(500).json({ error: 'StorageError', message: 'Failed to clear storage' });
      return;
    }

    logger.info('Storage cleared');
    res.json({ cleared: true });
  });
}
