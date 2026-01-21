'use client';

import { useState } from 'react';
import { Shield, Lock, Smartphone, Key, Eye, EyeOff, AlertTriangle, CheckCircle, Monitor, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

const activeSessions = [
  { device: 'Chrome on Windows', location: 'San Francisco, CA', lastActive: 'Now', current: true },
  { device: 'Safari on iPhone', location: 'San Francisco, CA', lastActive: '2 hours ago', current: false },
  { device: 'Firefox on MacOS', location: 'New York, NY', lastActive: '3 days ago', current: false },
];

const securityHistory = [
  { event: 'Password changed', date: '2025-01-15', status: 'success' },
  { event: 'Login from new device', date: '2025-01-10', status: 'success' },
  { event: '2FA enabled', date: '2025-01-05', status: 'success' },
  { event: 'Failed login attempt', date: '2025-01-03', status: 'warning' },
];

export default function AccountSecurityPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-green-500" />
            Security Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your account security and privacy settings.</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Last changed 30 days ago. We recommend changing your password every 90 days.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input id="current-password" type={showPassword ? 'text' : 'password'} placeholder="Enter current password" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" placeholder="Enter new password" />
                </div>
              </div>
              <Button className="bg-gradient-to-r from-pink-500 to-violet-500 text-white">Update Password</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Two-Factor Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Authenticator App</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Use an authenticator app to generate verification codes.</p>
                </div>
                <div className="flex items-center gap-2">
                  {twoFactorEnabled && <Badge className="bg-green-500">Enabled</Badge>}
                  <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">SMS Backup</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Receive codes via SMS as a backup method.</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Recovery Codes</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Generate backup codes for account recovery.</p>
                </div>
                <Button variant="outline" size="sm">
                  <Key className="w-4 h-4 mr-2" />
                  View Codes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Security Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Login Alerts</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Get notified when someone logs into your account from a new device.</p>
                </div>
                <Switch checked={loginAlerts} onCheckedChange={setLoginAlerts} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Unusual Activity Alerts</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Get notified about suspicious account activity.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeSessions.map((session, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {session.device}
                          {session.current && <Badge variant="outline" className="text-xs">Current</Badge>}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{session.location} - {session.lastActive}</p>
                      </div>
                    </div>
                    {!session.current && (
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                        <LogOut className="w-4 h-4 mr-1" />
                        Log Out
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">Log Out All Other Devices</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Security Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityHistory.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                      {item.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      )}
                      <span>{item.event}</span>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{item.date}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Permanently delete your account and all data.</p>
                </div>
                <Button variant="destructive">Delete Account</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
