import { Body, Controller, Get, Param, ParseIntPipe, Put } from '@nestjs/common';
import { UpdateChildPayloadSchema } from '@acme/baby-bot-domain';
import { ChildrenService } from './children.service';

@Controller('api/children')
export class ChildrenController {
  constructor(private readonly children: ChildrenService) {}

  @Get()
  list() {
    return this.children.list();
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    return this.children.update(id, UpdateChildPayloadSchema.parse(body));
  }
}
