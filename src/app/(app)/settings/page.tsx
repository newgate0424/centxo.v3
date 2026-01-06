'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  User,
  Link2,
  Bell,
  Shield,
  Languages,
  Palette,
  Trash2,
  Megaphone,
} from 'lucide-react';

// Import settings content components
import { AccountSettings } from '@/components/settings/account-settings';
import { ConnectionsSettings } from '@/components/settings/connections-settings';
import { AdAccountsSettings } from '@/components/settings/ad-accounts-settings';
import { NotificationsSettings } from '@/components/settings/notifications-settings';
import { SecuritySettings } from '@/components/settings/security-settings';
import { LanguageSettings } from '@/components/settings/language-settings';
import { AppearanceSettings } from '@/components/settings/appearance-settings';
import { DeleteAccountSettings } from '@/components/settings/delete-account-settings';

type SettingsSection = 'account' | 'connections' | 'ad-accounts' | 'notifications' | 'security' | 'language' | 'appearance' | 'delete-account';

const settingsSections = [
  {
    id: 'account' as SettingsSection,
    label: 'Account',
    description: 'Manage your account details',
    icon: User,
    translationKey: 'settings.account',
  },
  {
    id: 'connections' as SettingsSection,
    label: 'Connections',
    description: 'Connected accounts',
    icon: Link2,
    translationKey: 'settings.connections',
  },
  {
    id: 'ad-accounts' as SettingsSection,
    label: 'Ad Accounts',
    description: 'Manage ad accounts & pages',
    icon: Megaphone,
    translationKey: 'settings.adAccounts',
  },
  {
    id: 'notifications' as SettingsSection,
    label: 'Notifications',
    description: 'Notification preferences',
    icon: Bell,
    translationKey: 'settings.notifications',
  },
  {
    id: 'security' as SettingsSection,
    label: 'Security',
    description: 'Security settings',
    icon: Shield,
    translationKey: 'settings.security',
  },
  {
    id: 'language' as SettingsSection,
    label: 'Language',
    description: 'Language & region',
    icon: Languages,
    translationKey: 'settings.language',
  },
  {
    id: 'appearance' as SettingsSection,
    label: 'Appearance',
    description: 'Theme settings',
    icon: Palette,
    translationKey: 'settings.appearance',
  },
  {
    id: 'delete-account' as SettingsSection,
    label: 'Delete Account',
    description: 'Permanently delete account',
    icon: Trash2,
    translationKey: 'settings.deleteAccount',
    isDanger: true,
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  // Get initial section from URL or default to 'account'
  const urlSection = searchParams.get('section') as SettingsSection;
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    urlSection || 'account'
  );

  // Update active section when URL changes
  useEffect(() => {
    if (urlSection && urlSection !== activeSection) {
      setActiveSection(urlSection);
    }
  }, [urlSection]);

  // Update URL when section changes
  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
    router.push(`/settings?section=${section}`, { scroll: false });
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'account':
        return <AccountSettings />;
      case 'connections':
        return <ConnectionsSettings />;
      case 'ad-accounts':
        return <AdAccountsSettings />;
      case 'notifications':
        return <NotificationsSettings />;
      case 'security':
        return <SecuritySettings />;
      case 'language':
        return <LanguageSettings />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'delete-account':
        return <DeleteAccountSettings />;
      default:
        return <AccountSettings />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b shrink-0">
        <h1 className="text-3xl font-bold text-foreground">
          {t('settings.title', 'Settings')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('settings.subtitle', 'Manage your account settings and preferences')}
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r bg-muted/10 shrink-0">
          <ScrollArea className="h-full py-4">
            <nav className="space-y-1 px-3">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    onClick={() => handleSectionChange(section.id)}
                    className={cn(
                      'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : section.isDanger
                          ? 'text-destructive hover:bg-destructive/5'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5 mt-0.5 shrink-0",
                      isActive && "text-primary",
                      section.isDanger && "text-destructive"
                    )} />
                    <div className="flex flex-col items-start text-left">
                      <span className="font-medium">{t(section.translationKey, section.label)}</span>
                      <span className={cn(
                        "text-xs",
                        isActive ? "text-primary/70" : "text-muted-foreground/70"
                      )}>
                        {section.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </ScrollArea>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
              {renderContent()}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

