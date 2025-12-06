/**
 * CitadelBuy Category Types
 * Comprehensive type definitions for the category system
 */

// ============================================
// Category Status Enum
// ============================================

export type CategoryStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT';

// ============================================
// Core Category Interface
// ============================================

export interface CategoryBase {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  iconUrl?: string;
  iconName?: string;
  parentId?: string;
  level: number;
  sortOrder: number;
  status: CategoryStatus;
  isFeatured: boolean;
  isRoot: boolean;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryWithRelations extends CategoryBase {
  parent?: CategoryBase;
  children?: CategoryBase[];
  productCount: number;
  path: string[];
}

// ============================================
// Category Tree Types
// ============================================

export interface CategoryTreeNode extends CategoryBase {
  children: CategoryTreeNode[];
  depth: number;
  hasChildren: boolean;
  productCount: number;
}

export interface CategoryHierarchy {
  root: CategoryTreeNode[];
  flatList: CategoryBase[];
  totalCount: number;
}

// ============================================
// Category Seed Data Types
// ============================================

export interface CategorySeedData {
  name: string;
  slug: string;
  description: string;
  iconName: string;
  isRoot: boolean;
  isFeatured: boolean;
  sortOrder: number;
  parentSlug?: string;
}

// ============================================
// Category Dropdown Types
// ============================================

export interface CategoryDropdownOption {
  value: string;
  label: string;
  slug: string;
  level: number;
  disabled?: boolean;
  icon?: string;
  children?: CategoryDropdownOption[];
}

export interface CategoryDropdownGroup {
  label: string;
  options: CategoryDropdownOption[];
}

// ============================================
// Category Filter Types
// ============================================

export interface CategoryFilterParams {
  parentId?: string;
  status?: CategoryStatus;
  isFeatured?: boolean;
  isRoot?: boolean;
  search?: string;
  includeChildren?: boolean;
  maxDepth?: number;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'sortOrder' | 'createdAt' | 'productCount';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Category CRUD Types
// ============================================

export interface CategoryCreateInput {
  name: string;
  slug?: string;
  description?: string;
  iconName?: string;
  iconUrl?: string;
  image?: string;
  parentId?: string;
  sortOrder?: number;
  status?: CategoryStatus;
  isFeatured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface CategoryUpdateInput extends Partial<CategoryCreateInput> {
  id: string;
}

export interface CategoryBulkUpdateInput {
  ids: string[];
  updates: Partial<CategoryCreateInput>;
}

// ============================================
// Category API Response Types
// ============================================

export interface CategoryListResponse {
  data: CategoryWithRelations[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CategoryTreeResponse {
  data: CategoryTreeNode[];
  meta: {
    totalCategories: number;
    maxDepth: number;
  };
}

// ============================================
// Category Icon Map
// ============================================

export const CATEGORY_ICONS: Record<string, string> = {
  electronics: 'Smartphone',
  clothing: 'Shirt',
  'home-garden': 'Home',
  'sports-outdoors': 'Dumbbell',
  beauty: 'Sparkles',
  'toys-games': 'Gamepad2',
  automotive: 'Car',
  books: 'BookOpen',
  'health-wellness': 'Heart',
  jewelry: 'Gem',
  groceries: 'ShoppingBasket',
  'baby-kids': 'Baby',
  'pet-supplies': 'PawPrint',
  'office-supplies': 'Briefcase',
  'musical-instruments': 'Music',
  'art-crafts': 'Palette',
  'travel-luggage': 'Plane',
  'industrial-scientific': 'Microscope',
  'garden-outdoor': 'Flower2',
  appliances: 'Refrigerator',
  furniture: 'Sofa',
  'movies-tv': 'Film',
  'video-games': 'Gamepad',
  software: 'Code',
  'cell-phones': 'Smartphone',
  cameras: 'Camera',
  watches: 'Watch',
  shoes: 'Footprints',
  handbags: 'ShoppingBag',
  'men-fashion': 'User',
  'women-fashion': 'UserCircle',
  'smart-home': 'Wifi',
  collectibles: 'Trophy',
  'gift-cards': 'Gift',
  services: 'Wrench',
};
