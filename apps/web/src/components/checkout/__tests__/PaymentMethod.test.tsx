/**
 * Tests for PaymentMethod component
 *
 * Tests the payment method selection component used during checkout.
 * Verifies rendering, user interactions, and accessibility.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PaymentMethod, PaymentType } from '../PaymentMethod';

describe('PaymentMethod', () => {
  const defaultProps = {
    selectedMethod: 'card' as PaymentType,
    onMethodChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component with title', () => {
      render(<PaymentMethod {...defaultProps} />);

      expect(screen.getByText('Payment Method')).toBeInTheDocument();
    });

    it('renders the description', () => {
      render(<PaymentMethod {...defaultProps} />);

      expect(screen.getByText('Choose how you would like to pay')).toBeInTheDocument();
    });

    it('renders default payment methods', () => {
      render(<PaymentMethod {...defaultProps} />);

      expect(screen.getByText('Credit/Debit Card')).toBeInTheDocument();
      expect(screen.getByText('PayPal')).toBeInTheDocument();
      expect(screen.getByText('Apple Pay')).toBeInTheDocument();
      expect(screen.getByText('Google Pay')).toBeInTheDocument();
    });

    it('renders only specified available methods', () => {
      render(
        <PaymentMethod
          {...defaultProps}
          availableMethods={['card', 'paypal']}
        />
      );

      expect(screen.getByText('Credit/Debit Card')).toBeInTheDocument();
      expect(screen.getByText('PayPal')).toBeInTheDocument();
      expect(screen.queryByText('Apple Pay')).not.toBeInTheDocument();
      expect(screen.queryByText('Google Pay')).not.toBeInTheDocument();
    });

    it('shows descriptions when showDescriptions is true', () => {
      render(
        <PaymentMethod
          {...defaultProps}
          showDescriptions={true}
        />
      );

      expect(screen.getByText('Pay with Visa, Mastercard, or American Express')).toBeInTheDocument();
      expect(screen.getByText('Fast and secure payment with PayPal')).toBeInTheDocument();
    });

    it('hides descriptions when showDescriptions is false', () => {
      render(
        <PaymentMethod
          {...defaultProps}
          showDescriptions={false}
        />
      );

      expect(screen.queryByText('Pay with Visa, Mastercard, or American Express')).not.toBeInTheDocument();
    });

    it('shows empty state when no methods are available', () => {
      render(
        <PaymentMethod
          {...defaultProps}
          availableMethods={[]}
        />
      );

      expect(screen.getByText('No payment methods available')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <PaymentMethod
          {...defaultProps}
          className="custom-class"
        />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Selection State', () => {
    it('shows the selected method with check icon', () => {
      render(
        <PaymentMethod
          {...defaultProps}
          selectedMethod="card"
        />
      );

      // The card option should have visual indication of being selected
      const cardOption = screen.getByRole('radio', { name: /credit\/debit card/i });
      expect(cardOption).toHaveAttribute('aria-checked', 'true');
    });

    it('shows unselected methods without check icon', () => {
      render(
        <PaymentMethod
          {...defaultProps}
          selectedMethod="card"
        />
      );

      const paypalOption = screen.getByRole('radio', { name: /paypal/i });
      expect(paypalOption).toHaveAttribute('aria-checked', 'false');
    });

    it('highlights the selected method with proper styling', () => {
      render(
        <PaymentMethod
          {...defaultProps}
          selectedMethod="paypal"
        />
      );

      const paypalOption = screen.getByRole('radio', { name: /paypal/i });
      expect(paypalOption).toHaveClass('border-primary');
    });
  });

  describe('User Interactions', () => {
    it('calls onMethodChange when a method is clicked', () => {
      const handleMethodChange = jest.fn();
      render(
        <PaymentMethod
          {...defaultProps}
          onMethodChange={handleMethodChange}
        />
      );

      fireEvent.click(screen.getByText('PayPal'));

      expect(handleMethodChange).toHaveBeenCalledWith('paypal');
    });

    it('calls onMethodChange with correct method type', () => {
      const handleMethodChange = jest.fn();
      render(
        <PaymentMethod
          {...defaultProps}
          onMethodChange={handleMethodChange}
          availableMethods={['card', 'paypal', 'klarna']}
        />
      );

      fireEvent.click(screen.getByText('Klarna'));
      expect(handleMethodChange).toHaveBeenCalledWith('klarna');

      fireEvent.click(screen.getByText('Credit/Debit Card'));
      expect(handleMethodChange).toHaveBeenCalledWith('card');
    });

    it('does not call onMethodChange when disabled', () => {
      const handleMethodChange = jest.fn();
      render(
        <PaymentMethod
          {...defaultProps}
          onMethodChange={handleMethodChange}
          disabled={true}
        />
      );

      fireEvent.click(screen.getByText('PayPal'));

      expect(handleMethodChange).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('disables all buttons when disabled prop is true', () => {
      render(
        <PaymentMethod
          {...defaultProps}
          disabled={true}
        />
      );

      const cardOption = screen.getByRole('radio', { name: /credit\/debit card/i });
      const paypalOption = screen.getByRole('radio', { name: /paypal/i });

      expect(cardOption).toBeDisabled();
      expect(paypalOption).toBeDisabled();
    });

    it('applies opacity styling when disabled', () => {
      render(
        <PaymentMethod
          {...defaultProps}
          disabled={true}
        />
      );

      const cardOption = screen.getByRole('radio', { name: /credit\/debit card/i });
      expect(cardOption).toHaveClass('opacity-50');
    });
  });

  describe('Accessibility', () => {
    it('has proper radiogroup role', () => {
      render(<PaymentMethod {...defaultProps} />);

      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });

    it('has aria-label for radiogroup', () => {
      render(<PaymentMethod {...defaultProps} />);

      expect(screen.getByRole('radiogroup')).toHaveAttribute(
        'aria-label',
        'Payment method selection'
      );
    });

    it('each option has radio role', () => {
      render(<PaymentMethod {...defaultProps} />);

      const radios = screen.getAllByRole('radio');
      expect(radios.length).toBeGreaterThan(0);
    });

    it('selected option has aria-checked true', () => {
      render(
        <PaymentMethod
          {...defaultProps}
          selectedMethod="paypal"
        />
      );

      const paypalOption = screen.getByRole('radio', { name: /paypal/i });
      expect(paypalOption).toHaveAttribute('aria-checked', 'true');
    });

    it('unselected options have aria-checked false', () => {
      render(
        <PaymentMethod
          {...defaultProps}
          selectedMethod="card"
        />
      );

      const paypalOption = screen.getByRole('radio', { name: /paypal/i });
      expect(paypalOption).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('Payment Method Options', () => {
    it('renders card payment option', () => {
      render(
        <PaymentMethod
          {...defaultProps}
          availableMethods={['card']}
        />
      );

      expect(screen.getByText('Credit/Debit Card')).toBeInTheDocument();
    });

    it('renders PayPal option', () => {
      render(
        <PaymentMethod
          {...defaultProps}
          availableMethods={['paypal']}
        />
      );

      expect(screen.getByText('PayPal')).toBeInTheDocument();
    });

    it('renders Apple Pay option', () => {
      render(
        <PaymentMethod
          {...defaultProps}
          availableMethods={['applepay']}
        />
      );

      expect(screen.getByText('Apple Pay')).toBeInTheDocument();
    });

    it('renders Google Pay option', () => {
      render(
        <PaymentMethod
          {...defaultProps}
          availableMethods={['googlepay']}
        />
      );

      expect(screen.getByText('Google Pay')).toBeInTheDocument();
    });

    it('renders Klarna option', () => {
      render(
        <PaymentMethod
          {...defaultProps}
          availableMethods={['klarna']}
        />
      );

      expect(screen.getByText('Klarna')).toBeInTheDocument();
    });

    it('renders Bank Transfer option', () => {
      render(
        <PaymentMethod
          {...defaultProps}
          availableMethods={['bank']}
        />
      );

      expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
    });

    it('renders all payment methods when all are specified', () => {
      render(
        <PaymentMethod
          {...defaultProps}
          availableMethods={['card', 'paypal', 'applepay', 'googlepay', 'klarna', 'bank']}
        />
      );

      expect(screen.getByText('Credit/Debit Card')).toBeInTheDocument();
      expect(screen.getByText('PayPal')).toBeInTheDocument();
      expect(screen.getByText('Apple Pay')).toBeInTheDocument();
      expect(screen.getByText('Google Pay')).toBeInTheDocument();
      expect(screen.getByText('Klarna')).toBeInTheDocument();
      expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
    });
  });
});
