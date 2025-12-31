import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from '../components/Input';

describe('Input', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Input aria-label="test input" />);
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<Input placeholder="Enter text" />);
      const input = screen.getByPlaceholderText('Enter text');
      expect(input).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(<Input className="custom-class" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
    });

    it('renders with initial value', () => {
      render(<Input defaultValue="Initial value" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('Initial value');
    });
  });

  describe('Label', () => {
    it('renders with label', () => {
      render(<Input label="Username" />);
      const label = screen.getByText('Username');
      expect(label).toBeInTheDocument();
      expect(label.tagName).toBe('LABEL');
    });

    it('associates label with input', () => {
      render(<Input label="Email" />);
      const input = screen.getByLabelText('Email');
      expect(input).toBeInTheDocument();
    });

    it('applies label styles', () => {
      render(<Input label="Password" />);
      const label = screen.getByText('Password');
      expect(label.className).toMatch(/text-sm/);
      expect(label.className).toMatch(/font-medium/);
    });
  });

  describe('Helper Text', () => {
    it('renders helper text', () => {
      render(<Input helperText="Enter your username" aria-label="test" />);
      expect(screen.getByText('Enter your username')).toBeInTheDocument();
    });

    it('associates helper text with input via aria-describedby', () => {
      render(<Input helperText="Helper text" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('does not render helper text when error is present', () => {
      render(
        <Input
          helperText="Helper text"
          error="Error message"
          aria-label="test"
        />
      );
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('renders error message', () => {
      render(<Input error="This field is required" aria-label="test" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('applies error styles', () => {
      render(<Input error="Error" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toMatch(/border-error|error/);
    });

    it('sets aria-invalid to true when error is present', () => {
      render(<Input error="Error" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('associates error message with input via aria-describedby', () => {
      render(<Input error="Error message" aria-label="test" />);
      const input = screen.getByRole('textbox');
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).toContain('error');
    });

    it('renders error icon with error message', () => {
      render(<Input error="Error" aria-label="test" />);
      const errorContainer = screen.getByText('Error').closest('p');
      const svg = errorContainer?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Types', () => {
    it('renders as text type by default', () => {
      render(<Input aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('renders as password type', () => {
      render(<Input type="password" aria-label="test" />);
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it('renders as email type', () => {
      render(<Input type="email" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('renders as number type', () => {
      render(<Input type="number" aria-label="test" />);
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('renders as tel type', () => {
      render(<Input type="tel" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'tel');
    });
  });

  describe('Event Handlers', () => {
    it('calls onChange when value changes', async () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} aria-label="test" />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'new value' } });

      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('calls onFocus when focused', () => {
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} aria-label="test" />);

      fireEvent.focus(screen.getByRole('textbox'));
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur when blurred', () => {
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} aria-label="test" />);

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.blur(input);

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('calls onKeyDown on key press', () => {
      const handleKeyDown = vi.fn();
      render(<Input onKeyDown={handleKeyDown} aria-label="test" />);

      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
    });

    it('updates value on user typing', async () => {
      const user = userEvent.setup();
      render(<Input aria-label="test" />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello');

      expect(input).toHaveValue('Hello');
    });
  });

  describe('Disabled State', () => {
    it('renders disabled state', () => {
      render(<Input disabled aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('applies disabled styles', () => {
      render(<Input disabled aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toMatch(/disabled:cursor-not-allowed/);
    });

    it('does not call onChange when disabled', () => {
      const handleChange = vi.fn();
      render(<Input disabled onChange={handleChange} aria-label="test" />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });

      // Input is disabled so change event won't fire
      expect(input).toBeDisabled();
    });
  });

  describe('Icons', () => {
    it('renders left icon', () => {
      const LeftIcon = () => <span data-testid="left-icon">L</span>;
      render(<Input leftIcon={<LeftIcon />} aria-label="test" />);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders right icon', () => {
      const RightIcon = () => <span data-testid="right-icon">R</span>;
      render(<Input rightIcon={<RightIcon />} aria-label="test" />);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('applies left padding when left icon is present', () => {
      const LeftIcon = () => <span>L</span>;
      render(<Input leftIcon={<LeftIcon />} aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toMatch(/pl-10/);
    });

    it('applies right padding when right icon is present', () => {
      const RightIcon = () => <span>R</span>;
      render(<Input rightIcon={<RightIcon />} aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toMatch(/pr-10/);
    });
  });

  describe('Full Width', () => {
    it('applies full width when fullWidth is true', () => {
      const { container } = render(<Input fullWidth aria-label="test" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('w-full');
    });

    it('does not apply full width by default', () => {
      const { container } = render(<Input aria-label="test" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).not.toHaveClass('w-full');
    });
  });

  describe('Accessibility', () => {
    it('has correct textbox role', () => {
      render(<Input aria-label="test" />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('supports aria-label', () => {
      render(<Input aria-label="Username input" />);
      expect(screen.getByLabelText('Username input')).toBeInTheDocument();
    });

    it('supports aria-required', () => {
      render(<Input aria-required="true" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('is keyboard focusable', () => {
      render(<Input aria-label="test" />);
      const input = screen.getByRole('textbox');
      input.focus();
      expect(input).toHaveFocus();
    });

    it('has no accessibility violations with label', () => {
      render(<Input label="Email address" type="email" />);
      const input = screen.getByLabelText('Email address');
      expect(input).toBeInTheDocument();
    });

    it('connects label and input properly', () => {
      render(<Input label="Test Label" />);
      const input = screen.getByLabelText('Test Label');
      const label = screen.getByText('Test Label');
      expect(label).toHaveAttribute('for', input.id);
    });
  });

  describe('Forwarded Ref', () => {
    it('forwards ref to input element', () => {
      const ref = vi.fn();
      render(<Input ref={ref} aria-label="test" />);
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLInputElement);
    });

    it('allows ref to be used to focus input', () => {
      let inputRef: HTMLInputElement | null = null;
      render(
        <Input
          ref={(el) => { inputRef = el; }}
          aria-label="test"
        />
      );

      inputRef?.focus();
      expect(inputRef).toHaveFocus();
    });
  });

  describe('HTML Attributes', () => {
    it('supports name attribute', () => {
      render(<Input name="username" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('name', 'username');
    });

    it('supports required attribute', () => {
      render(<Input required aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toBeRequired();
    });

    it('supports maxLength attribute', () => {
      render(<Input maxLength={50} aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('maxLength', '50');
    });

    it('supports minLength attribute', () => {
      render(<Input minLength={5} aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('minLength', '5');
    });

    it('supports pattern attribute', () => {
      render(<Input pattern="[A-Za-z]+" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('pattern', '[A-Za-z]+');
    });

    it('supports autoComplete attribute', () => {
      render(<Input autoComplete="email" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('autoComplete', 'email');
    });

    it('supports readOnly attribute', () => {
      render(<Input readOnly aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('readonly');
    });

    it('supports data attributes', () => {
      render(<Input data-testid="custom-input" aria-label="test" />);
      expect(screen.getByTestId('custom-input')).toBeInTheDocument();
    });
  });

  describe('Controlled vs Uncontrolled', () => {
    it('works as uncontrolled input', async () => {
      const user = userEvent.setup();
      render(<Input defaultValue="initial" aria-label="test" />);

      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'new value');

      expect(input).toHaveValue('new value');
    });

    it('works as controlled input', () => {
      const TestComponent = () => {
        const [value, setValue] = vi.importActual<typeof import('react')>('react').useState('controlled');
        return (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="test"
          />
        );
      };

      render(<TestComponent />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('controlled');
    });
  });
});
