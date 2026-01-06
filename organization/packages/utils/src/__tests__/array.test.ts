/**
 * Tests for array utility functions
 * @module @broxiva/utils
 */

import { groupBy, uniqueBy } from '../index';

describe('Array Utilities', () => {
  describe('groupBy', () => {
    it('should group objects by a string key', () => {
      const items = [
        { name: 'Alice', category: 'A' },
        { name: 'Bob', category: 'B' },
        { name: 'Charlie', category: 'A' },
      ];

      const result = groupBy(items, 'category');

      expect(result).toEqual({
        A: [
          { name: 'Alice', category: 'A' },
          { name: 'Charlie', category: 'A' },
        ],
        B: [{ name: 'Bob', category: 'B' }],
      });
    });

    it('should group objects by a numeric key', () => {
      const items = [
        { name: 'Item 1', price: 100 },
        { name: 'Item 2', price: 200 },
        { name: 'Item 3', price: 100 },
      ];

      const result = groupBy(items, 'price');

      expect(result).toEqual({
        '100': [
          { name: 'Item 1', price: 100 },
          { name: 'Item 3', price: 100 },
        ],
        '200': [{ name: 'Item 2', price: 200 }],
      });
    });

    it('should return empty object for empty array', () => {
      const result = groupBy([], 'key' as never);
      expect(result).toEqual({});
    });

    it('should handle single item array', () => {
      const items = [{ name: 'Single', group: 'only' }];
      const result = groupBy(items, 'group');

      expect(result).toEqual({
        only: [{ name: 'Single', group: 'only' }],
      });
    });

    it('should handle all items in same group', () => {
      const items = [
        { name: 'A', type: 'same' },
        { name: 'B', type: 'same' },
        { name: 'C', type: 'same' },
      ];

      const result = groupBy(items, 'type');

      expect(result).toEqual({
        same: [
          { name: 'A', type: 'same' },
          { name: 'B', type: 'same' },
          { name: 'C', type: 'same' },
        ],
      });
    });

    it('should handle all items in different groups', () => {
      const items = [
        { id: 1, status: 'pending' },
        { id: 2, status: 'active' },
        { id: 3, status: 'completed' },
      ];

      const result = groupBy(items, 'status');

      expect(result).toEqual({
        pending: [{ id: 1, status: 'pending' }],
        active: [{ id: 2, status: 'active' }],
        completed: [{ id: 3, status: 'completed' }],
      });
    });

    it('should preserve object properties', () => {
      const items = [
        { id: 1, name: 'Test', data: { nested: true }, category: 'A' },
      ];

      const result = groupBy(items, 'category');

      expect(result['A'][0]).toEqual({
        id: 1,
        name: 'Test',
        data: { nested: true },
        category: 'A',
      });
    });

    it('should maintain order within groups', () => {
      const items = [
        { name: 'First', group: 'A' },
        { name: 'Second', group: 'A' },
        { name: 'Third', group: 'A' },
      ];

      const result = groupBy(items, 'group');

      expect(result['A'][0].name).toBe('First');
      expect(result['A'][1].name).toBe('Second');
      expect(result['A'][2].name).toBe('Third');
    });

    it('should handle boolean values as group keys', () => {
      const items = [
        { name: 'Active 1', isActive: true },
        { name: 'Inactive 1', isActive: false },
        { name: 'Active 2', isActive: true },
      ];

      const result = groupBy(items, 'isActive');

      expect(result['true']).toHaveLength(2);
      expect(result['false']).toHaveLength(1);
    });

    it('should handle undefined values in group key', () => {
      const items = [
        { name: 'With category', category: 'A' },
        { name: 'Without category', category: undefined },
      ] as Array<{ name: string; category: string | undefined }>;

      const result = groupBy(items, 'category');

      expect(result['A']).toHaveLength(1);
      expect(result['undefined']).toHaveLength(1);
    });

    it('should handle null values in group key', () => {
      const items = [
        { name: 'With value', value: 'test' },
        { name: 'Null value', value: null },
      ] as Array<{ name: string; value: string | null }>;

      const result = groupBy(items, 'value');

      expect(result['test']).toHaveLength(1);
      expect(result['null']).toHaveLength(1);
    });

    it('should handle large arrays efficiently', () => {
      const items = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        group: `group-${i % 10}`,
      }));

      const result = groupBy(items, 'group');

      expect(Object.keys(result)).toHaveLength(10);
      expect(result['group-0']).toHaveLength(1000);
    });

    it('should work with product-like objects', () => {
      const products = [
        { id: 1, name: 'Shirt', category: 'Clothing', price: 29.99 },
        { id: 2, name: 'Pants', category: 'Clothing', price: 49.99 },
        { id: 3, name: 'Phone', category: 'Electronics', price: 699.99 },
        { id: 4, name: 'Laptop', category: 'Electronics', price: 999.99 },
        { id: 5, name: 'Hat', category: 'Clothing', price: 19.99 },
      ];

      const result = groupBy(products, 'category');

      expect(result['Clothing']).toHaveLength(3);
      expect(result['Electronics']).toHaveLength(2);
    });
  });

  describe('uniqueBy', () => {
    it('should remove duplicates by a string key', () => {
      const items = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Alice' },
      ];

      const result = uniqueBy(items, 'name');

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });

    it('should remove duplicates by a numeric key', () => {
      const items = [
        { name: 'A', score: 100 },
        { name: 'B', score: 200 },
        { name: 'C', score: 100 },
      ];

      const result = uniqueBy(items, 'score');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'A', score: 100 });
      expect(result[1]).toEqual({ name: 'B', score: 200 });
    });

    it('should return empty array for empty input', () => {
      const result = uniqueBy([], 'key' as never);
      expect(result).toEqual([]);
    });

    it('should return single item for single item array', () => {
      const items = [{ id: 1, name: 'Single' }];
      const result = uniqueBy(items, 'id');

      expect(result).toEqual([{ id: 1, name: 'Single' }]);
    });

    it('should keep first occurrence when duplicates exist', () => {
      const items = [
        { id: 1, name: 'Alice', email: 'alice@first.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
        { id: 3, name: 'Alice', email: 'alice@second.com' },
      ];

      const result = uniqueBy(items, 'name');

      expect(result).toHaveLength(2);
      expect(result.find((item) => item.name === 'Alice')?.id).toBe(1);
    });

    it('should handle all unique items', () => {
      const items = [
        { id: 1, code: 'A' },
        { id: 2, code: 'B' },
        { id: 3, code: 'C' },
      ];

      const result = uniqueBy(items, 'code');

      expect(result).toHaveLength(3);
      expect(result).toEqual(items);
    });

    it('should handle all duplicate items', () => {
      const items = [
        { id: 1, type: 'same' },
        { id: 2, type: 'same' },
        { id: 3, type: 'same' },
      ];

      const result = uniqueBy(items, 'type');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: 1, type: 'same' });
    });

    it('should preserve object properties', () => {
      const items = [
        { id: 1, name: 'Test', nested: { value: 123 }, tags: ['a', 'b'] },
        { id: 2, name: 'Test', nested: { value: 456 }, tags: ['c'] },
      ];

      const result = uniqueBy(items, 'name');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        name: 'Test',
        nested: { value: 123 },
        tags: ['a', 'b'],
      });
    });

    it('should maintain order of first occurrences', () => {
      const items = [
        { order: 1, group: 'A' },
        { order: 2, group: 'B' },
        { order: 3, group: 'A' },
        { order: 4, group: 'C' },
        { order: 5, group: 'B' },
      ];

      const result = uniqueBy(items, 'group');

      expect(result).toHaveLength(3);
      expect(result[0].order).toBe(1);
      expect(result[1].order).toBe(2);
      expect(result[2].order).toBe(4);
    });

    it('should handle undefined values', () => {
      const items = [
        { name: 'A', value: undefined },
        { name: 'B', value: 'test' },
        { name: 'C', value: undefined },
      ] as Array<{ name: string; value: string | undefined }>;

      const result = uniqueBy(items, 'value');

      expect(result).toHaveLength(2);
    });

    it('should handle null values', () => {
      const items = [
        { name: 'A', value: null },
        { name: 'B', value: 'test' },
        { name: 'C', value: null },
      ] as Array<{ name: string; value: string | null }>;

      const result = uniqueBy(items, 'value');

      expect(result).toHaveLength(2);
    });

    it('should handle boolean keys', () => {
      const items = [
        { name: 'Active 1', isActive: true },
        { name: 'Inactive 1', isActive: false },
        { name: 'Active 2', isActive: true },
      ];

      const result = uniqueBy(items, 'isActive');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Active 1');
      expect(result[1].name).toBe('Inactive 1');
    });

    it('should handle large arrays efficiently', () => {
      const items = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        duplicate: i % 100,
      }));

      const result = uniqueBy(items, 'duplicate');

      expect(result).toHaveLength(100);
    });

    it('should work with user-like objects', () => {
      const users = [
        { id: 1, email: 'alice@example.com', name: 'Alice' },
        { id: 2, email: 'bob@example.com', name: 'Bob' },
        { id: 3, email: 'alice@example.com', name: 'Alice Duplicate' },
        { id: 4, email: 'charlie@example.com', name: 'Charlie' },
      ];

      const result = uniqueBy(users, 'email');

      expect(result).toHaveLength(3);
      expect(result.map((u) => u.email)).toEqual([
        'alice@example.com',
        'bob@example.com',
        'charlie@example.com',
      ]);
    });

    it('should work with product SKUs', () => {
      const products = [
        { sku: 'SKU001', name: 'Product A', quantity: 10 },
        { sku: 'SKU002', name: 'Product B', quantity: 5 },
        { sku: 'SKU001', name: 'Product A (duplicate)', quantity: 3 },
      ];

      const result = uniqueBy(products, 'sku');

      expect(result).toHaveLength(2);
      expect(result.find((p) => p.sku === 'SKU001')?.quantity).toBe(10);
    });
  });

  describe('Edge Cases for Both Functions', () => {
    it('groupBy and uniqueBy should handle same data consistently', () => {
      const items = [
        { id: 1, category: 'A' },
        { id: 2, category: 'B' },
        { id: 3, category: 'A' },
      ];

      const grouped = groupBy(items, 'category');
      const unique = uniqueBy(items, 'category');

      // Number of unique categories should match
      expect(Object.keys(grouped).length).toBe(unique.length);
    });

    it('should handle objects with many properties', () => {
      const items = [
        {
          id: 1,
          name: 'Test',
          description: 'Long description here',
          price: 99.99,
          category: 'Electronics',
          subcategory: 'Phones',
          brand: 'Brand A',
          stock: 100,
          rating: 4.5,
          reviews: 250,
        },
        {
          id: 2,
          name: 'Test 2',
          description: 'Another description',
          price: 149.99,
          category: 'Electronics',
          subcategory: 'Tablets',
          brand: 'Brand B',
          stock: 50,
          rating: 4.2,
          reviews: 180,
        },
      ];

      const grouped = groupBy(items, 'category');
      const unique = uniqueBy(items, 'category');

      expect(grouped['Electronics']).toHaveLength(2);
      expect(unique).toHaveLength(1);
    });

    it('should handle arrays with mixed types of values for key', () => {
      const items = [
        { id: 1, value: '100' },
        { id: 2, value: 100 },
        { id: 3, value: '100' },
      ] as Array<{ id: number; value: string | number }>;

      // Both string '100' and number 100 become '100' when stringified
      const grouped = groupBy(items, 'value');
      const unique = uniqueBy(items, 'value');

      // Grouped: '100' key has all 3 items (String(100) === String('100'))
      expect(grouped['100']).toHaveLength(3);

      // Unique by Set: '100' !== 100, so we get 2 unique values
      expect(unique).toHaveLength(2);
    });
  });
});
