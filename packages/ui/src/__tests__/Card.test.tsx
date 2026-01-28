import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/Card';

describe('Card', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Card data-testid="card">Card content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent('Card content');
    });

    it('renders children correctly', () => {
      render(
        <Card>
          <span data-testid="child">Child content</span>
        </Card>
      );
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(<Card className="custom-class" data-testid="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    it('renders default variant', () => {
      render(<Card data-testid="card">Default</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toMatch(/bg-white/);
      expect(card.className).toMatch(/border/);
    });

    it('renders elevated variant', () => {
      render(<Card variant="elevated" data-testid="card">Elevated</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toMatch(/shadow-md/);
    });

    it('renders outline variant', () => {
      render(<Card variant="outline" data-testid="card">Outline</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toMatch(/border-2/);
    });

    it('renders ghost variant', () => {
      render(<Card variant="ghost" data-testid="card">Ghost</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toMatch(/bg-neutral-50/);
    });
  });

  describe('Padding', () => {
    it('renders with no padding', () => {
      render(<Card padding="none" data-testid="card">No padding</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).not.toMatch(/p-4|p-6|p-8|p-10/);
    });

    it('renders with small padding', () => {
      render(<Card padding="sm" data-testid="card">Small padding</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toMatch(/p-4/);
    });

    it('renders with medium padding (default)', () => {
      render(<Card data-testid="card">Medium padding</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toMatch(/p-6/);
    });

    it('renders with large padding', () => {
      render(<Card padding="lg" data-testid="card">Large padding</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toMatch(/p-8/);
    });

    it('renders with extra large padding', () => {
      render(<Card padding="xl" data-testid="card">XL padding</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toMatch(/p-10/);
    });
  });

  describe('Interactive State', () => {
    it('renders as non-interactive by default', () => {
      render(<Card data-testid="card">Non-interactive</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).not.toMatch(/cursor-pointer/);
    });

    it('renders as interactive when interactive prop is true', () => {
      render(<Card interactive data-testid="card">Interactive</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toMatch(/cursor-pointer/);
    });

    it('applies hover styles when interactive', () => {
      render(<Card interactive data-testid="card">Interactive</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toMatch(/hover:shadow-lg/);
      expect(card.className).toMatch(/hover:-translate-y-1/);
    });
  });

  describe('Event Handlers', () => {
    it('calls onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<Card onClick={handleClick} data-testid="card">Clickable</Card>);

      fireEvent.click(screen.getByTestId('card'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('calls onMouseEnter on hover', () => {
      const handleMouseEnter = vi.fn();
      render(
        <Card onMouseEnter={handleMouseEnter} data-testid="card">
          Hoverable
        </Card>
      );

      fireEvent.mouseEnter(screen.getByTestId('card'));
      expect(handleMouseEnter).toHaveBeenCalledTimes(1);
    });

    it('calls onMouseLeave on mouse leave', () => {
      const handleMouseLeave = vi.fn();
      render(
        <Card onMouseLeave={handleMouseLeave} data-testid="card">
          Hoverable
        </Card>
      );

      fireEvent.mouseLeave(screen.getByTestId('card'));
      expect(handleMouseLeave).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('supports role attribute', () => {
      render(<Card role="article" data-testid="card">Article</Card>);
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('supports aria-label', () => {
      render(<Card aria-label="Product card" data-testid="card">Content</Card>);
      expect(screen.getByLabelText('Product card')).toBeInTheDocument();
    });

    it('supports aria-describedby', () => {
      render(
        <>
          <Card aria-describedby="desc" data-testid="card">Content</Card>
          <span id="desc">Description</span>
        </>
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('aria-describedby', 'desc');
    });

    it('can be used with tabIndex for keyboard navigation', () => {
      render(<Card tabIndex={0} data-testid="card">Focusable</Card>);
      const card = screen.getByTestId('card');
      card.focus();
      expect(card).toHaveFocus();
    });
  });

  describe('Forwarded Ref', () => {
    it('forwards ref to div element', () => {
      const ref = vi.fn();
      render(<Card ref={ref} data-testid="card">Ref Card</Card>);
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
    });
  });
});

describe('CardHeader', () => {
  it('renders with default props', () => {
    render(<CardHeader data-testid="header">Header content</CardHeader>);
    const header = screen.getByTestId('header');
    expect(header).toBeInTheDocument();
    expect(header).toHaveTextContent('Header content');
  });

  it('renders with custom className', () => {
    render(<CardHeader className="custom-header" data-testid="header">Header</CardHeader>);
    const header = screen.getByTestId('header');
    expect(header).toHaveClass('custom-header');
  });

  it('applies flex column layout', () => {
    render(<CardHeader data-testid="header">Header</CardHeader>);
    const header = screen.getByTestId('header');
    expect(header.className).toMatch(/flex/);
    expect(header.className).toMatch(/flex-col/);
  });

  it('forwards ref to div element', () => {
    const ref = vi.fn();
    render(<CardHeader ref={ref}>Header</CardHeader>);
    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
  });
});

describe('CardTitle', () => {
  it('renders as h3 by default', () => {
    render(<CardTitle>Title</CardTitle>);
    const title = screen.getByRole('heading', { level: 3 });
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('Title');
  });

  it('renders as different heading levels', () => {
    const { rerender } = render(<CardTitle as="h1">H1 Title</CardTitle>);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

    rerender(<CardTitle as="h2">H2 Title</CardTitle>);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();

    rerender(<CardTitle as="h4">H4 Title</CardTitle>);
    expect(screen.getByRole('heading', { level: 4 })).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    render(<CardTitle className="custom-title">Title</CardTitle>);
    const title = screen.getByRole('heading');
    expect(title).toHaveClass('custom-title');
  });

  it('applies typography styles', () => {
    render(<CardTitle>Title</CardTitle>);
    const title = screen.getByRole('heading');
    expect(title.className).toMatch(/text-2xl/);
    expect(title.className).toMatch(/font-semibold/);
  });

  it('forwards ref to heading element', () => {
    const ref = vi.fn();
    render(<CardTitle ref={ref}>Title</CardTitle>);
    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLHeadingElement);
  });
});

describe('CardDescription', () => {
  it('renders with default props', () => {
    render(<CardDescription>Description text</CardDescription>);
    const description = screen.getByText('Description text');
    expect(description).toBeInTheDocument();
    expect(description.tagName).toBe('P');
  });

  it('renders with custom className', () => {
    render(
      <CardDescription className="custom-description" data-testid="desc">
        Description
      </CardDescription>
    );
    const description = screen.getByTestId('desc');
    expect(description).toHaveClass('custom-description');
  });

  it('applies muted text styles', () => {
    render(<CardDescription data-testid="desc">Description</CardDescription>);
    const description = screen.getByTestId('desc');
    expect(description.className).toMatch(/text-sm/);
    expect(description.className).toMatch(/text-neutral-600/);
  });

  it('forwards ref to paragraph element', () => {
    const ref = vi.fn();
    render(<CardDescription ref={ref}>Description</CardDescription>);
    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLParagraphElement);
  });
});

describe('CardContent', () => {
  it('renders with default props', () => {
    render(<CardContent data-testid="content">Content</CardContent>);
    const content = screen.getByTestId('content');
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent('Content');
  });

  it('renders with custom className', () => {
    render(
      <CardContent className="custom-content" data-testid="content">
        Content
      </CardContent>
    );
    const content = screen.getByTestId('content');
    expect(content).toHaveClass('custom-content');
  });

  it('forwards ref to div element', () => {
    const ref = vi.fn();
    render(<CardContent ref={ref}>Content</CardContent>);
    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
  });
});

describe('CardFooter', () => {
  it('renders with default props', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>);
    const footer = screen.getByTestId('footer');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveTextContent('Footer');
  });

  it('renders with custom className', () => {
    render(
      <CardFooter className="custom-footer" data-testid="footer">
        Footer
      </CardFooter>
    );
    const footer = screen.getByTestId('footer');
    expect(footer).toHaveClass('custom-footer');
  });

  it('applies flex layout', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>);
    const footer = screen.getByTestId('footer');
    expect(footer.className).toMatch(/flex/);
    expect(footer.className).toMatch(/items-center/);
  });

  it('forwards ref to div element', () => {
    const ref = vi.fn();
    render(<CardFooter ref={ref}>Footer</CardFooter>);
    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
  });
});

describe('Card Composition', () => {
  it('renders complete card structure', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Product Name</CardTitle>
          <CardDescription>Product description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Product details</p>
        </CardContent>
        <CardFooter>
          <button>Add to Cart</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Product Name' })).toBeInTheDocument();
    expect(screen.getByText('Product description')).toBeInTheDocument();
    expect(screen.getByText('Product details')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeInTheDocument();
  });

  it('handles interactive card with composed children', () => {
    const handleClick = vi.fn();
    render(
      <Card interactive onClick={handleClick} data-testid="card">
        <CardHeader>
          <CardTitle>Clickable Card</CardTitle>
        </CardHeader>
        <CardContent>Content</CardContent>
      </Card>
    );

    fireEvent.click(screen.getByTestId('card'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
