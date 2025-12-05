#!/usr/bin/env python3
"""
Final validation script to count indexes by model.
"""

import re

def count_indexes_by_model(schema_path):
    """Count all indexes in each model."""
    with open(schema_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all models
    model_pattern = r'model\s+(\w+)\s*\{([^}]+)\}'
    models_with_indexes = []

    for match in re.finditer(model_pattern, content, re.DOTALL):
        model_name = match.group(1)
        model_body = match.group(2)

        # Count indexes
        index_pattern = r'@@index\(\[([^\]]+)\]\)'
        indexes = re.findall(index_pattern, model_body)

        if indexes:
            models_with_indexes.append({
                'model': model_name,
                'count': len(indexes),
                'indexes': indexes
            })

    return models_with_indexes

def main():
    schema_path = r'C:\Users\citad\OneDrive\Documents\citadelbuy-master\organization\apps\api\prisma\schema.prisma'

    print("Validating all indexes in schema...")
    print("=" * 80)

    models_with_indexes = count_indexes_by_model(schema_path)

    total_indexes = sum(m['count'] for m in models_with_indexes)
    print(f"\nTotal Models with Indexes: {len(models_with_indexes)}")
    print(f"Total Indexes: {total_indexes}")
    print("\n" + "=" * 80)

    # Show models with their index counts
    print("\nModels with Indexes:\n")
    for model_info in sorted(models_with_indexes, key=lambda x: x['model']):
        print(f"{model_info['model']}: {model_info['count']} index(es)")
        for idx in model_info['indexes']:
            print(f"  - [{idx}]")
        print()

    # Show specific models we added indexes to
    print("\n" + "=" * 80)
    print("Key Models Updated in Phase 67:\n")

    key_models = [
        'Order', 'OrderItem', 'Review', 'Product', 'CartItem',
        'AuditLog', 'OrganizationAuditLog', 'Shipment', 'ReturnRequest'
    ]

    for model_name in key_models:
        for model_info in models_with_indexes:
            if model_info['model'] == model_name:
                print(f"✅ {model_name}: {model_info['count']} indexes")
                break
        else:
            print(f"⚠️  {model_name}: Not found or no indexes")

if __name__ == '__main__':
    main()
