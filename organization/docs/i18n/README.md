# CitadelBuy Internationalization (i18n)

## Overview

Comprehensive multi-language support for the CitadelBuy Global B2B Enterprise Marketplace, covering 15+ languages with full RTL support.

## Quick Start

### Frontend

```typescript
// 1. Wrap your app with LanguageProvider
import { LanguageProvider } from '@/lib/i18n';

function App() {
  return (
    <LanguageProvider>
      <YourApp />
    </LanguageProvider>
  );
}

// 2. Use translations in components
import { useTranslation } from '@/lib/i18n';

function MyComponent() {
  const { t } = useTranslation();

  return <h1>{t('common.welcome')}</h1>;
}

// 3. Add language switcher
import { LanguageSwitcher } from '@/lib/i18n';

function Header() {
  return (
    <header>
      <LanguageSwitcher variant="compact" />
    </header>
  );
}
```

### Backend

```typescript
// 1. Use localization services
import { ContentLocalizationService } from '@/modules/i18n/content-localization.service';

@Injectable()
export class ProductService {
  constructor(
    private contentLocalization: ContentLocalizationService
  ) {}

  async getProduct(id: string, locale: string) {
    return await this.contentLocalization.localizeProduct(id, locale);
  }
}

// 2. Detect user locale
import { LocaleDetectionService } from '@/modules/i18n/locale-detection.service';

@Controller('products')
export class ProductController {
  constructor(
    private localeDetection: LocaleDetectionService
  ) {}

  @Get()
  async getProducts(@Req() request: Request) {
    const locale = this.localeDetection.detectLocale(request);
    // Use locale for responses
  }
}
```

## Supported Languages

| Language | Code | Native Name | Status | RTL |
|----------|------|-------------|--------|-----|
| English | en | English | ✅ Complete | No |
| French | fr | Français | ✅ Complete | No |
| Arabic | ar | العربية | ✅ Complete | Yes |
| Portuguese | pt | Português | 🟡 Partial | No |
| Spanish | es | Español | 🟡 Partial | No |
| Swahili | sw | Kiswahili | 🟡 Partial | No |
| Chinese | zh | 中文 | 🟡 Partial | No |
| Hausa | ha | Hausa | 🟡 Partial | No |
| Yoruba | yo | Yorùbá | 🟡 Partial | No |
| Igbo | ig | Igbo | 🟡 Partial | No |
| German | de | Deutsch | 🟡 Partial | No |
| Dutch | nl | Nederlands | 🟡 Partial | No |
| Italian | it | Italiano | 🟡 Partial | No |
| Russian | ru | Русский | 🟡 Partial | No |
| Japanese | ja | 日本語 | 🟡 Partial | No |

## Documentation

### Guides

1. **[Translation Guide](./TRANSLATION_GUIDE.md)**
   - How to add translations
   - Translation key conventions
   - Variable interpolation
   - Pluralization
   - Best practices

2. **[RTL Support](./RTL_SUPPORT.md)**
   - RTL implementation
   - Arabic typography
   - CSS patterns
   - Testing RTL layouts

3. **[Cultural Adaptation](./CULTURAL_ADAPTATION.md)**
   - Regional customization
   - Cultural considerations
   - Date/time formats
   - Currency & numbers
   - Business customs

4. **[Language Coverage](./LANGUAGE_COVERAGE.md)**
   - Translation status
   - Coverage metrics
   - Priority queue
   - Quality metrics

## Architecture

### Frontend Structure

```
organization/apps/web/src/lib/i18n/
├── config.ts                 # Language configuration
├── useTranslation.ts         # Translation hook
├── LanguageProvider.tsx      # Context provider
├── LanguageSwitcher.tsx      # Language selector
├── index.ts                  # Exports
└── locales/                  # Translation files
    ├── en.json
    ├── fr.json
    ├── ar.json
    ├── pt.json
    ├── es.json
    ├── sw.json
    ├── zh.json
    ├── ha.json
    ├── yo.json
    ├── ig.json
    ├── de.json
    ├── nl.json
    ├── it.json
    ├── ru.json
    └── ja.json
```

### Backend Structure

```
organization/apps/api/src/modules/i18n/
├── i18n.module.ts                      # Module definition
├── i18n.controller.ts                  # API endpoints
├── i18n.service.ts                     # Translation management
├── locale-detection.service.ts         # Locale detection
├── content-localization.service.ts     # Content localization
└── dto/
    ├── language.dto.ts                 # Language DTOs
    └── translation.dto.ts              # Translation DTOs
```

### Styling

```
organization/apps/web/src/styles/
└── rtl.css                   # RTL overrides
```

## Features

### Frontend Features

- ✅ 15+ language support
- ✅ Automatic locale detection (browser, cookie, URL)
- ✅ React hooks for translations
- ✅ Variable interpolation
- ✅ Pluralization support
- ✅ RTL layout support
- ✅ Language switcher component
- ✅ Persistent language selection
- ✅ Fallback to English

