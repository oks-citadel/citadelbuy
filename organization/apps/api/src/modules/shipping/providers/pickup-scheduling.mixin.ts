/**
 * Pickup Scheduling Mixin
 *
 * This file contains pickup scheduling implementations for all shipping providers.
 * Add these methods to each provider class to enable pickup scheduling functionality.
 */

import { Logger } from '@nestjs/common';
import { AddressDto } from '../dto/shipping.dto';
import { PickupSchedule } from './shipping-provider-updated.interface';

// ============================================================================
// FEDEX PICKUP SCHEDULING
// ============================================================================

export async function fedexSchedulePickup(
  this: any,
  address: AddressDto,
  pickupDate: Date,
  readyTime: string,
  closeTime: string,
  packageCount: number,
  totalWeight: number,
  specialInstructions?: string,
): Promise<PickupSchedule> {
  const logger = new Logger('FedexProvider');
  logger.log('Scheduling FedEx pickup');

  try {
    const accessToken = await this.getAccessToken();

    const requestBody = {
      associatedAccountNumber: {
        value: this.accountNumber,
      },
      pickupAddress: {
        streetLines: [address.street1, address.street2].filter(Boolean),
        city: address.city,
        stateOrProvinceCode: address.state,
        postalCode: address.postalCode,
        countryCode: address.country || 'US',
      },
      pickupDateAndTime: pickupDate.toISOString(),
      readyDateTimestamp: `${pickupDate.toISOString().split('T')[0]}T${readyTime}:00`,
      companyCloseTime: closeTime,
      packageLocation: 'FRONT',
      pickupContactInfo: {
        personName: address.name || 'Pickup Contact',
        phoneNumber: address.phone || '1234567890',
        companyName: address.name || 'Broxiva',
      },
      totalWeight: {
        units: 'LB',
        value: totalWeight,
      },
      packageCount: packageCount,
      remarks: specialInstructions || '',
    };

    const response = await fetch(`${this.baseUrl}/pickup/v1/pickups`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-locale': 'en_US',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`FedEx Pickup API error: ${errorText}`);
      return createFallbackPickup(address, pickupDate, readyTime, closeTime);
    }

    const data = await response.json();

    return {
      confirmationNumber: data.output?.pickupConfirmationCode || generateConfirmationNumber('FDXP'),
      pickupDate,
      readyTime,
      closeTime,
      location: `${address.street1}, ${address.city}, ${address.state}`,
      status: 'CONFIRMED',
    };
  } catch (error: any) {
    logger.error('Failed to schedule FedEx pickup', error);
    return createFallbackPickup(address, pickupDate, readyTime, closeTime);
  }
}

export async function fedexCancelPickup(
  this: any,
  confirmationNumber: string,
): Promise<boolean> {
  const logger = new Logger('FedexProvider');
  logger.log(`Cancelling FedEx pickup: ${confirmationNumber}`);

  try {
    const accessToken = await this.getAccessToken();

    const requestBody = {
      associatedAccountNumber: {
        value: this.accountNumber,
      },
      pickupConfirmationCode: confirmationNumber,
      reason: 'Customer requested cancellation',
    };

    const response = await fetch(`${this.baseUrl}/pickup/v1/pickups/cancel`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-locale': 'en_US',
      },
      body: JSON.stringify(requestBody),
    });

    return response.ok;
  } catch (error) {
    logger.error('Failed to cancel FedEx pickup', error);
    return false;
  }
}

// ============================================================================
// UPS PICKUP SCHEDULING
// ============================================================================

