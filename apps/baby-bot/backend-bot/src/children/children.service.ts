import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ageInMonths,
  type Child,
  type UpdateChildPayload,
} from '@acme/baby-bot-domain';
import { PrismaService } from '../prisma/prisma.service';

type ChildRow = {
  id: number;
  name: string;
  birthDate: Date;
  gender: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toChild(row: ChildRow): Child {
  const birthDate = row.birthDate.toISOString().slice(0, 10);
  return {
    id: row.id,
    name: row.name,
    birth_date: birthDate,
    gender: row.gender === 'male' || row.gender === 'female' ? row.gender : undefined,
    age_months: ageInMonths(birthDate),
    avatar_url: row.avatarUrl ?? undefined,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class ChildrenService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<{ children: Child[] }> {
    const rows = await this.prisma.child.findMany({ orderBy: { id: 'asc' } });
    return { children: rows.map((r) => toChild(r as ChildRow)) };
  }

  async update(id: number, payload: UpdateChildPayload): Promise<Child> {
    const existing = await this.prisma.child.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Child not found');
    const row = await this.prisma.child.update({
      where: { id },
      data: {
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.birth_date !== undefined && {
          birthDate: new Date(payload.birth_date),
        }),
        ...(payload.gender !== undefined && { gender: payload.gender }),
        ...(payload.avatar_url !== undefined && { avatarUrl: payload.avatar_url }),
      },
    });
    return toChild(row as ChildRow);
  }
}
