import { render, screen, fireEvent } from '@testing-library/react';
import { TimeInput } from './TimeInput';

describe('TimeInput', () => {
  it('renders the HH:mm value', () => {
    render(<TimeInput value="08:30" onChange={() => undefined} />);
    const input = screen.getByDisplayValue('08:30') as HTMLInputElement;
    expect(input.type).toBe('time');
  });

  it('emits the new value on change', () => {
    let received = '';
    render(<TimeInput value="08:30" onChange={(v) => (received = v)} />);
    fireEvent.change(screen.getByDisplayValue('08:30'), { target: { value: '14:15' } });
    expect(received).toBe('14:15');
  });
});
