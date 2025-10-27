// src/backend/models/product/product.model.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: Map,
    of: String,
    required: true,
    // Example: { en: "Product Name", es: "Nombre del Producto" }
  },
  description: {
    type: Map,
    of: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  subcategory: {
    type: String,
    index: true
  },
  brand: {
    type: String,
    index: true
  },
  price: {
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      required: true,
      default: 'USD'
    },
    regional: [{
      country: String,
      amount: Number,
      currency: String
    }]
  },
  compareAtPrice: {
    type: Number
  },
  costPerItem: {
    type: Number
  },
  inventory: {
    quantity: {
      type: Number,
      required: true,
      default: 0
    },
    warehouses: [{
      location: String,
      quantity: Number
    }],
    reserved: {
      type: Number,
      default: 0
    },
    available: {
      type: Number,
      default: 0
    },
    trackInventory: {
      type: Boolean,
      default: true
    },
    allowBackorder: {
      type: Boolean,
      default: false
    }
  },
  images: [{
    url: String,
    alt: String,
    position: Number
  }],
  videos: [{
    url: String,
    thumbnail: String,
    position: Number
  }],
  variants: [{
    sku: String,
    title: String,
    price: Number,
    compareAtPrice: Number,
    inventory: Number,
    attributes: Map
  }],
  attributes: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
    // Example: { color: ["Red", "Blue"], size: ["S", "M", "L"] }
  },
  specifications: {
    type: Map,
    of: String
    // Example: { weight: "250g", dimensions: "20x18x8cm" }
  },
  tags: [String],
  seo: {
    metaTitle: {
      type: Map,
      of: String
    },
    metaDescription: {
      type: Map,
      of: String
    },
    slug: {
      type: Map,
      of: String
    },
    keywords: [String]
  },
  shipping: {
    weight: Number,
    weightUnit: {
      type: String,
      enum: ['kg', 'lb', 'g', 'oz'],
      default: 'kg'
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        enum: ['cm', 'in', 'm'],
        default: 'cm'
      }
    },
    freeShipping: {
      type: Boolean,
      default: false
    },
    shippingClass: String
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  taxCode: String,
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'active',
    index: true
  },
  visibility: {
    type: String,
    enum: ['public', 'hidden', 'private'],
    default: 'public'
  },
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    sales: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    }
  },
  publishedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for search and filtering
productSchema.index({ title: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ brand: 1, status: 1 });
productSchema.index({ 'price.amount': 1 });
productSchema.index({ featured: 1, status: 1 });
productSchema.index({ createdAt: -1 });

// Virtual for checking if product is in stock
productSchema.virtual('inStock').get(function() {
  return this.inventory.available > 0;
});

// Virtual for checking if product is low on stock
productSchema.virtual('lowStock').get(function() {
  return this.inventory.available > 0 && this.inventory.available <= 10;
});

// Pre-save middleware to calculate available inventory
productSchema.pre('save', function(next) {
  if (this.isModified('inventory')) {
    this.inventory.available = this.inventory.quantity - this.inventory.reserved;
  }
  next();
});

// Static method to search products
productSchema.statics.searchProducts = async function(query, filters = {}) {
  const searchQuery = {
    status: 'active',
    ...filters
  };

  if (query) {
    searchQuery.$text = { $search: query };
  }

  return this.find(searchQuery)
    .sort({ score: { $meta: 'textScore' } })
    .limit(50);
};

// Static method to get featured products
productSchema.statics.getFeaturedProducts = async function(limit = 10) {
  return this.find({ featured: true, status: 'active' })
    .sort({ 'analytics.sales': -1 })
    .limit(limit);
};

// Instance method to increment view count
productSchema.methods.incrementViews = async function() {
  this.analytics.views += 1;
  await this.save();
};

// Instance method to update ratings
productSchema.methods.updateRatings = async function(newRating) {
  const totalRating = (this.ratings.average * this.ratings.count) + newRating;
  this.ratings.count += 1;
  this.ratings.average = totalRating / this.ratings.count;
  await this.save();
};

// Instance method to get localized title
productSchema.methods.getLocalizedTitle = function(language = 'en') {
  return this.title.get(language) || this.title.get('en');
};

// Instance method to get localized description
productSchema.methods.getLocalizedDescription = function(language = 'en') {
  return this.description.get(language) || this.description.get('en');
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
