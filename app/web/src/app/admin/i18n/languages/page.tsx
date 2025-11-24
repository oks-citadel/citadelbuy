'use client';

import { useState } from 'react';
import {
  useLanguages,
  useCreateLanguage,
  useUpdateLanguage,
  useDeleteLanguage,
  useInitializeLanguages,
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Globe } from 'lucide-react';
import { toast } from 'sonner';

export default function LanguagesManagementPage() {
  const { data: languages = [], isLoading } = useLanguages(true);
  const createLanguage = useCreateLanguage();
  const updateLanguage = useUpdateLanguage();
  const deleteLanguage = useDeleteLanguage();
  const initializeLanguages = useInitializeLanguages();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<any>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nativeName: '',
    flag: '',
    isDefault: false,
    isEnabled: true,
    isRTL: false,
    sortOrder: 0,
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      nativeName: '',
      flag: '',
      isDefault: false,
      isEnabled: true,
      isRTL: false,
      sortOrder: 0,
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createLanguage.mutateAsync(formData);
      toast.success('Language created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create language');
    }
  };

  const handleEdit = (language: any) => {
    setSelectedLanguage(language);
    setFormData({
      code: language.code,
      name: language.name,
      nativeName: language.nativeName,
      flag: language.flag || '',
      isDefault: language.isDefault,
      isEnabled: language.isEnabled,
      isRTL: language.isRTL,
      sortOrder: language.sortOrder,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLanguage) return;

    try {
      await updateLanguage.mutateAsync({
        code: selectedLanguage.code,
        data: {
          name: formData.name,
          nativeName: formData.nativeName,
          flag: formData.flag,
          isDefault: formData.isDefault,
          isEnabled: formData.isEnabled,
          isRTL: formData.isRTL,
          sortOrder: formData.sortOrder,
        },
      });
      toast.success('Language updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedLanguage(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update language');
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm('Are you sure you want to delete this language?')) return;

    try {
      await deleteLanguage.mutateAsync(code);
      toast.success('Language deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete language');
    }
  };

  const handleInitialize = async () => {
    try {
      await initializeLanguages.mutateAsync();
      toast.success('Default languages initialized successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initialize languages');
    }
  };

  if (isLoading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Language Management</h1>
          <p className="text-muted-foreground">
            Manage languages and their settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleInitialize} variant="outline">
            <Globe className="mr-2 h-4 w-4" />
            Initialize Defaults
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Language
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Language</DialogTitle>
                <DialogDescription>
                  Create a new language for the platform
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Language Code (ISO 639-1)</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="en"
                    required
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">English Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="English"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nativeName">Native Name</Label>
                  <Input
                    id="nativeName"
                    value={formData.nativeName}
                    onChange={(e) =>
                      setFormData({ ...formData, nativeName: e.target.value })
                    }
                    placeholder="English"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="flag">Flag Emoji</Label>
                  <Input
                    id="flag"
                    value={formData.flag}
                    onChange={(e) =>
                      setFormData({ ...formData, flag: e.target.value })
                    }
                    placeholder="🇺🇸"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isDefault"
                    checked={formData.isDefault}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isDefault: checked })
                    }
                  />
                  <Label htmlFor="isDefault">Set as default language</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isEnabled"
                    checked={formData.isEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isEnabled: checked })
                    }
                  />
                  <Label htmlFor="isEnabled">Enable language</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isRTL"
                    checked={formData.isRTL}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isRTL: checked })
                    }
                  />
                  <Label htmlFor="isRTL">Right-to-left language</Label>
                </div>
                <Button type="submit" className="w-full">
                  Create Language
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Languages</CardTitle>
          <CardDescription>
            {languages.length} language{languages.length !== 1 ? 's' : ''} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Native Name</TableHead>
                <TableHead>Flag</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>RTL</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {languages.map((language: Language) => (
                <TableRow key={language.code}>
                  <TableCell className="font-mono">{language.code}</TableCell>
                  <TableCell>{language.name}</TableCell>
                  <TableCell>{language.nativeName}</TableCell>
                  <TableCell className="text-2xl">{language.flag}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {language.isDefault && (
                        <Badge variant="default">Default</Badge>
                      )}
                      {language.isEnabled ? (
                        <Badge variant="outline" className="bg-green-50">
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50">
                          Disabled
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{language.isRTL ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{language.sortOrder}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(language)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(language.code)}
                        disabled={language.isDefault}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Language</DialogTitle>
            <DialogDescription>
              Update language settings
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Language Code</Label>
              <Input value={formData.code} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">English Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nativeName">Native Name</Label>
              <Input
                id="edit-nativeName"
                value={formData.nativeName}
                onChange={(e) =>
                  setFormData({ ...formData, nativeName: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-flag">Flag Emoji</Label>
              <Input
                id="edit-flag"
                value={formData.flag}
                onChange={(e) =>
                  setFormData({ ...formData, flag: e.target.value })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isDefault: checked })
                }
              />
              <Label htmlFor="edit-isDefault">Set as default language</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isEnabled"
                checked={formData.isEnabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isEnabled: checked })
                }
              />
              <Label htmlFor="edit-isEnabled">Enable language</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isRTL"
                checked={formData.isRTL}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isRTL: checked })
                }
              />
              <Label htmlFor="edit-isRTL">Right-to-left language</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sortOrder">Sort Order</Label>
              <Input
                id="edit-sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({ ...formData, sortOrder: parseInt(e.target.value) })
                }
              />
            </div>
            <Button type="submit" className="w-full">
              Update Language
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
