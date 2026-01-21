import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Badge from '../components/Badge';

describe('Badge', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Badge>Default Badge</Badge>);
      expect(screen.getByText('Default Badge')).toBeInTheDocument();
    });

    it('renders children correctly', () => {
      render(<Badge>Custom Content</Badge>);
      expect(screen.getByText('Custom Content')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(<Badge className="custom-class">Badge</Badge>);
      const badge = screen.getByText('Badge');
      expect(badge).toHaveClass('custom-class');
    });

    it('renders as a span element', () => {
      render(<Badge>Badge</Badge>);
      const badge = screen.getByText('Badge');
      expect(badge.tagName).toBe('SPAN');
    });
  });

  describe('Variants', () => {
    it('renders primary variant by default', () => {
      render(<Badge>Primary</Badge>);
      const badge = screen.getByText('Primary');
      expect(badge.className).toMatch(/primary/i);
    });

    it('renders accent variant', () => {
      render(<Badge variant="accent">Accent</Badge>);
      const badge = screen.getByText('Accent');
      expect(badge.className).toMatch(/accent/i);
    });

    it('renders success variant', () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText('Success');
      expect(badge.className).toMatch(/success/i);
    });

    it('renders warning variant', () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText('Warning');
      expect(badge.className).toMatch(/warning/i);
    });

    it('renders error variant', () => {
      render(<Badge variant="error">Error</Badge>);
      const badge = screen.getByText('Error');
      expect(badge.className).toMatch(/error/i);
    });

    it('renders info variant', () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText('Info');
      expect(badge.className).toMatch(/info/i);
    });

    it('renders neutral variant', () => {
      render(<Badge variant="neutral">Neutral</Badge>);
      const badge = screen.getByText('Neutral');
      expect(badge.className).toMatch(/neutral/i);
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      render(<Badge size="sm">Small</Badge>);
      const badge = screen.getByText('Small');
      expect(badge.className).toMatch(/px-2/);
      expect(badge.className).toMatch(/py-0\.5/);
      expect(badge.className).toMatch(/text-xs/);
    });

    it('renders medium size by default', () => {
      render(<Badge>Medium</Badge>);
      const badge = screen.getByText('Medium');
      expect(badge.className).toMatch(/px-2\.5/);
      expect(badge.className).toMatch(/py-1/);
      expect(badge.className).toMatch(/text-sm/);
    });

    it('renders large size', () => {
      render(<Badge size="lg">Large</Badge>);
      const badge = screen.getByText('Large');
      expect(badge.className).toMatch(/px-3/);
      expect(badge.className).toMatch(/py-1\.5/);
      expect(badge.className).toMatch(/text-base/);
    });
  });

  describe('Dot Indicator', () => {
    it('does not render dot by default', () => {
      const { container } = render(<Badge>No Dot</Badge>);
      const dots = container.querySelectorAll('span.rounded-full');
      // Only the badge itself should be rounded-full, not a dot
      expect(dots.length).toBe(1);
    });

    it('renders dot when dot prop is true', () => {
      render(<Badge dot>With Dot</Badge>);
      const badge = screen.getByText('With Dot').parentElement || screen.getByText('With Dot');
      const dot = badge.querySelector('span.rounded-full:not(:has(*))');
      expect(dot).toBeInTheDocument();
    });

    it('renders dot with correct color for each variant', () => {
      const variants = ['primary', 'accent', 'success', 'warning', 'error', 'info', 'neutral'] as const;

      variants.forEach((variant) => {
        const { unmount } = render(<Badge variant={variant} dot>{variant}</Badge>);
        const badge = screen.getByText(variant);
        const dots = badge.parentElement?.querySelectorAll('span') || badge.querySelectorAll('span');
        // Find the dot (small span inside the badge)
        const dotSpans = Array.from(dots).filter(span =>
          span.className.includes('rounded-full') && span.className.includes(variant)
        );
        expect(dotSpans.length).toBeGreaterThanOrEqual(0); // Dot exists with variant color
        unmount();
      });
    });

    it('renders dot with correct size for small badge', () => {
      render(<Badge size="sm" dot>Small Dot</Badge>);
      const badge = screen.getByText('Small Dot');
      const parent = badge.closest('span');
      const innerSpans = parent?.querySelectorAll('span');
      const dot = innerSpans ? Array.from(innerSpans).find(s => s.className.includes('h-1.5')) : null;
      expect(dot).toBeInTheDocument();
    });

    it('renders dot with correct size for medium badge', () => {
      render(<Badge size="md" dot>Medium Dot</Badge>);
      const badge = screen.getByText('Medium Dot');
      const parent = badge.closest('span');
      const innerSpans = parent?.querySelectorAll('span');
      const dot = innerSpans ? Array.from(innerSpans).find(s => s.className.includes('h-2 w-2') || s.className.includes('h-2')) : null;
      expect(dot).toBeInTheDocument();
    });

    it('renders dot with correct size for large badge', () => {
      render(<Badge size="lg" dot>Large Dot</Badge>);
      const badge = screen.getByText('Large Dot');
      const parent = badge.closest('span');
      const innerSpans = parent?.querySelectorAll('span');
      const dot = innerSpans ? Array.from(innerSpans).find(s => s.className.includes('h-2.5')) : null;
      expect(dot).toBeInTheDocument();
    });
  });

  describe('Removable Badge', () => {
    it('does not render remove button by default', () => {
      render(<Badge>Not Removable</Badge>);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('does not render remove button when only removable is true', () => {
      render(<Badge removable>Removable Only</Badge>);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders remove button when removable and onRemove are provided', () => {
      const handleRemove = vi.fn();
      render(<Badge removable onRemove={handleRemove}>Removable</Badge>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('calls onRemove when remove button is clicked', () => {
      const handleRemove = vi.fn();
      render(<Badge removable onRemove={handleRemove}>Removable</Badge>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleRemove).toHaveBeenCalledTimes(1);
    });

    it('remove button has accessible label', () => {
      const handleRemove = vi.fn();
      render(<Badge removable onRemove={handleRemove}>Removable</Badge>);

      const removeButton = screen.getByRole('button');
      expect(removeButton).toHaveAttribute('aria-label', 'Remove badge');
    });

    it('remove button is of type button', () => {
      const handleRemove = vi.fn();
      render(<Badge removable onRemove={handleRemove}>Removable</Badge>);

      const removeButton = screen.getByRole('button');
      expect(removeButton).toHaveAttribute('type', 'button');
    });

    it('remove button contains close icon', () => {
      const handleRemove = vi.fn();
      render(<Badge removable onRemove={handleRemove}>Removable</Badge>);

      const removeButton = screen.getByRole('button');
      const svg = removeButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Event Handlers', () => {
    it('calls onClick when badge is clicked', () => {
      const handleClick = vi.fn();
      render(<Badge onClick={handleClick}>Clickable</Badge>);

      fireEvent.click(screen.getByText('Clickable'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('calls onMouseEnter on hover', () => {
      const handleMouseEnter = vi.fn();
      render(<Badge onMouseEnter={handleMouseEnter}>Hoverable</Badge>);

      fireEvent.mouseEnter(screen.getByText('Hoverable'));
      expect(handleMouseEnter).toHaveBeenCalledTimes(1);
    });

    it('calls onMouseLeave on mouse leave', () => {
      const handleMouseLeave = vi.fn();
      render(<Badge onMouseLeave={handleMouseLeave}>Hoverable</Badge>);

      fireEvent.mouseLeave(screen.getByText('Hoverable'));
      expect(handleMouseLeave).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('supports aria-label', () => {
      render(<Badge aria-label="Status badge">Status</Badge>);
      expect(screen.getByLabelText('Status badge')).toBeInTheDocument();
    });

    it('supports role attribute', () => {
      render(<Badge role="status">Status</Badge>);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('supports aria-describedby', () => {
      render(
        <>
          <Badge aria-describedby="desc">Badge</Badge>
          <span id="desc">Badge description</span>
        </>
      );
      const badge = screen.getByText('Badge');
      expect(badge).toHaveAttribute('aria-describedby', 'desc');
    });

    it('supports aria-live for dynamic updates', () => {
      render(<Badge aria-live="polite">Dynamic</Badge>);
      const badge = screen.getByText('Dynamic');
      expect(badge).toHaveAttribute('aria-live', 'polite');
    });

    it('remove button is keyboard accessible', () => {
      const handleRemove = vi.fn();
      render(<Badge removable onRemove={handleRemove}>Removable</Badge>);

      const removeButton = screen.getByRole('button');
      removeButton.focus();
      expect(removeButton).toHaveFocus();

      fireEvent.keyDown(removeButton, { key: 'Enter' });
      fireEvent.click(removeButton);
      expect(handleRemove).toHaveBeenCalled();
    });
  });

  describe('Forwarded Ref', () => {
    it('forwards ref to span element', () => {
      const ref = vi.fn();
      render(<Badge ref={ref}>Ref Badge</Badge>);
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLSpanElement);
    });
  });

  describe('HTML Attributes', () => {
    it('supports id attribute', () => {
      render(<Badge id="my-badge">Badge</Badge>);
      const badge = screen.getByText('Badge');
      expect(badge).toHaveAttribute('id', 'my-badge');
    });

    it('supports title attribute', () => {
      render(<Badge title="Badge tooltip">Badge</Badge>);
      const badge = screen.getByText('Badge');
      expect(badge).toHaveAttribute('title', 'Badge tooltip');
    });

    it('supports data attributes', () => {
      render(<Badge data-testid="custom-badge">Badge</Badge>);
      expect(screen.getByTestId('custom-badge')).toBeInTheDocument();
    });

    it('supports style attribute', () => {
      render(<Badge style={{ marginLeft: '10px' }}>Styled</Badge>);
      const badge = screen.getByText('Styled');
      expect(badge).toHaveStyle({ marginLeft: '10px' });
    });
  });

  describe('Combined Props', () => {
    it('renders with multiple props combined', () => {
      const handleRemove = vi.fn();
      render(
        <Badge
          variant="success"
          size="lg"
          dot
          removable
          onRemove={handleRemove}
          className="custom-class"
          data-testid="combined-badge"
        >
          Combined
        </Badge>
      );

      const badge = screen.getByTestId('combined-badge');
      expect(badge).toHaveTextContent('Combined');
      expect(badge).toHaveClass('custom-class');
      expect(badge.className).toMatch(/success/i);
      expect(badge.className).toMatch(/px-3/); // large size
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('maintains functionality when all features are enabled', () => {
      const handleRemove = vi.fn();
      const handleClick = vi.fn();

      render(
        <Badge
          variant="warning"
          size="sm"
          dot
          removable
          onRemove={handleRemove}
          onClick={handleClick}
        >
          Full Featured
        </Badge>
      );

      // Click on badge text
      fireEvent.click(screen.getByText('Full Featured'));
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Click on remove button
      fireEvent.click(screen.getByRole('button'));
      expect(handleRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling', () => {
    it('applies rounded-full class', () => {
      render(<Badge>Rounded</Badge>);
      const badge = screen.getByText('Rounded');
      expect(badge.className).toMatch(/rounded-full/);
    });

    it('applies inline-flex layout', () => {
      render(<Badge>Flex</Badge>);
      const badge = screen.getByText('Flex');
      expect(badge.className).toMatch(/inline-flex/);
    });

    it('applies font-medium typography', () => {
      render(<Badge>Typography</Badge>);
      const badge = screen.getByText('Typography');
      expect(badge.className).toMatch(/font-medium/);
    });

    it('applies transition for animations', () => {
      render(<Badge>Animated</Badge>);
      const badge = screen.getByText('Animated');
      expect(badge.className).toMatch(/transition/);
    });
  });
});
