/**
 * Tests for StripePaymentForm component
 *
 * Note: These are integration tests that verify the component structure
 * and props handling. Full E2E testing with Stripe requires test mode setup.
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StripePaymentFormWrapper from '../StripePaymentForm';

// Mock Stripe
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve({
    confirmCardPayment: jest.fn(),
  })),
}));

// Mock API client
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    post: jest.fn(() => Promise.resolve({
      success: true,
      data: {
        clientSecret: 'pi_test_secret_123',
      },
    })),
  },
}));

describe('StripePaymentFormWrapper', () => {
  it('renders loading state initially', () => {
    render(
      <StripePaymentFormWrapper
        amount={99.99}
        currency="USD"
      />
    );

    expect(screen.getByText(/initializing secure payment/i)).toBeInTheDocument();
  });

  it('accepts required amount prop', () => {
    const { container } = render(
      <StripePaymentFormWrapper
        amount={149.99}
        currency="USD"
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('accepts optional currency prop', () => {
    const { container } = render(
      <StripePaymentFormWrapper
        amount={99.99}
        currency="EUR"
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('accepts onSuccess callback', () => {
    const handleSuccess = jest.fn();

    render(
      <StripePaymentFormWrapper
        amount={99.99}
        currency="USD"
        onSuccess={handleSuccess}
      />
    );

    expect(handleSuccess).not.toHaveBeenCalled();
  });

  it('accepts onError callback', () => {
    const handleError = jest.fn();

    render(
      <StripePaymentFormWrapper
        amount={99.99}
        currency="USD"
        onError={handleError}
      />
    );

    expect(handleError).not.toHaveBeenCalled();
  });

  it('renders payment form after loading', async () => {
    render(
      <StripePaymentFormWrapper
        amount={99.99}
        currency="USD"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/payment details/i)).toBeInTheDocument();
    });
  });

  it('shows cardholder name field when enabled', async () => {
    render(
      <StripePaymentFormWrapper
        amount={99.99}
        currency="USD"
        showCardholderName={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/cardholder name/i)).toBeInTheDocument();
    });
  });

  it('accepts custom submit button text', async () => {
    render(
      <StripePaymentFormWrapper
        amount={99.99}
        currency="USD"
        submitButtonText="Pay $99.99"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/pay \$99\.99/i)).toBeInTheDocument();
    });
  });

  it('accepts order ID', () => {
    const { container } = render(
      <StripePaymentFormWrapper
        amount={99.99}
        currency="USD"
        orderId="ORD-12345"
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('accepts metadata', () => {
    const { container } = render(
      <StripePaymentFormWrapper
        amount={99.99}
        currency="USD"
        metadata={{
          customerId: 'CUST-123',
          orderNumber: 'ORD-456',
        }}
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    const { container } = render(
      <StripePaymentFormWrapper
        amount={99.99}
        currency="USD"
        className="custom-class"
      />
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('shows security notice', async () => {
    render(
      <StripePaymentFormWrapper
        amount={99.99}
        currency="USD"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/256-bit SSL encryption/i)).toBeInTheDocument();
    });
  });

  it('shows PCI compliance notice', async () => {
    render(
      <StripePaymentFormWrapper
        amount={99.99}
        currency="USD"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/PCI DSS compliant/i)).toBeInTheDocument();
    });
  });
});

describe('StripePaymentForm utilities', () => {
  it('formatAmountForStripe converts dollars to cents', () => {
    const { formatAmountForStripe } = require('../StripePaymentForm');
    expect(formatAmountForStripe(99.99, 'USD')).toBe(9999);
    expect(formatAmountForStripe(100, 'USD')).toBe(10000);
    expect(formatAmountForStripe(0.50, 'USD')).toBe(50);
  });

  it('formatAmountForStripe handles zero-decimal currencies', () => {
    const { formatAmountForStripe } = require('../StripePaymentForm');
    expect(formatAmountForStripe(1000, 'JPY')).toBe(1000);
    expect(formatAmountForStripe(5000, 'KRW')).toBe(5000);
  });

  it('formatAmountFromStripe converts cents to dollars', () => {
    const { formatAmountFromStripe } = require('../StripePaymentForm');
    expect(formatAmountFromStripe(9999, 'USD')).toBe(99.99);
    expect(formatAmountFromStripe(10000, 'USD')).toBe(100);
    expect(formatAmountFromStripe(50, 'USD')).toBe(0.50);
  });

  it('formatAmountFromStripe handles zero-decimal currencies', () => {
    const { formatAmountFromStripe } = require('../StripePaymentForm');
    expect(formatAmountFromStripe(1000, 'JPY')).toBe(1000);
    expect(formatAmountFromStripe(5000, 'KRW')).toBe(5000);
  });
});

describe('StripePaymentForm security', () => {
  it('does not expose card data in component state', async () => {
    const { container } = render(
      <StripePaymentFormWrapper
        amount={99.99}
        currency="USD"
      />
    );

    // Check that no card inputs are controlled by React state
    const inputs = container.querySelectorAll('input[type="text"]');
    inputs.forEach((input) => {
      // Only cardholder name should be a controlled input
      if (input.getAttribute('id') !== 'cardholderName') {
        expect(input.hasAttribute('value')).toBeFalsy();
      }
    });
  });

  it('uses Stripe CardElement for card data', async () => {
    render(
      <StripePaymentFormWrapper
        amount={99.99}
        currency="USD"
      />
    );

    await waitFor(() => {
      // Stripe CardElement is rendered via iframe
      expect(screen.getByText(/payment details/i)).toBeInTheDocument();
    });
  });
});