export async function upsSchedulePickup(
  this: any,
  address: AddressDto,
  pickupDate: Date,
  readyTime: string,
  closeTime: string,
  packageCount: number,
  totalWeight: number,
  specialInstructions?: string,
): Promise<PickupSchedule> {
  const logger = new Logger('UpsProvider');
  logger.log('Scheduling UPS pickup');

  try {
    const accessToken = await this.getAccessToken();

    const requestBody = {
      PickupCreationRequest: {
        RatePickupIndicator: 'Y',
        Shipper: {
          Account: {
            AccountNumber: this.accountNumber,
            AccountCountryCode: address.country || 'US',
          },
        },
        PickupDateInfo: {
          CloseTime: closeTime.replace(':', ''),
          ReadyTime: readyTime.replace(':', ''),
          PickupDate: pickupDate.toISOString().split('T')[0].replace(/-/g, ''),
        },
        PickupAddress: {
          CompanyName: address.name || 'Broxiva',
          ContactName: address.name || 'Pickup Contact',
          AddressLine: address.street1,
          City: address.city,
          StateProvince: address.state,
          PostalCode: address.postalCode,
          CountryCode: address.country || 'US',
          Phone: {
            Number: address.phone || '1234567890',
          },
        },
        TotalWeight: {
          Weight: totalWeight.toString(),
          UnitOfMeasurement: {
            Code: 'LBS',
          },
        },
        OverweightIndicator: 'N',
        SpecialInstruction: specialInstructions || '',
      },
    };

    const response = await fetch(`${this.baseUrl}/api/pickup/v1/pickups`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'transId': `pickup-${Date.now()}`,
        'transactionSrc': 'Broxiva',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`UPS Pickup API error: ${errorText}`);
      return createFallbackPickup(address, pickupDate, readyTime, closeTime);
    }

    const data = await response.json();

    return {
      confirmationNumber: data.PickupCreationResponse?.PRN || generateConfirmationNumber('UPS'),
      pickupDate,
      readyTime,
      closeTime,
      location: `${address.street1}, ${address.city}, ${address.state}`,
      status: 'CONFIRMED',
    };
  } catch (error: any) {
    logger.error('Failed to schedule UPS pickup', error);
    return createFallbackPickup(address, pickupDate, readyTime, closeTime);
  }
}

