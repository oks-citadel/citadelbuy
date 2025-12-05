#!/usr/bin/env python3
"""
Script to analyze Prisma schema and identify missing indexes.
"""

import re
from collections import defaultdict

def parse_schema(schema_path):
    with open(schema_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all models
    model_pattern = r'model\s+(\w+)\s*\{([^}]+)\}'
    models = {}

    for match in re.finditer(model_pattern, content, re.DOTALL):
        model_name = match.group(1)
        model_body = match.group(2)

        # Parse fields
        fields = []
        foreign_keys = []
        existing_indexes = []

        # Find all fields
        field_pattern = r'^\s+(\w+)\s+(\w+[?\[\]]*)'
        for field_match in re.finditer(field_pattern, model_body, re.MULTILINE):
            field_name = field_match.group(1)
            field_type = field_match.group(2)

            # Check if it's a foreign key (ends with Id or has @relation)
            if field_name.endswith('Id'):
                # Check if there's a corresponding relation field
                relation_name = field_name[:-2]  # Remove 'Id'
                relation_pattern = rf'\s+{relation_name}\s+\w+.*@relation'
                if re.search(relation_pattern, model_body):
                    foreign_keys.append(field_name)

            fields.append((field_name, field_type))

        # Find existing indexes
        index_pattern = r'@@index\(\[([^\]]+)\]\)'
        for idx_match in re.finditer(index_pattern, model_body):
            index_fields = [f.strip() for f in idx_match.group(1).split(',')]
            existing_indexes.append(index_fields)

        models[model_name] = {
            'fields': fields,
            'foreign_keys': foreign_keys,
            'existing_indexes': existing_indexes,
            'body': model_body
        }

    return models

def analyze_missing_indexes(models):
    """Identify missing indexes for foreign keys and common query patterns."""
    missing_indexes = defaultdict(list)

    for model_name, model_info in models.items():
        # Check foreign keys
        for fk in model_info['foreign_keys']:
            # Check if this FK has an index (single or composite)
            has_index = any(
                fk in idx_fields
                for idx_fields in model_info['existing_indexes']
            )

            if not has_index:
                missing_indexes[model_name].append({
                    'type': 'foreign_key',
                    'fields': [fk],
                    'reason': f'Foreign key {fk} needs index for efficient lookups'
                })

        # Check for common query pattern indexes
        field_dict = dict(model_info['fields'])

        # Orders: userId + status, userId + createdAt
        if model_name == 'Order':
            if 'userId' in field_dict and 'status' in field_dict:
                has_composite = ['userId', 'status'] in model_info['existing_indexes']
                if not has_composite:
                    missing_indexes[model_name].append({
                        'type': 'composite',
                        'fields': ['userId', 'status'],
                        'reason': 'Common query: filter orders by user and status'
                    })

            if 'userId' in field_dict and 'createdAt' in field_dict:
                has_composite = ['userId', 'createdAt'] in model_info['existing_indexes']
                if not has_composite:
                    missing_indexes[model_name].append({
                        'type': 'composite',
                        'fields': ['userId', 'createdAt'],
                        'reason': 'Common query: get user orders sorted by date'
                    })

            if 'createdAt' in field_dict:
                has_index = any('createdAt' in idx for idx in model_info['existing_indexes'])
                if not has_index:
                    missing_indexes[model_name].append({
                        'type': 'single',
                        'fields': ['createdAt'],
                        'reason': 'Date range queries and sorting'
                    })

        # Products: vendorId + status, categoryId + status
        if model_name == 'Product':
            if 'status' in field_dict:
                if 'vendorId' in field_dict:
                    has_composite = ['vendorId', 'status'] in model_info['existing_indexes']
                    if not has_composite:
                        missing_indexes[model_name].append({
                            'type': 'composite',
                            'fields': ['vendorId', 'status'],
                            'reason': 'Common query: filter vendor products by status'
                        })

                if 'categoryId' in field_dict:
                    has_composite = ['categoryId', 'status'] in model_info['existing_indexes']
                    if not has_composite:
                        missing_indexes[model_name].append({
                            'type': 'composite',
                            'fields': ['categoryId', 'status'],
                            'reason': 'Common query: filter category products by status'
                        })

        # OrderItems: orderId + productId
        if model_name == 'OrderItem':
            if 'orderId' in field_dict and 'productId' in field_dict:
                has_composite = ['orderId', 'productId'] in model_info['existing_indexes']
                if not has_composite:
                    missing_indexes[model_name].append({
                        'type': 'composite',
                        'fields': ['orderId', 'productId'],
                        'reason': 'Common query: check if product in order'
                    })

        # CartItems: cartId + productId
        if model_name == 'CartItem':
            if 'cartId' in field_dict and 'productId' in field_dict:
                has_composite = ['cartId', 'productId'] in model_info['existing_indexes']
                if not has_composite:
                    missing_indexes[model_name].append({
                        'type': 'composite',
                        'fields': ['cartId', 'productId'],
                        'reason': 'Common query: check if product in cart'
                    })

        # Reviews: productId + status, userId + createdAt
        if model_name == 'Review':
            if 'productId' in field_dict and 'status' in field_dict:
                has_composite = ['productId', 'status'] in model_info['existing_indexes']
                if not has_composite:
                    missing_indexes[model_name].append({
                        'type': 'composite',
                        'fields': ['productId', 'status'],
                        'reason': 'Common query: get approved reviews for product'
                    })

            if 'userId' in field_dict and 'createdAt' in field_dict:
                has_composite = ['userId', 'createdAt'] in model_info['existing_indexes']
                if not has_composite:
                    missing_indexes[model_name].append({
                        'type': 'composite',
                        'fields': ['userId', 'createdAt'],
                        'reason': 'Common query: get user reviews sorted by date'
                    })

        # Organizations: ownerId
        if model_name == 'Organization':
            if 'ownerId' in field_dict:
                has_index = any('ownerId' in idx for idx in model_info['existing_indexes'])
                if not has_index:
                    missing_indexes[model_name].append({
                        'type': 'single',
                        'fields': ['ownerId'],
                        'reason': 'Foreign key and common query: get organizations by owner'
                    })

        # AuditLog: organizationId + createdAt, userId + action
        if model_name == 'AuditLog':
            if 'organizationId' in field_dict and 'createdAt' in field_dict:
                has_composite = ['organizationId', 'createdAt'] in model_info['existing_indexes']
                if not has_composite:
                    missing_indexes[model_name].append({
                        'type': 'composite',
                        'fields': ['organizationId', 'createdAt'],
                        'reason': 'Common query: get org audit logs by date range'
                    })

            if 'userId' in field_dict and 'action' in field_dict:
                has_composite = ['userId', 'action'] in model_info['existing_indexes']
                if not has_composite:
                    missing_indexes[model_name].append({
                        'type': 'composite',
                        'fields': ['userId', 'action'],
                        'reason': 'Common query: filter audit logs by user and action'
                    })

    return missing_indexes

def main():
    schema_path = r'C:\Users\citad\OneDrive\Documents\citadelbuy-master\organization\apps\api\prisma\schema.prisma'

    print("Analyzing Prisma schema for missing indexes...")
    print("=" * 80)

    models = parse_schema(schema_path)
    print(f"Found {len(models)} models")

    missing = analyze_missing_indexes(models)

    total_missing = sum(len(indexes) for indexes in missing.values())
    print(f"Found {total_missing} missing indexes across {len(missing)} models")
    print("=" * 80)
    print()

    # Report by model
    for model_name in sorted(missing.keys()):
        indexes = missing[model_name]
        print(f"\n{model_name} ({len(indexes)} missing indexes):")
        print("-" * 80)

        for idx in indexes:
            index_str = ', '.join(idx['fields'])
            print(f"  [{idx['type'].upper()}] {index_str}")
            print(f"    Reason: {idx['reason']}")
            print(f"    Add: @@index([{index_str}])")
            print()

if __name__ == '__main__':
    main()