### Backend Features

- ✅ Database-backed translations
- ✅ Product/category localization
- ✅ Email template localization
- ✅ Notification localization
- ✅ Locale detection from headers/cookies
- ✅ GeoIP-based locale detection
- ✅ Currency/number formatting
- ✅ Date/time formatting
- ✅ Translation fallback chain

## API Reference

### Frontend Hooks

#### useTranslation()

```typescript
const { t, tp, tRaw, hasTranslation, language, changeLanguage, isLoading } = useTranslation();

// Basic translation
t('common.welcome') // "Welcome"

// With variables
t('common.hello', { name: 'John' }) // "Hello, John!"

// Pluralization
tp('item', 1) // "1 item"
tp('item', 5) // "5 items"

// Check if translation exists
hasTranslation('common.welcome') // true

// Change language
changeLanguage('fr')
```

#### useLanguage()

```typescript
const { language, setLanguage, isRTL, isLoading } = useLanguage();

// Current language code
console.log(language) // "en"

// Is RTL language?
console.log(isRTL) // false

// Change language
setLanguage('ar')
```

### Backend Services

#### I18nService

```typescript
// Create language
await i18nService.createLanguage({
  code: 'fr',
  name: 'French',
  nativeName: 'Français',
  isDefault: false,
  isEnabled: true,
});

// Add translation
await i18nService.upsertTranslation({
  languageCode: 'fr',
  key: 'common.welcome',
  value: 'Bienvenue',
  namespace: 'common',
});

// Get translations
const translations = await i18nService.getTranslations('fr', 'common');
```

#### LocaleDetectionService

```typescript
// Detect from request
const locale = localeDetection.detectLocale(request);

// Detect from GeoIP
const locale = localeDetection.detectFromGeoIP('FR');

// Check if supported
localeDetection.isSupported('fr') // true

// Check if RTL
localeDetection.isRTL('ar') // true
```

#### ContentLocalizationService

```typescript
// Localize product
const product = await contentLocalization.localizeProduct('prod_123', 'fr');

// Format currency
contentLocalization.formatCurrency(99.99, 'fr', 'EUR') // "99,99 €"

// Format date
contentLocalization.formatDate(new Date(), 'fr') // "6 décembre 2025"

// Get translation with fallback
const text = await contentLocalization.getTranslationWithFallback(
  'common.welcome',
  'fr',
  'common',
  { name: 'Marie' }
);
```

## Testing

### Unit Tests

```bash
# Run i18n tests
npm run test:i18n

# Test specific language
npm run test:i18n:lang -- fr
```

### E2E Tests

```bash
# Test language switching
npm run test:e2e:i18n

# Test RTL layout
npm run test:e2e:rtl
```

### Manual Testing

1. Switch to each language via language switcher
2. Verify all text is translated
3. Check RTL layout for Arabic
4. Test forms and validation messages
5. Verify date/number/currency formatting

## Contributing

### Adding a New Language

1. Add language to `config.ts`
2. Create translation file in `locales/`
3. Add to database via API or seed script
4. Update documentation
5. Test thoroughly

### Adding New Translations

1. Add key to `en.json` first
2. Add to all other language files
3. Use in code via `t()` hook
4. Test in multiple languages

### Improving Translations

1. File issue with language and key
2. Suggest better translation
3. Get native speaker review
4. Submit PR or update via API

## Performance

### Optimization Tips

- Translations are lazy-loaded per language
- Fallback to cached English if API fails
- LocalStorage caching for user preference
- Minimal bundle size impact (~50KB per language)

### Bundle Sizes

| Asset | Size |
|-------|------|
| i18n core | 15KB |
| English translations | 45KB |
| Other language (avg) | 35KB |
| RTL styles | 12KB |

## Troubleshooting

### Common Issues

**Translations not showing**
- Check translation key exists
- Verify language is loaded
- Clear browser cache/localStorage

**RTL layout broken**
- Verify `html[dir="rtl"]` is set
- Check RTL CSS is imported
- Review specific component styles

**Wrong language detected**
- Check browser language settings
- Verify cookies are enabled
- Check `Accept-Language` header

### Debug Mode

```typescript
// Enable debug logging
localStorage.setItem('DEBUG_I18N', 'true');

// View loaded translations
console.log(translations);

// Check current language
console.log(language);
```

## Support

### Resources

- **Documentation**: https://docs.citadelbuy.com/i18n
- **API Reference**: https://api.citadelbuy.com/docs#tag/i18n
- **GitHub Issues**: https://github.com/citadelbuy/platform/issues

### Contact

- **Email**: i18n@citadelbuy.com
- **Slack**: #i18n-support
- **Discord**: #internationalization

## License

Part of the CitadelBuy platform. See main LICENSE file.

---

**Last Updated**: 2025-12-06
**Version**: 1.0.0