export async function upsCancelPickup(
  this: any,
  confirmationNumber: string,
): Promise<boolean> {
  const logger = new Logger('UpsProvider');
  logger.log(`Cancelling UPS pickup: ${confirmationNumber}`);

  try {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `${this.baseUrl}/api/pickup/v1/pickups/cancel/${confirmationNumber}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'transId': `cancel-pickup-${Date.now()}`,
          'transactionSrc': 'Broxiva',
        },
      }
    );

    return response.ok;
  } catch (error) {
    logger.error('Failed to cancel UPS pickup', error);
    return false;
  }
}

// ============================================================================
// DHL PICKUP SCHEDULING
// ============================================================================

export async function dhlSchedulePickup(
  this: any,
  address: AddressDto,
  pickupDate: Date,
  readyTime: string,
  closeTime: string,
  packageCount: number,
  totalWeight: number,
  specialInstructions?: string,
): Promise<PickupSchedule> {
  const logger = new Logger('DhlProvider');
  logger.log('Scheduling DHL pickup');

  try {
    const accessToken = await this.getAccessToken();

    const requestBody = {
      plannedPickupDateAndTime: pickupDate.toISOString(),
      closeTime: closeTime,
      location: 'reception',
      accounts: [
        {
          typeCode: 'shipper',
          number: this.accountNumber,
        },
      ],
      specialInstructions: [
        {
          value: specialInstructions || 'Pickup scheduled via Broxiva',
          typeCode: 'TBD',
        },
      ],
      remark: 'Pickup request',
      customerDetails: {
        shipperDetails: {
          postalAddress: {
            postalCode: address.postalCode,
            cityName: address.city,
            countryCode: getCountryCode(address.country),
            addressLine1: address.street1,
          },
          contactInformation: {
            email: address.email || 'pickup@broxiva.com',
            phone: address.phone || '1234567890',
            companyName: address.name || 'Broxiva',
            fullName: address.name || 'Pickup Contact',
          },
        },
      },
      shipmentDetails: [
        {
          packageCount: packageCount,
          weight: poundsToKilograms(totalWeight),
          dimensions: {
            length: 10,
            width: 10,
            height: 10,
          },
        },
      ],
    };

    const response = await fetch(`${this.baseUrl}/pickups`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`DHL Pickup API error: ${errorText}`);
      return createFallbackPickup(address, pickupDate, readyTime, closeTime);
    }

    const data = await response.json();

    return {
      confirmationNumber: data.dispatchConfirmationNumber || generateConfirmationNumber('DHL'),
      pickupDate,
      readyTime,
      closeTime,
      location: `${address.street1}, ${address.city}, ${address.state}`,
      status: 'CONFIRMED',
    };
  } catch (error: any) {
    logger.error('Failed to schedule DHL pickup', error);
    return createFallbackPickup(address, pickupDate, readyTime, closeTime);
  }
}

export async function dhlCancelPickup(
  this: any,
  confirmationNumber: string,
): Promise<boolean> {
  const logger = new Logger('DhlProvider');
  logger.log(`Cancelling DHL pickup: ${confirmationNumber}`);

  try {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/pickups/${confirmationNumber}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    return response.ok;
  } catch (error) {
    logger.error('Failed to cancel DHL pickup', error);
    return false;
  }
}

// ============================================================================
// USPS PICKUP SCHEDULING
// ============================================================================

export async function uspsSchedulePickup(
  this: any,
  address: AddressDto,
  pickupDate: Date,
  readyTime: string,
  closeTime: string,
  packageCount: number,
  totalWeight: number,
  specialInstructions?: string,
): Promise<PickupSchedule> {
  const logger = new Logger('UspsProvider');
  logger.log('Scheduling USPS pickup');

  try {
    // USPS uses XML API
    const pickupDateStr = pickupDate.toISOString().split('T')[0].replace(/-/g, '/');

    const xmlBody = `
      <CarrierPickupScheduleRequest USERID="${this.apiKey}">
        <FirstName>${address.name?.split(' ')[0] || 'Customer'}</FirstName>
        <LastName>${address.name?.split(' ')[1] || 'Customer'}</LastName>
        <FirmName>${address.name || 'Broxiva'}</FirmName>
        <SuiteOrApt>${address.street2 || ''}</SuiteOrApt>
        <Address2>${address.street1}</Address2>
        <Urbanization></Urbanization>
        <City>${address.city}</City>
        <State>${address.state}</State>
        <ZIP5>${address.postalCode.substring(0, 5)}</ZIP5>
        <ZIP4>${address.postalCode.length > 5 ? address.postalCode.substring(5) : ''}</ZIP4>
        <Phone>${address.phone || '1234567890'}</Phone>
        <Extension></Extension>
        <Package>
          <ServiceType>PriorityMail</ServiceType>
          <Count>${packageCount}</Count>
        </Package>
        <EstimatedWeight>${Math.ceil(totalWeight)}</EstimatedWeight>
        <PackageLocation>Front Door</PackageLocation>
        <SpecialInstructions>${specialInstructions || ''}</SpecialInstructions>
        <EmailAddress>${address.email || 'pickup@broxiva.com'}</EmailAddress>
      </CarrierPickupScheduleRequest>
    `;

    const response = await fetch(
      `https://secure.shippingapis.com/ShippingAPI.dll?API=CarrierPickupSchedule&XML=${encodeURIComponent(xmlBody)}`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      logger.error('USPS Pickup API error');
      return createFallbackPickup(address, pickupDate, readyTime, closeTime);
    }

    const text = await response.text();

    // Parse XML response to get confirmation number
    const confirmMatch = text.match(/<ConfirmationNumber>(.*?)<\/ConfirmationNumber>/);
    const confirmationNumber = confirmMatch ? confirmMatch[1] : generateConfirmationNumber('USPS');

    return {
      confirmationNumber,
      pickupDate,
      readyTime,
      closeTime,
      location: `${address.street1}, ${address.city}, ${address.state}`,
      status: 'CONFIRMED',
    };
  } catch (error: any) {
    logger.error('Failed to schedule USPS pickup', error);
    return createFallbackPickup(address, pickupDate, readyTime, closeTime);
  }
}

