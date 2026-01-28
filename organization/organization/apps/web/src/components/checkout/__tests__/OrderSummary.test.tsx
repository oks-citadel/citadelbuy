/**
 * Tests for OrderSummary component
 *
 * Tests the order summary component used during checkout.
 * Verifies rendering of items, pricing breakdown, and various states.
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrderSummary, OrderItem } from '../OrderSummary';

describe('OrderSummary', () => {
  const mockItems: OrderItem[] = [
    {
      id: '1',
      name: 'Product One',
      quantity: 2,
      price: 29.99,
      variant: 'Size: Large',
    },
    {
      id: '2',
      name: 'Product Two',
      quantity: 1,
      price: 49.99,
    },
  ];

  const defaultProps = {
    items: mockItems,
    subtotal: 109.97,
    total: 119.96,
  };

  describe('Rendering', () => {
    it('renders the component with title', () => {
      render(<OrderSummary {...defaultProps} />);

      expect(screen.getByText('Order Summary')).toBeInTheDocument();
    });

    it('renders order items when showItems is true', () => {
      render(<OrderSummary {...defaultProps} showItems={true} />);

      expect(screen.getByText('Product One')).toBeInTheDocument();
      expect(screen.getByText('Product Two')).toBeInTheDocument();
    });

    it('does not render items when showItems is false', () => {
      render(<OrderSummary {...defaultProps} showItems={false} />);

      expect(screen.queryByTestId('order-items')).not.toBeInTheDocument();
    });

    it('shows empty cart message when no items', () => {
      render(<OrderSummary {...defaultProps} items={[]} />);

      expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <OrderSummary {...defaultProps} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Item Display', () => {
    it('displays item names', () => {
      render(<OrderSummary {...defaultProps} />);

      expect(screen.getByText('Product One')).toBeInTheDocument();
      expect(screen.getByText('Product Two')).toBeInTheDocument();
    });

    it('displays item quantities', () => {
      render(<OrderSummary {...defaultProps} />);

      // Quantities are shown in badges
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('displays item variants when provided', () => {
      render(<OrderSummary {...defaultProps} />);

      expect(screen.getByText('Size: Large')).toBeInTheDocument();
    });

    it('calculates and displays item total price', () => {
      render(<OrderSummary {...defaultProps} />);

      // Product One: 2 * 29.99 = 59.98
      expect(screen.getByText('$59.98')).toBeInTheDocument();
      // Product Two: 1 * 49.99 = 49.99
      expect(screen.getByText('$49.99')).toBeInTheDocument();
    });

    it('renders item images when provided', () => {
      const itemsWithImages: OrderItem[] = [
        {
          id: '1',
          name: 'Product With Image',
          quantity: 1,
          price: 29.99,
          image: '/test-image.jpg',
        },
      ];

      render(
        <OrderSummary
          {...defaultProps}
          items={itemsWithImages}
        />
      );

      const image = screen.getByAltText('Product With Image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/test-image.jpg');
    });

    it('renders placeholder for items without images', () => {
      const itemsWithoutImages: OrderItem[] = [
        {
          id: '1',
          name: 'Product Without Image',
          quantity: 1,
          price: 29.99,
        },
      ];

      render(
        <OrderSummary
          {...defaultProps}
          items={itemsWithoutImages}
        />
      );

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  describe('Price Breakdown', () => {
    it('displays subtotal', () => {
      render(<OrderSummary {...defaultProps} />);

      expect(screen.getByTestId('subtotal')).toHaveTextContent('$109.97');
    });

    it('displays shipping cost when provided', () => {
      render(<OrderSummary {...defaultProps} shipping={9.99} />);

      expect(screen.getByTestId('shipping')).toHaveTextContent('$9.99');
    });

    it('shows free shipping when shipping is 0', () => {
      render(<OrderSummary {...defaultProps} shipping={0} />);

      expect(screen.getByTestId('shipping')).toHaveTextContent('Free');
    });

    it('displays tax when provided', () => {
      render(<OrderSummary {...defaultProps} tax={8.80} />);

      expect(screen.getByTestId('tax')).toHaveTextContent('$8.80');
    });

    it('does not show tax row when tax is 0', () => {
      render(<OrderSummary {...defaultProps} tax={0} />);

      expect(screen.queryByTestId('tax')).not.toBeInTheDocument();
    });

    it('displays discount when provided', () => {
      render(<OrderSummary {...defaultProps} discount={10.00} />);

      expect(screen.getByTestId('discount')).toHaveTextContent('-$10.00');
    });

    it('does not show discount row when discount is 0', () => {
      render(<OrderSummary {...defaultProps} discount={0} />);

      expect(screen.queryByTestId('discount')).not.toBeInTheDocument();
    });

    it('displays gift wrap cost when provided', () => {
      render(<OrderSummary {...defaultProps} giftWrap={4.99} />);

      expect(screen.getByTestId('gift-wrap')).toHaveTextContent('$4.99');
    });

    it('does not show gift wrap row when giftWrap is 0', () => {
      render(<OrderSummary {...defaultProps} giftWrap={0} />);

      expect(screen.queryByTestId('gift-wrap')).not.toBeInTheDocument();
    });

    it('displays total amount', () => {
      render(<OrderSummary {...defaultProps} />);

      expect(screen.getByTestId('total')).toHaveTextContent('$119.96');
    });

    it('displays currency code', () => {
      render(<OrderSummary {...defaultProps} currency="EUR" />);

      expect(screen.getByText('EUR')).toBeInTheDocument();
    });
  });

  describe('Shipping Information', () => {
    it('displays shipping method when provided', () => {
      render(
        <OrderSummary
          {...defaultProps}
          shipping={9.99}
          shippingMethod="Express"
        />
      );

      expect(screen.getByText('(Express)')).toBeInTheDocument();
    });

    it('displays estimated delivery when provided', () => {
      render(
        <OrderSummary
          {...defaultProps}
          shipping={9.99}
          estimatedDelivery="2-3 business days"
        />
      );

      expect(screen.getByTestId('estimated-delivery')).toHaveTextContent(
        'Estimated: 2-3 business days'
      );
    });
  });

  describe('Promo Code', () => {
    it('displays promo code badge when provided', () => {
      render(<OrderSummary {...defaultProps} promoCode="SAVE10" />);

      expect(screen.getByTestId('promo-badge')).toBeInTheDocument();
      expect(screen.getByText(/SAVE10/)).toBeInTheDocument();
    });

    it('does not show promo badge when no code provided', () => {
      render(<OrderSummary {...defaultProps} />);

      expect(screen.queryByTestId('promo-badge')).not.toBeInTheDocument();
    });
  });

  describe('Trust Badges', () => {
    it('shows trust badges by default', () => {
      render(<OrderSummary {...defaultProps} />);

      expect(screen.getByTestId('trust-badges')).toBeInTheDocument();
      expect(screen.getByText('Secure')).toBeInTheDocument();
      expect(screen.getByText('Encrypted')).toBeInTheDocument();
    });

    it('hides trust badges when showTrustBadges is false', () => {
      render(<OrderSummary {...defaultProps} showTrustBadges={false} />);

      expect(screen.queryByTestId('trust-badges')).not.toBeInTheDocument();
    });
  });

  describe('Currency Formatting', () => {
    it('uses default $ symbol', () => {
      render(<OrderSummary {...defaultProps} />);

      expect(screen.getByTestId('total')).toHaveTextContent('$');
    });

    it('uses custom currency symbol', () => {
      render(
        <OrderSummary
          {...defaultProps}
          currencySymbol="EUR "
          total={119.96}
        />
      );

      expect(screen.getByTestId('total')).toHaveTextContent('EUR 119.96');
    });

    it('formats prices to 2 decimal places', () => {
      render(<OrderSummary {...defaultProps} total={100} />);

      expect(screen.getByTestId('total')).toHaveTextContent('$100.00');
    });
  });

  describe('Complete Order Summary', () => {
    it('renders complete order with all pricing details', () => {
      render(
        <OrderSummary
          items={mockItems}
          subtotal={109.97}
          shipping={9.99}
          tax={8.80}
          discount={15.00}
          giftWrap={4.99}
          total={118.75}
          currency="USD"
          shippingMethod="Express"
          estimatedDelivery="2-3 business days"
          promoCode="HOLIDAY15"
        />
      );

      // Check all elements are present
      expect(screen.getByText('Product One')).toBeInTheDocument();
      expect(screen.getByText('Product Two')).toBeInTheDocument();
      expect(screen.getByTestId('subtotal')).toHaveTextContent('$109.97');
      expect(screen.getByTestId('shipping')).toHaveTextContent('$9.99');
      expect(screen.getByTestId('tax')).toHaveTextContent('$8.80');
      expect(screen.getByTestId('discount')).toHaveTextContent('-$15.00');
      expect(screen.getByTestId('gift-wrap')).toHaveTextContent('$4.99');
      expect(screen.getByTestId('total')).toHaveTextContent('$118.75');
      expect(screen.getByText('(Express)')).toBeInTheDocument();
      expect(screen.getByText(/HOLIDAY15/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles items with very long names', () => {
      const longNameItem: OrderItem[] = [
        {
          id: '1',
          name: 'This is a very long product name that should be truncated or handled gracefully',
          quantity: 1,
          price: 29.99,
        },
      ];

      render(<OrderSummary {...defaultProps} items={longNameItem} />);

      expect(screen.getByText(/This is a very long product name/)).toBeInTheDocument();
    });

    it('handles large quantities', () => {
      const largeQuantityItem: OrderItem[] = [
        {
          id: '1',
          name: 'Bulk Item',
          quantity: 999,
          price: 1.00,
        },
      ];

      render(<OrderSummary {...defaultProps} items={largeQuantityItem} />);

      expect(screen.getByText('999')).toBeInTheDocument();
      expect(screen.getByText('$999.00')).toBeInTheDocument();
    });

    it('handles zero price items', () => {
      const freeItem: OrderItem[] = [
        {
          id: '1',
          name: 'Free Item',
          quantity: 1,
          price: 0,
        },
      ];

      render(
        <OrderSummary
          {...defaultProps}
          items={freeItem}
          subtotal={0}
          total={0}
        />
      );

      expect(screen.getByTestId('total')).toHaveTextContent('$0.00');
    });

    it('handles high precision prices', () => {
      const precisionItem: OrderItem[] = [
        {
          id: '1',
          name: 'Precision Item',
          quantity: 1,
          price: 29.999,
        },
      ];

      render(
        <OrderSummary
          {...defaultProps}
          items={precisionItem}
          subtotal={30.00}
          total={30.00}
        />
      );

      // Should round to 2 decimal places
      expect(screen.getByTestId('total')).toHaveTextContent('$30.00');
    });
  });
});
