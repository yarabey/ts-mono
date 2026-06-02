import { render, screen, fireEvent } from '@testing-library/react';
import type { Event } from '@acme/baby-bot-domain';
import { EventCard } from './EventCard';

const event: Event = {
  id: 7,
  child_id: 1,
  event_type: 'feeding',
  occurred_at: '2026-06-02T10:30:00.000Z',
  source: 'miniapp',
  details: { feeding_type: 'bottle', amount_ml: 90, food_name: 'Смесь' },
};

describe('EventCard', () => {
  it('renders the label and summary', () => {
    render(<EventCard event={event} />);
    expect(screen.getByText('Кормление')).toBeTruthy();
    expect(screen.getByText(/Бутылочка/)).toBeTruthy();
    expect(screen.getByText(/90 мл/)).toBeTruthy();
  });

  it('fires edit and delete callbacks', () => {
    let edited = 0;
    let deleted = 0;
    render(<EventCard event={event} onEdit={() => (edited += 1)} onDelete={() => (deleted += 1)} />);
    fireEvent.click(screen.getByLabelText('Изменить'));
    fireEvent.click(screen.getByLabelText('Удалить'));
    expect(edited).toBe(1);
    expect(deleted).toBe(1);
  });
});
