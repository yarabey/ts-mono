import { render, screen, fireEvent } from '@testing-library/react';
import { LoadingButton } from './LoadingButton';

describe('LoadingButton', () => {
  it('shows the label when not loading and is clickable', () => {
    let clicks = 0;
    render(<LoadingButton onClick={() => (clicks += 1)}>Сохранить</LoadingButton>);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(clicks).toBe(1);
    expect(btn.textContent).toContain('Сохранить');
  });

  it('disables and shows a spinner while loading', () => {
    let clicks = 0;
    render(
      <LoadingButton loading onClick={() => (clicks += 1)}>
        Сохранить
      </LoadingButton>,
    );
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(clicks).toBe(0);
    expect(screen.getByRole('status')).toBeTruthy();
  });
});
