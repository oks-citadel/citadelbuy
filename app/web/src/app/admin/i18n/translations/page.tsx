'use client';

import { useState } from 'react';
import {
  useLanguages,
  useAllTranslations,
  useBulkUpsertTranslations,
  useTranslationCoverage,
  type Language,
} from '@/lib/api/i18n';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, FileJson } from 'lucide-react';
import { toast } from 'sonner';

export default function TranslationsManagementPage() {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const { data: languages = [] } = useLanguages();
  const { data: translations = {}, isLoading } = useAllTranslations(selectedLanguage);
  const { data: coverage } = useTranslationCoverage(selectedLanguage);
  const bulkUpsert = useBulkUpsertTranslations();

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState('');
  const [importNamespace, setImportNamespace] = useState('common');

  // Flatten translations for table view
  const flattenedTranslations = Object.entries(translations).flatMap(
    ([namespace, trans]) =>
      Object.entries(trans).map(([key, value]) => ({
        namespace,
        key,
        value,
      }))
  );

  const handleExport = () => {
    const dataStr = JSON.stringify(translations, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `translations_${selectedLanguage}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Translations exported successfully');
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const parsedData = JSON.parse(importData);

      await bulkUpsert.mutateAsync({
        languageCode: selectedLanguage,
        translations: parsedData,
        namespace: importNamespace,
      });

      toast.success('Translations imported successfully');
      setIsImportDialogOpen(false);
      setImportData('');
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        toast.error('Invalid JSON format');
      } else {
        toast.error(error.response?.data?.message || 'Failed to import translations');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        setImportData(JSON.stringify(parsed, null, 2));
      } catch (error) {
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  if (isLoading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Translation Management</h1>
          <p className="text-muted-foreground">
            Manage UI translations for all languages
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Translations</DialogTitle>
                <DialogDescription>
                  Import translations from JSON file or paste JSON directly
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleImport} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="import-file">Upload JSON File</Label>
                  <Input
                    id="import-file"
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="import-namespace">Namespace</Label>
                  <Input
                    id="import-namespace"
                    value={importNamespace}
                    onChange={(e) => setImportNamespace(e.target.value)}
                    placeholder="common"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="import-data">JSON Data</Label>
                  <Textarea
                    id="import-data"
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder='{"key": "value", "another_key": "another value"}'
                    rows={15}
                    className="font-mono text-sm"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={bulkUpsert.isPending}>
                  {bulkUpsert.isPending ? 'Importing...' : 'Import Translations'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Language Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Language</CardTitle>
          <CardDescription>
            Choose a language to view and manage its translations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang: Language) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <div className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                    <span className="text-muted-foreground">({lang.code})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Translation Coverage */}
      {coverage && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                UI Translations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {coverage.ui.translated} / {coverage.ui.total}
                  </span>
                  <span className="font-medium">
                    {coverage.ui.percentage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={coverage.ui.percentage} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Product Translations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {coverage.products.translated} / {coverage.products.total}
                  </span>
                  <span className="font-medium">
                    {coverage.products.percentage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={coverage.products.percentage} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Category Translations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {coverage.categories.translated} / {coverage.categories.total}
                  </span>
                  <span className="font-medium">
                    {coverage.categories.percentage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={coverage.categories.percentage} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Translations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Translations</CardTitle>
          <CardDescription>
            {flattenedTranslations.length} translation{flattenedTranslations.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Namespace</TableHead>
                <TableHead>Key</TableHead>
                <TableHead className="w-1/2">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flattenedTranslations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No translations found. Import translations to get started.
                  </TableCell>
                </TableRow>
              ) : (
                flattenedTranslations.map((t, index) => (
                  <TableRow key={`${t.namespace}-${t.key}-${index}`}>
                    <TableCell>
                      <Badge variant="outline">{t.namespace}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{t.key}</TableCell>
                    <TableCell className="max-w-md truncate">{t.value}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* JSON Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>JSON Preview</CardTitle>
              <CardDescription>
                View translations in JSON format
              </CardDescription>
            </div>
            <FileJson className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-sm">
            {JSON.stringify(translations, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
