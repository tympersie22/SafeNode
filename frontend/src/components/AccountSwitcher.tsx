/**
 * Account Switcher Component
 * Allows users to switch between multiple accounts
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { accountStorage, type Account } from '../storage/accountStorage';
import Button from '../ui/Button';

interface AccountSwitcherProps {
  onAccountChange: (account: Account) => void;
  currentAccountId?: string;
}

const AccountSwitcher: React.FC<AccountSwitcherProps> = ({ onAccountChange, currentAccountId }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [newAccountType, setNewAccountType] = useState<Account['type']>('personal');
  const previousAccountIdRef = React.useRef<string | undefined>(undefined);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (currentAccountId) {
      accountStorage.getAccount(currentAccountId).then(account => {
        if (account) {
          setActiveAccount(account);
          // Only call onAccountChange if the account actually changed
          if (previousAccountIdRef.current !== account.id) {
            previousAccountIdRef.current = account.id;
            onAccountChange(account);
          }
        }
      });
    } else {
      accountStorage.getActiveAccount().then(account => {
        if (account) {
          setActiveAccount(account);
          // Only call onAccountChange if the account actually changed
          if (previousAccountIdRef.current !== account.id) {
            previousAccountIdRef.current = account.id;
            onAccountChange(account);
          }
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccountId]);

  const loadAccounts = async () => {
    await accountStorage.init();
    const allAccounts = await accountStorage.getAllAccounts();
    setAccounts(allAccounts);
    
    const active = await accountStorage.getActiveAccount();
    if (active) {
      setActiveAccount(active);
      // Only call onAccountChange if the account actually changed
      if (previousAccountIdRef.current !== active.id) {
        previousAccountIdRef.current = active.id;
        onAccountChange(active);
      }
    }
  };

  const handleSwitchAccount = async (accountId: string) => {
    // Only switch if it's a different account
    if (previousAccountIdRef.current === accountId) {
      setIsOpen(false);
      return;
    }
    
    await accountStorage.setActiveAccount(accountId);
    const account = await accountStorage.getAccount(accountId);
    if (account) {
      setActiveAccount(account);
      previousAccountIdRef.current = account.id;
      onAccountChange(account);
      setIsOpen(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim() || !newAccountEmail.trim()) return;

    try {
      const account = await accountStorage.createAccount(
        newAccountName,
        newAccountEmail,
        newAccountType
      );
      await accountStorage.setActiveAccount(account.id);
      setActiveAccount(account);
      previousAccountIdRef.current = account.id;
      onAccountChange(account);
      setNewAccountName('');
      setNewAccountEmail('');
      setIsCreating(false);
      setIsOpen(false);
      await loadAccounts();
    } catch (error) {
      console.error('Failed to create account:', error);
      alert('Failed to create account');
    }
  };

  const getAccountIcon = (type: Account['type']) => {
    switch (type) {
      case 'personal':
        return '👤';
      case 'work':
        return '💼';
      case 'shared':
        return '👥';
      case 'team':
        return '🏢';
      default:
        return '📁';
    }
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="sm"
        className="flex min-w-[220px] items-center justify-between gap-2"
      >
        {activeAccount && (
          <>
            <span>{getAccountIcon(activeAccount.type)}</span>
            <span className="hidden md:inline">{activeAccount.name}</span>
          </>
        )}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white shadow-lg"
          >
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Switch Account</h3>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {accounts.map(account => (
                <button
                  key={account.id}
                  onClick={() => handleSwitchAccount(account.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center gap-3 min-h-[44px] ${
                    account.id === activeAccount?.id ? 'bg-secondary-50 border-l-4 border-secondary-600' : ''
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">{getAccountIcon(account.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate text-sm sm:text-base">{account.name}</div>
                    <div className="text-xs sm:text-sm text-slate-500 truncate">{account.email}</div>
                  </div>
                  {account.id === activeAccount?.id && (
                    <svg className="w-5 h-5 text-secondary-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {!isCreating ? (
              <div className="p-4 border-t border-slate-200">
                <Button
                  onClick={() => setIsCreating(true)}
                  variant="ghost"
                  size="sm"
                  className="w-full min-h-[44px]"
                >
                  + Add Account
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreateAccount} className="p-4 border-t border-slate-200 space-y-3">
                <input
                  type="text"
                  placeholder="Account name"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg min-h-[44px] text-base"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newAccountEmail}
                  onChange={(e) => setNewAccountEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg min-h-[44px] text-base"
                  required
                />
                <select
                  value={newAccountType}
                  onChange={(e) => setNewAccountType(e.target.value as Account['type'])}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg min-h-[44px] text-base"
                >
                  <option value="personal">Personal</option>
                  <option value="work">Work</option>
                  <option value="shared">Shared</option>
                  <option value="team">Team</option>
                </select>
                <div className="flex flex-col-reverse sm:flex-row gap-2">
                  <Button type="submit" variant="primary" size="sm" className="flex-1 min-h-[44px]">
                    Create
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setNewAccountName('');
                      setNewAccountEmail('');
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1 min-h-[44px]"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AccountSwitcher;

