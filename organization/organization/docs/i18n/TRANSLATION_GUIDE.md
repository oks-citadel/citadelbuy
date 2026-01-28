# Translation Guide

## Overview

This guide covers how to add, update, and manage translations across the Broxiva platform.

## Supported Languages

We currently support 15 languages:

| Code | Language | Native Name | RTL | Status |
|------|----------|-------------|-----|--------|
| `en` | English | English | No | Complete |
| `fr` | French | Français | No | Complete |
| `ar` | Arabic | العربية | Yes | Complete |
| `pt` | Portuguese | Português | No | Complete |
| `es` | Spanish | Español | No | Complete |
| `sw` | Swahili | Kiswahili | No | Complete |
| `zh` | Chinese | 中文 | No | Complete |
| `ha` | Hausa | Hausa | No | Complete |
| `yo` | Yoruba | Yorùbá | No | Complete |
| `ig` | Igbo | Igbo | No | Complete |
| `de` | German | Deutsch | No | Complete |
| `nl` | Dutch | Nederlands | No | Complete |
| `it` | Italian | Italiano | No | Complete |
| `ru` | Russian | Русский | No | Complete |
| `ja` | Japanese | 日本語 | No | Complete |

## Translation Architecture

### Frontend Translations

Frontend translations are stored in JSON files located at:
```
organization/apps/web/src/lib/i18n/locales/
```

Each language has its own JSON file (e.g., `en.json`, `fr.json`, `ar.json`).

### Backend Translations

Backend translations are stored in the database using the `Translation` model:
- `languageCode`: Language code (e.g., 'en', 'fr')
- `key`: Translation key (e.g., 'common.welcome')
- `value`: Translated text
- `namespace`: Category/namespace (e.g., 'common', 'products', 'emails')

## Adding New Translations

### Frontend

1. **Add to English file first** (`en.json`):
```json
{
  "common": {
    "newKey": "New Translation"
  }
}
```

2. **Add to all other language files**:
```json
{
  "common": {
    "newKey": "Nouvelle traduction"  // French
  }
}
```

3. **Use in React components**:
```typescript
import { useTranslation } from '@/lib/i18n/useTranslation';

function MyComponent() {
  const { t } = useTranslation();

  return <h1>{t('common.newKey')}</h1>;
}
```

### Backend

1. **Using API endpoint**:
```bash
POST /api/i18n/translations
Content-Type: application/json

{
  "languageCode": "fr",
  "key": "email.welcome",
  "value": "Bienvenue chez Broxiva",
  "namespace": "email"
}
```

2. **Bulk import**:
```bash
POST /api/i18n/translations/bulk
Content-Type: application/json

{
  "languageCode": "fr",
  "namespace": "products",
  "translations": {
    "add_to_cart": "Ajouter au panier",
    "buy_now": "Acheter maintenant",
    "out_of_stock": "Rupture de stock"
  }
}
```

3. **Using service in code**:
```typescript
import { I18nService } from '@/modules/i18n/i18n.service';

@Injectable()
export class MyService {
  constructor(private i18nService: I18nService) {}

  async addTranslation() {
    await this.i18nService.upsertTranslation({
      languageCode: 'fr',
      key: 'email.welcome',
      value: 'Bienvenue',
      namespace: 'email'
    });
  }
}
```

## Translation Keys Convention

### Naming Convention

Use dot notation for hierarchical organization:
```
namespace.category.specific
```

Examples:
- `common.button.save`
- `products.details.description`
- `checkout.payment.credit_card`
- `errors.validation.required_field`

### Namespaces

Organize translations by feature/module:
- `common`: Shared across the platform
- `nav`: Navigation labels
- `products`: Product-related content
- `cart`: Shopping cart
- `checkout`: Checkout process
- `enterprise`: B2B features
- `vendor`: Vendor dashboard
- `compliance`: Legal/compliance text
- `errors`: Error messages
- `marketing`: Marketing content
- `email`: Email templates
- `notifications`: Push/SMS notifications

## Variable Interpolation

### Frontend

Use double curly braces for variables:

```json
{
  "greeting": "Hello, {{name}}!",
  "itemCount": "You have {{count}} items in your cart"
}
```

Usage:
```typescript
t('greeting', { name: 'John' })
// Output: "Hello, John!"

t('itemCount', { count: 5 })
// Output: "You have 5 items in your cart"
```

### Backend

Same syntax for backend:
```typescript
await contentLocalization.getTranslationWithFallback(
  'greeting',
  'en',
  'common',
  { name: 'John' }
);
```

## Pluralization

### Frontend

Use `_one` and `_other` suffixes:

```json
{
  "item_one": "{{count}} item",
  "item_other": "{{count}} items"
}
```

