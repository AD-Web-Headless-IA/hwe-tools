import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';
import { {Name} } from './{Name}';
import { {Name}Content } from './{Name}.schema';

expect.extend(axeMatchers);

const minimal: {Name}Content = {
  title: 'Test title',
};

describe('{Name}', () => {
  it('parses minimal content', () => {
    expect(() => {Name}Content.parse(minimal)).not.toThrow();
  });

  it('renders the title', () => {
    render(<{Name} content={minimal} />);
    expect(screen.getByRole('heading', { name: 'Test title' })).toBeInTheDocument();
  });

  it('renders all declared variants without error', () => {
    render(<{Name} content={minimal} tone="light" />);
    render(<{Name} content={minimal} tone="dark" />);
  });

  it('passes axe accessibility audit', async () => {
    const { container } = render(<{Name} content={minimal} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
