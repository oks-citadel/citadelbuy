/**
 * Tests for ShippingForm component
 *
 * Tests the shipping address form used during checkout.
 * Verifies rendering, validation, user interactions, and accessibility.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ShippingForm, ShippingAddress } from '../ShippingForm';

describe('ShippingForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  const validAddress: ShippingAddress = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    address1: '123 Main Street',
    address2: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'US',
  };

  const defaultProps = {
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component with title', () => {
      render(<ShippingForm {...defaultProps} />);

      expect(screen.getByText('Shipping Address')).toBeInTheDocument();
    });

    it('renders the description', () => {
      render(<ShippingForm {...defaultProps} />);

      expect(screen.getByText('Enter your shipping details')).toBeInTheDocument();
    });

    it('renders all required form fields', () => {
      render(<ShippingForm {...defaultProps} />);

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/apartment/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
    });

    it('renders country field by default', () => {
      render(<ShippingForm {...defaultProps} />);

      expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
    });

    it('hides country field when showCountryField is false', () => {
      render(<ShippingForm {...defaultProps} showCountryField={false} />);

      expect(screen.queryByLabelText(/country/i)).not.toBeInTheDocument();
    });

    it('renders submit button with default text', () => {
      render(<ShippingForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: /continue to payment/i })).toBeInTheDocument();
    });

    it('renders submit button with custom text', () => {
      render(<ShippingForm {...defaultProps} submitButtonText="Save Address" />);

      expect(screen.getByRole('button', { name: /save address/i })).toBeInTheDocument();
    });

    it('renders cancel button when onCancel is provided', () => {
      render(<ShippingForm {...defaultProps} onCancel={mockOnCancel} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('does not render cancel button when onCancel is not provided', () => {
      render(<ShippingForm {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <ShippingForm {...defaultProps} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Initial Values', () => {
    it('populates fields with initial values', () => {
      render(<ShippingForm {...defaultProps} initialValues={validAddress} />);

      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+1 (555) 123-4567')).toBeInTheDocument();
      expect(screen.getByDisplayValue('123 Main Street')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Apt 4B')).toBeInTheDocument();
      expect(screen.getByDisplayValue('New York')).toBeInTheDocument();
      expect(screen.getByDisplayValue('NY')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10001')).toBeInTheDocument();
    });

    it('handles partial initial values', () => {
      render(
        <ShippingForm
          {...defaultProps}
          initialValues={{ firstName: 'Jane', city: 'Boston' }}
        />
      );

      expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Boston')).toBeInTheDocument();
      // Other fields should be empty
      expect(screen.getByLabelText(/last name/i)).toHaveValue('');
    });
  });

  describe('User Input', () => {
    it('updates field values on input', async () => {
      const user = userEvent.setup();
      render(<ShippingForm {...defaultProps} />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'Jane');

      expect(firstNameInput).toHaveValue('Jane');
    });

    it('handles all field inputs', async () => {
      const user = userEvent.setup();
      render(<ShippingForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/first name/i), 'Jane');
      await user.type(screen.getByLabelText(/last name/i), 'Smith');
      await user.type(screen.getByLabelText(/email/i), 'jane@test.com');
      await user.type(screen.getByLabelText(/phone/i), '1234567890');
      await user.type(screen.getByLabelText(/street address/i), '456 Oak Ave');
      await user.type(screen.getByLabelText(/city/i), 'Chicago');
      await user.type(screen.getByLabelText(/state/i), 'IL');
      await user.type(screen.getByLabelText(/zip code/i), '60601');

      expect(screen.getByLabelText(/first name/i)).toHaveValue('Jane');
      expect(screen.getByLabelText(/last name/i)).toHaveValue('Smith');
      expect(screen.getByLabelText(/email/i)).toHaveValue('jane@test.com');
    });

    it('allows selecting country from dropdown', async () => {
      const user = userEvent.setup();
      render(<ShippingForm {...defaultProps} />);

      const countrySelect = screen.getByLabelText(/country/i);
      await user.selectOptions(countrySelect, 'CA');

      expect(countrySelect).toHaveValue('CA');
    });
  });

  describe('Validation', () => {
    it('shows error for empty required fields on submit', async () => {
      const user = userEvent.setup();
      render(<ShippingForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /continue to payment/i });
      await user.click(submitButton);

      expect(screen.getByText('First name is required')).toBeInTheDocument();
      expect(screen.getByText('Last name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Phone number is required')).toBeInTheDocument();
      expect(screen.getByText('Street address is required')).toBeInTheDocument();
      expect(screen.getByText('City is required')).toBeInTheDocument();
      expect(screen.getByText('State/Province is required')).toBeInTheDocument();
      expect(screen.getByText('ZIP/Postal code is required')).toBeInTheDocument();
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      render(<ShippingForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /continue to payment/i });

      // Clear any existing value and type invalid email
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');

      // Click submit to trigger validation
      fireEvent.submit(submitButton.closest('form')!);

      // Wait for validation errors to appear
      expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
    });

    it('accepts valid email format', async () => {
      const user = userEvent.setup();
      render(<ShippingForm {...defaultProps} initialValues={validAddress} />);

      await user.click(screen.getByRole('button', { name: /continue to payment/i }));

      expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
    });

    it('validates phone format', async () => {
      const user = userEvent.setup();
      render(<ShippingForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/phone/i), '123');
      await user.click(screen.getByRole('button', { name: /continue to payment/i }));

      expect(screen.getByText('Please enter a valid phone number')).toBeInTheDocument();
    });

    it('validates US ZIP code format', async () => {
      const user = userEvent.setup();
      render(<ShippingForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/zip code/i), 'ABC123');
      await user.click(screen.getByRole('button', { name: /continue to payment/i }));

      expect(screen.getByText('Please enter a valid ZIP/Postal code')).toBeInTheDocument();
    });

    it('accepts valid US ZIP code format', async () => {
      const user = userEvent.setup();
      render(<ShippingForm {...defaultProps} initialValues={validAddress} />);

      await user.click(screen.getByRole('button', { name: /continue to payment/i }));

      expect(screen.queryByText('Please enter a valid ZIP/Postal code')).not.toBeInTheDocument();
    });

    it('accepts US ZIP+4 format', async () => {
      const user = userEvent.setup();
      render(
        <ShippingForm
          {...defaultProps}
          initialValues={{ ...validAddress, zipCode: '10001-1234' }}
        />
      );

      await user.click(screen.getByRole('button', { name: /continue to payment/i }));

      expect(screen.queryByText('Please enter a valid ZIP/Postal code')).not.toBeInTheDocument();
    });

    it('clears error when user starts typing', async () => {
      const user = userEvent.setup();
      render(<ShippingForm {...defaultProps} />);

      // Submit to trigger validation
      await user.click(screen.getByRole('button', { name: /continue to payment/i }));
      expect(screen.getByText('First name is required')).toBeInTheDocument();

      // Start typing
      await user.type(screen.getByLabelText(/first name/i), 'J');

      expect(screen.queryByText('First name is required')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with valid form data', async () => {
      const user = userEvent.setup();
      render(<ShippingForm {...defaultProps} initialValues={validAddress} />);

      await user.click(screen.getByRole('button', { name: /continue to payment/i }));

      expect(mockOnSubmit).toHaveBeenCalledWith(validAddress);
    });

    it('does not call onSubmit with invalid form data', async () => {
      const user = userEvent.setup();
      render(<ShippingForm {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /continue to payment/i }));

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<ShippingForm {...defaultProps} onCancel={mockOnCancel} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('disables all inputs when isSubmitting is true', () => {
      render(<ShippingForm {...defaultProps} isSubmitting={true} />);

      expect(screen.getByLabelText(/first name/i)).toBeDisabled();
      expect(screen.getByLabelText(/last name/i)).toBeDisabled();
      expect(screen.getByLabelText(/email/i)).toBeDisabled();
      expect(screen.getByLabelText(/phone/i)).toBeDisabled();
      expect(screen.getByLabelText(/street address/i)).toBeDisabled();
      expect(screen.getByLabelText(/city/i)).toBeDisabled();
      expect(screen.getByLabelText(/state/i)).toBeDisabled();
      expect(screen.getByLabelText(/zip code/i)).toBeDisabled();
      expect(screen.getByLabelText(/country/i)).toBeDisabled();
    });

    it('disables submit button when isSubmitting is true', () => {
      render(<ShippingForm {...defaultProps} isSubmitting={true} />);

      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    });

    it('shows loading text when isSubmitting is true', () => {
      render(<ShippingForm {...defaultProps} isSubmitting={true} />);

      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
    });

    it('disables cancel button when isSubmitting is true', () => {
      render(
        <ShippingForm
          {...defaultProps}
          onCancel={mockOnCancel}
          isSubmitting={true}
        />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });
  });

  describe('Country Selection', () => {
    it('renders default countries', () => {
      render(<ShippingForm {...defaultProps} />);

      const countrySelect = screen.getByLabelText(/country/i);

      expect(countrySelect).toContainHTML('United States');
      expect(countrySelect).toContainHTML('Canada');
      expect(countrySelect).toContainHTML('United Kingdom');
    });

    it('renders custom countries', () => {
      const customCountries = [
        { code: 'JP', name: 'Japan' },
        { code: 'BR', name: 'Brazil' },
      ];

      render(<ShippingForm {...defaultProps} countries={customCountries} />);

      const countrySelect = screen.getByLabelText(/country/i);

      expect(countrySelect).toContainHTML('Japan');
      expect(countrySelect).toContainHTML('Brazil');
      expect(countrySelect).not.toContainHTML('United States');
    });

    it('validates Canadian postal code format', async () => {
      const user = userEvent.setup();
      render(<ShippingForm {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/country/i), 'CA');
      await user.type(screen.getByLabelText(/zip code/i), '12345');

      // Fill other required fields
      await user.type(screen.getByLabelText(/first name/i), 'Test');
      await user.type(screen.getByLabelText(/last name/i), 'User');
      await user.type(screen.getByLabelText(/email/i), 'test@test.com');
      await user.type(screen.getByLabelText(/phone/i), '1234567890');
      await user.type(screen.getByLabelText(/street address/i), '123 Street');
      await user.type(screen.getByLabelText(/city/i), 'Toronto');
      await user.type(screen.getByLabelText(/state/i), 'ON');

      await user.click(screen.getByRole('button', { name: /continue to payment/i }));

      expect(screen.getByText('Please enter a valid ZIP/Postal code')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has form element with proper role', () => {
      render(<ShippingForm {...defaultProps} />);

      expect(screen.getByTestId('shipping-form')).toBeInTheDocument();
    });

    it('associates labels with inputs', () => {
      render(<ShippingForm {...defaultProps} />);

      expect(screen.getByLabelText(/first name/i)).toHaveAttribute('id', 'firstName');
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('id', 'email');
    });

    it('sets aria-invalid on invalid fields', async () => {
      const user = userEvent.setup();
      render(<ShippingForm {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /continue to payment/i }));

      expect(screen.getByLabelText(/first name/i)).toHaveAttribute('aria-invalid', 'true');
    });

    it('associates error messages with inputs via aria-describedby', async () => {
      const user = userEvent.setup();
      render(<ShippingForm {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /continue to payment/i }));

      const firstNameInput = screen.getByLabelText(/first name/i);
      expect(firstNameInput).toHaveAttribute('aria-describedby', 'firstName-error');
    });
  });

  describe('Edge Cases', () => {
    it('handles special characters in name fields', async () => {
      const user = userEvent.setup();
      render(<ShippingForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/first name/i), "O'Brien");
      await user.type(screen.getByLabelText(/last name/i), 'Muller-Schmidt');

      expect(screen.getByLabelText(/first name/i)).toHaveValue("O'Brien");
      expect(screen.getByLabelText(/last name/i)).toHaveValue('Muller-Schmidt');
    });

    it('handles international phone formats', async () => {
      const user = userEvent.setup();
      const internationalAddress = {
        ...validAddress,
        phone: '+44 20 7946 0958',
      };

      render(<ShippingForm {...defaultProps} initialValues={internationalAddress} />);

      await user.click(screen.getByRole('button', { name: /continue to payment/i }));

      expect(mockOnSubmit).toHaveBeenCalledWith(internationalAddress);
    });

    it('handles long address values', async () => {
      const user = userEvent.setup();
      const longAddress = '123 Very Long Street Name That Goes On And On Avenue Boulevard';

      render(<ShippingForm {...defaultProps} />);
      await user.type(screen.getByLabelText(/street address/i), longAddress);

      expect(screen.getByLabelText(/street address/i)).toHaveValue(longAddress);
    });
  });
});