Usage:
```typescript
tp('item', 1)  // "1 item"
tp('item', 5)  // "5 items"
```

### Language-Specific Plural Rules

Different languages have different plural rules:
- **English**: one, other
- **Arabic**: zero, one, two, few, many, other
- **Russian**: one, few, many, other
- **Chinese**: other (no plural distinction)

## Product & Category Translations

### Translating Products

```typescript
// Create product translation
await i18nService.upsertProductTranslation({
  productId: 'prod_123',
  languageCode: 'fr',
  name: 'Casque sans fil',
  description: 'Casque Bluetooth haute qualité',
  metaTitle: 'Acheter Casque sans fil',
  metaDescription: 'Meilleur casque Bluetooth 2025',
  slug: 'casque-sans-fil'
});

// Retrieve localized product
const product = await contentLocalization.localizeProduct('prod_123', 'fr');
```

### Translating Categories

```typescript
await i18nService.upsertCategoryTranslation({
  categoryId: 'cat_123',
  languageCode: 'fr',
  name: 'Électronique',
  description: 'Appareils électroniques et accessoires',
  slug: 'electronique'
});
```

## Best Practices

### 1. Always Start with English

English (`en`) is the default language. Always create English translations first.

### 2. Keep Keys Consistent

Use the same key structure across all languages:
```json
// en.json
{ "common": { "save": "Save" } }

// fr.json
{ "common": { "save": "Enregistrer" } }
```

### 3. Avoid Hardcoded Text

Bad:
```typescript
<button>Save</button>
```

Good:
```typescript
<button>{t('common.save')}</button>
```

### 4. Use Meaningful Keys

Bad:
```json
{ "btn1": "Save", "btn2": "Cancel" }
```

Good:
```json
{ "save": "Save", "cancel": "Cancel" }
```

### 5. Context Matters

Be specific about context:
```json
{
  "product.status.active": "Active",
  "user.status.active": "Active",
  "subscription.status.active": "Active"
}
```

### 6. Keep Translations Short

UI translations should be concise. Avoid long sentences in button labels.

### 7. Test All Languages

Always test your changes in multiple languages, especially RTL languages.

## Translation Workflow

### Development

1. Add translation key to `en.json`
2. Use translation key in code
3. Test in English
4. Add translations for other languages
5. Test in multiple languages

### Production

1. Export current translations
2. Send to translation service
3. Import translated content
4. QA testing
5. Deploy

## Tools & Resources

### Translation Services

- **DeepL**: High-quality machine translation
- **Google Translate**: Quick translations
- **Professional translators**: For marketing content
- **Native speakers**: For cultural adaptation

### Testing

```bash
# Test translation coverage
npm run test:i18n:coverage

# Validate translation files
npm run test:i18n:validate

# Export translations for translators
npm run i18n:export

# Import translations
npm run i18n:import
```

## Fallback Strategy

The platform uses a fallback chain:
1. Requested language (e.g., `fr`)
2. Default language (`en`)
3. Translation key itself

Example:
```typescript
// If French translation doesn't exist, falls back to English
t('products.new_feature')  // → "New Feature" (English fallback)
```

## API Endpoints

### Get Translations
```
GET /api/i18n/translations/:languageCode
GET /api/i18n/translations/:languageCode/all
```

### Create/Update Translations
```
POST /api/i18n/translations
POST /api/i18n/translations/bulk
PUT /api/i18n/translations/:languageCode/:namespace/:key
```

### Delete Translations
```
DELETE /api/i18n/translations/:languageCode/:namespace/:key
```

### Product Translations
```
POST /api/i18n/products/:productId/translations
GET /api/i18n/products/:productId/translations
GET /api/i18n/products/:productId/translations/:languageCode
DELETE /api/i18n/products/:productId/translations/:languageCode
```

### Category Translations
```
POST /api/i18n/categories/:categoryId/translations
GET /api/i18n/categories/:categoryId/translations
GET /api/i18n/categories/:categoryId/translations/:languageCode
DELETE /api/i18n/categories/:categoryId/translations/:languageCode
```

## Troubleshooting

### Translation Not Showing

1. Check if translation exists in JSON file
2. Verify key spelling
3. Check browser console for errors
4. Clear localStorage and reload

### Wrong Language Detected

1. Check browser language settings
2. Clear cookies
3. Check `BROXIVA_LANG` cookie
4. Verify `Accept-Language` header

### RTL Layout Issues

1. Verify `html[dir="rtl"]` is set
2. Check RTL CSS is loaded
3. Test with Arabic language
4. Review `rtl.css` for specific fixes

## Support

For translation issues or questions:
- Slack: #i18n-support
- Email: i18n@broxiva.com
- Documentation: https://docs.broxiva.com/i18n
