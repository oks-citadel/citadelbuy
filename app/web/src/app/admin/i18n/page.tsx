'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, Languages, FileText, BarChart3 } from 'lucide-react';
import { useLanguages, useTranslationCoverage, type Language } from '@/lib/api/i18n';

export default function I18nDashboardPage() {
  const { data: languages = [] } = useLanguages(true);
  const enabledLanguages = languages.filter((l: Language) => l.isEnabled);
  const defaultLanguage = languages.find((l: Language) => l.isDefault);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Internationalization (i18n)</h1>
        <p className="text-muted-foreground">
          Manage languages, translations, and localization settings
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Languages</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{languages.length}</div>
            <p className="text-xs text-muted-foreground">
              {enabledLanguages.length} enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Default Language</CardTitle>
            <Languages className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {defaultLanguage ? (
                <>
                  <span className="text-2xl">{defaultLanguage.flag}</span>
                  <div>
                    <div className="text-lg font-bold">{defaultLanguage.nativeName}</div>
                    <p className="text-xs text-muted-foreground">{defaultLanguage.code}</p>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">No default set</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RTL Languages</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {languages.filter((l: Language) => l.isRTL).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Right-to-left support
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Language Management
            </CardTitle>
            <CardDescription>
              Configure languages, enable/disable languages, and set default language
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/i18n/languages">
              <Button className="w-full">Manage Languages</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Translation Management
            </CardTitle>
            <CardDescription>
              Import/export translations, edit UI strings, and track coverage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/i18n/translations">
              <Button className="w-full">Manage Translations</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Enabled Languages Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Enabled Languages</CardTitle>
          <CardDescription>
            Languages currently available to users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enabledLanguages.map((language: Language) => (
              <Card key={language.code}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{language.flag}</span>
                      <div>
                        <div className="font-semibold">{language.nativeName}</div>
                        <div className="text-sm text-muted-foreground">
                          {language.name} ({language.code})
                        </div>
                      </div>
                    </div>
                    {language.isDefault && (
                      <span className="rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
                        Default
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
