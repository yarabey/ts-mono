import { Injectable } from '@nestjs/common';
import { prisma } from '../prisma';
import { formatGreeting, validateName, GreetingResponseSchema } from '@acme/sample-domain';

@Injectable()
export class GreetingService {
  async getGreeting(name: string, locale: string) {
    if (!validateName(name)) {
      throw new Error('Invalid name');
    }

    const template = await prisma.greetingTemplate.findUnique({
      where: { locale },
    });

    if (!template) {
      throw new Error(`No template found for locale: ${locale}`);
    }

    const message = formatGreeting(template.template, name);
    return GreetingResponseSchema.parse({ message });
  }
}
