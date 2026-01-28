'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FolderTree,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ChevronRight,
  ArrowLeft,
  Save,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  productCount: number;
  isActive: boolean;
  parent?: string;
  order: number;
}

const demoCategories: Category[] = [
  {
    id: '1',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices and accessories',
    productCount: 245,
    isActive: true,
    order: 1,
  },
  {
    id: '2',
    name: 'Smartphones',
    slug: 'smartphones',
    description: 'Mobile phones and accessories',
    productCount: 89,
    isActive: true,
    parent: 'Electronics',
    order: 1,
  },
  {
    id: '3',
    name: 'Laptops',
    slug: 'laptops',
    description: 'Portable computers',
    productCount: 67,
    isActive: true,
    parent: 'Electronics',
    order: 2,
  },
  {
    id: '4',
    name: 'Clothing',
    slug: 'clothing',
    description: 'Apparel and fashion items',
    productCount: 512,
    isActive: true,
    order: 2,
  },
  {
    id: '5',
    name: 'Men\'s Clothing',
    slug: 'mens-clothing',
    productCount: 234,
    isActive: true,
    parent: 'Clothing',
    order: 1,
  },
  {
    id: '6',
    name: 'Women\'s Clothing',
    slug: 'womens-clothing',
    productCount: 278,
    isActive: true,
    parent: 'Clothing',
    order: 2,
  },
  {
    id: '7',
    name: 'Food & Beverage',
    slug: 'food-beverage',
    description: 'Food items and beverages',
    productCount: 156,
    isActive: true,
    order: 3,
  },
  {
    id: '8',
    name: 'Accessories',
    slug: 'accessories',
    description: 'Various accessories',
    productCount: 98,
    isActive: false,
    order: 4,
  },
];

export default function ProductCategoriesPage() {
  const [categories] = useState<Category[]>(demoCategories);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');

  const filteredCategories = categories.filter((category) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        category.name.toLowerCase().includes(query) ||
        category.slug.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const topLevelCategories = filteredCategories.filter((c) => !c.parent);
  const totalProducts = categories.reduce((acc, cat) => acc + cat.productCount, 0);
  const activeCategories = categories.filter((c) => c.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Product Categories
            </h1>
            <p className="text-muted-foreground">
              Organize your products into categories
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Categories</p>
                <p className="text-2xl font-bold">{categories.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <FolderTree className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Categories</p>
                <p className="text-2xl font-bold text-green-600">
                  {activeCategories}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <FolderTree className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    Category
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    Slug
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    Products
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="p-4 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topLevelCategories.map((category) => {
                  const subcategories = filteredCategories.filter(
                    (c) => c.parent === category.name
                  );
                  return (
                    <React.Fragment key={category.id}>
                      <tr className="hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <FolderTree className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{category.name}</p>
                              {category.description && (
                                <p className="text-sm text-muted-foreground">
                                  {category.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {category.slug}
                          </code>
                        </td>
                        <td className="p-4">
                          <span className="font-medium">{category.productCount}</span>
                        </td>
                        <td className="p-4">
                          {category.isActive ? (
                            <Badge className="bg-green-100 text-green-800">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">
                              Inactive
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              {category.isActive ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {subcategories.map((subcat) => (
                        <tr key={subcat.id} className="hover:bg-muted/50 bg-muted/20">
                          <td className="p-4 pl-12">
                            <div className="flex items-center gap-2">
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{subcat.name}</p>
                                {subcat.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {subcat.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <code className="text-sm bg-muted px-2 py-1 rounded">
                              {subcat.slug}
                            </code>
                          </td>
                          <td className="p-4">
                            <span className="font-medium">{subcat.productCount}</span>
                          </td>
                          <td className="p-4">
                            {subcat.isActive ? (
                              <Badge className="bg-green-100 text-green-800">
                                Active
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800">
                                Inactive
                              </Badge>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                {subcat.isActive ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredCategories.length === 0 && (
            <div className="p-12 text-center">
              <FolderTree className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">
                No categories found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search or create a new category
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Category Modal (simplified inline version) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add New Category</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAddModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category Name *
                </label>
                <Input
                  placeholder="e.g., Electronics"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Slug *</label>
                <Input
                  placeholder="e.g., electronics"
                  value={newCategorySlug}
                  onChange={(e) => setNewCategorySlug(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Category description..."
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save Category
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Add React import for Fragment
import React from 'react';
