import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import * as fs from 'fs';
import '@fastify/multipart';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { PhotosService } from './photos.service';

@Controller('api')
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Post('photos/upload')
  @HttpCode(201)
  async upload(@Req() req: FastifyRequest) {
    const data = await req.file();
    if (!data) throw new BadRequestException('No file uploaded');
    const buffer = await data.toBuffer();
    const captionField = data.fields?.caption as { value?: unknown } | undefined;
    const caption =
      captionField && 'value' in captionField ? (captionField.value as string) : undefined;
    return this.photos.upload(data.filename ?? 'upload.jpg', buffer, caption);
  }

  @Get('photos/:id')
  async serve(@Param('id', ParseIntPipe) id: number, @Res() reply: FastifyReply) {
    const { path, mime } = await this.photos.resolve(id);
    reply.type(mime);
    return reply.send(fs.createReadStream(path));
  }

  @Post('events/:eventId/photo')
  link(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() body: { photo_id?: number },
  ) {
    if (!body?.photo_id) throw new BadRequestException('photo_id is required');
    return this.photos.link(eventId, body.photo_id);
  }
}
