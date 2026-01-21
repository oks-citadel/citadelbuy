#!/usr/bin/env python3
"""
Script to add missing indexes to Prisma schema.
"""

import re

# Define all the indexes to add
INDEXES_TO_ADD = {
    'AuditLog': [
        '@@index([userId, action])',
        '@@index([organizationId, createdAt])',
    ],
    'Backorder': [
        '@@index([inventoryItemId])',
    ],
    'CampaignCoupon': [
        '@@index([campaignId])',
    ],
    'CartAbandonment': [
        '@@index([cartId])',
    ],
    'CartAbandonmentEmail': [
        '@@index([emailLogId])',
    ],
    'CartItem': [
        '@@index([cartId, productId])',
    ],
    'CustomerLoyalty': [
        '@@index([userId])',
    ],
    'DeliveryConfirmation': [
        '@@index([shipmentId])',
    ],
    'EmailLog': [
        '@@index([templateId])',
    ],
    'GiftCard': [
        '@@index([orderId])',
    ],
    'Order': [
        '@@index([userId, status])',
        '@@index([userId, createdAt])',
        '@@index([createdAt])',
    ],
    'OrderItem': [
        '@@index([orderId, productId])',
    ],
    'OrganizationApiKey': [
        '@@index([createdById])',
    ],
    'OrganizationBilling': [
        '@@index([organizationId])',
    ],
    'OrganizationMember': [
        '@@index([departmentId])',
        '@@index([teamId])',
    ],
    'PromoReferralUsage': [
        '@@index([promoCodeId])',
    ],
    'Refund': [
        '@@index([returnRequestId])',
    ],
    'ReturnItem': [
        '@@index([warehouseId])',
    ],
    'ReturnLabel': [
        '@@index([shipmentId])',
    ],
    'ReturnRequest': [
        '@@index([returnLabelId])',
    ],
    'Review': [
        '@@index([userId])',
        '@@index([productId, status])',
        '@@index([userId, createdAt])',
    ],
    'Shipment': [
        '@@index([providerId])',
        '@@index([warehouseId])',
    ],
    'StockMovement': [
        '@@index([transferId])',
    ],
    'StockTransfer': [
        '@@index([productId])',
    ],
    'SupportTicket': [
        '@@index([relatedOrderId])',
    ],
    'VendorApplication': [
        '@@index([vendorProfileId])',
    ],
    'Organization': [
        '@@index([ownerId])',
    ],
    'Product': [
        '@@index([vendorId, createdAt])',
        '@@index([categoryId, createdAt])',
    ],
}

def add_indexes_to_schema(schema_path):
    """Add missing indexes to the schema file."""
    with open(schema_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    models_updated = []
    indexes_added = 0

    # Process each model
    for model_name, indexes in INDEXES_TO_ADD.items():
        # Find the model block
        model_pattern = rf'(model\s+{model_name}\s*\{{(?:[^{{}}]|(?:\{{[^{{}}]*\}}))*?\}})'

        match = re.search(model_pattern, content, re.DOTALL)
        if not match:
            print(f"Warning: Model {model_name} not found")
            continue

        model_block = match.group(1)
        original_block = model_block

        # Find the last line before closing brace
        # We'll insert indexes before the closing brace
        lines = model_block.split('\n')

        # Find the line with @@map or the closing brace
        insert_position = -1
        for i in range(len(lines) - 1, -1, -1):
            if '@@map(' in lines[i]:
                insert_position = i
                break
            elif lines[i].strip() == '}':
                insert_position = i
                break

        if insert_position == -1:
            print(f"Warning: Could not find insertion point for {model_name}")
            continue

        # Check which indexes already exist
        indexes_to_insert = []
        for index in indexes:
            if index not in model_block:
                indexes_to_insert.append(index)

        if not indexes_to_insert:
            print(f"Skipping {model_name}: all indexes already exist")
            continue

        # Insert the new indexes
        # Insert before @@map if it exists, otherwise before closing brace
        new_lines = lines[:insert_position]

        # Add blank line if needed
        if new_lines and new_lines[-1].strip() and not new_lines[-1].strip().startswith('@@'):
            new_lines.append('')

        # Add the new indexes with proper indentation
        for index in indexes_to_insert:
            new_lines.append(f'  {index}')

        new_lines.extend(lines[insert_position:])

        new_block = '\n'.join(new_lines)

        # Replace in content
        content = content.replace(original_block, new_block)

        models_updated.append(model_name)
        indexes_added += len(indexes_to_insert)
        print(f"Added {len(indexes_to_insert)} index(es) to {model_name}")

    # Write back to file
    if content != original_content:
        with open(schema_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\nSuccessfully updated schema file!")
        print(f"Total: {indexes_added} indexes added to {len(models_updated)} models")
        return models_updated, indexes_added
    else:
        print("No changes needed - all indexes already exist")
        return [], 0

def main():
    schema_path = r'C:\Users\citad\OneDrive\Documents\broxiva-master\organization\apps\api\prisma\schema.prisma'

    print("Adding missing indexes to Prisma schema...")
    print("=" * 80)

    models_updated, indexes_added = add_indexes_to_schema(schema_path)

    print("\n" + "=" * 80)
    print(f"SUMMARY: Added {indexes_added} indexes to {len(models_updated)} models")
    print("=" * 80)

    if models_updated:
        print("\nModels updated:")
        for model in sorted(models_updated):
            print(f"  - {model}")

if __name__ == '__main__':
    main()