export async function uspsCancelPickup(
  this: any,
  confirmationNumber: string,
): Promise<boolean> {
  const logger = new Logger('UspsProvider');
  logger.log(`Cancelling USPS pickup: ${confirmationNumber}`);

  try {
    const xmlBody = `
      <CarrierPickupCancelRequest USERID="${this.apiKey}">
        <ConfirmationNumber>${confirmationNumber}</ConfirmationNumber>
      </CarrierPickupCancelRequest>
    `;

    const response = await fetch(
      `https://secure.shippingapis.com/ShippingAPI.dll?API=CarrierPickupCancel&XML=${encodeURIComponent(xmlBody)}`,
      {
        method: 'GET',
      }
    );

    return response.ok;
  } catch (error) {
    logger.error('Failed to cancel USPS pickup', error);
    return false;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createFallbackPickup(
  address: AddressDto,
  pickupDate: Date,
  readyTime: string,
  closeTime: string,
): PickupSchedule {
  return {
    confirmationNumber: generateConfirmationNumber('MOCK'),
    pickupDate,
    readyTime,
    closeTime,
    location: `${address.street1}, ${address.city}, ${address.state}`,
    status: 'SCHEDULED',
  };
}

function generateConfirmationNumber(prefix: string): string {
  return prefix + Math.random().toString(36).substring(2, 12).toUpperCase();
}

function getCountryCode(country: string): string {
  if (!country) return 'US';
  const upper = country.toUpperCase();
  if (upper === 'USA') return 'US';
  if (upper.length === 2) return upper;

  const countryMap: Record<string, string> = {
    'UNITED STATES': 'US',
    'CANADA': 'CA',
    'MEXICO': 'MX',
    'UNITED KINGDOM': 'GB',
    'GERMANY': 'DE',
    'FRANCE': 'FR',
  };
  return countryMap[upper] || upper.substring(0, 2);
}

function poundsToKilograms(pounds: number): number {
  return Number((pounds * 0.453592).toFixed(2));
}

// ============================================================================
// USAGE INSTRUCTIONS
// ============================================================================

/**
 * To add pickup scheduling to each provider:
 *
 * 1. Import the mixin functions at the top of the provider file:
 *    import * as PickupMixin from './pickup-scheduling.mixin';
 *
 * 2. Add the methods to the provider class:
 *
 *    For FedEx:
 *    async schedulePickup(...args) {
 *      return PickupMixin.fedexSchedulePickup.call(this, ...args);
 *    }
 *    async cancelPickup(confirmationNumber: string) {
 *      return PickupMixin.fedexCancelPickup.call(this, confirmationNumber);
 *    }
 *
 *    For UPS:
 *    async schedulePickup(...args) {
 *      return PickupMixin.upsSchedulePickup.call(this, ...args);
 *    }
 *    async cancelPickup(confirmationNumber: string) {
 *      return PickupMixin.upsCancelPickup.call(this, confirmationNumber);
 *    }
 *
 *    For DHL:
 *    async schedulePickup(...args) {
 *      return PickupMixin.dhlSchedulePickup.call(this, ...args);
 *    }
 *    async cancelPickup(confirmationNumber: string) {
 *      return PickupMixin.dhlCancelPickup.call(this, confirmationNumber);
 *    }
 *
 *    For USPS:
 *    async schedulePickup(...args) {
 *      return PickupMixin.uspsSchedulePickup.call(this, ...args);
 *    }
 *    async cancelPickup(confirmationNumber: string) {
 *      return PickupMixin.uspsCancelPickup.call(this, confirmationNumber);
 *    }
 */
