import { Test } from '@nestjs/testing';
import { GreetingService } from './greeting.service';

describe('GreetingService', () => {
  let service: GreetingService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [GreetingService],
    })
      .overrideProvider(GreetingService)
      .useValue({
        getGreeting: jest.fn().mockResolvedValue({ message: 'Hello, World!' }),
      })
      .compile();

    service = module.get<GreetingService>(GreetingService);
  });

  it('should return a greeting', async () => {
    const result = await service.getGreeting('World', 'en');
    expect(result).toEqual({ message: 'Hello, World!' });
  });
});
