import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';

const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'];
const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
};

@Injectable()
export class PhotosService {
  private readonly logger = new Logger('PhotosService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async upload(filename: string, buffer: Buffer, caption?: string) {
    const ext = path.extname(filename || '.jpg').toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      throw new BadRequestException('Unsupported file type');
    }
    const dir = this.config.uploadsDir;
    fs.mkdirSync(dir, { recursive: true });
    const id = crypto.randomUUID();
    const storedName = `${id}${ext}`;
    const filePath = path.join(dir, storedName);
    fs.writeFileSync(filePath, buffer);

    const photo = await this.prisma.photo.create({
      data: { localPath: filePath, caption: caption ?? null },
    });
    this.logger.log(`Photo uploaded: ${photo.id} (${buffer.length} bytes)`);
    return { id: photo.id, filename: storedName, url: `/api/photos/${photo.id}`, caption: caption ?? null };
  }

  async resolve(id: number): Promise<{ path: string; mime: string }> {
    const photo = await this.prisma.photo.findUnique({ where: { id } });
    if (!photo?.localPath || !fs.existsSync(photo.localPath)) {
      throw new NotFoundException('Photo not found');
    }
    const ext = path.extname(photo.localPath).toLowerCase();
    return { path: photo.localPath, mime: MIME_BY_EXT[ext] ?? 'application/octet-stream' };
  }

  async link(eventId: number, photoId: number) {
    const photo = await this.prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo) throw new NotFoundException('Photo not found');
    await this.prisma.photo.update({ where: { id: photoId }, data: { eventId } });
    this.logger.log(`Photo ${photoId} linked to event ${eventId}`);
    return { photo_id: photoId, event_id: eventId };
  }
}
