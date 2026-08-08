import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import { LogIn, UserPlus, KeyRound, ShieldCheck, X, Building, CheckCircle2, AlertCircle, Mail, Lock, User as UserIcon } from 'lucide-react';
import { registerPublicCompany, loginUser, logoutUser, requestPasswordReset } from '../../services/authService';
import { acceptInvitation } from '../../services/invitationService';

interface AuthModalProps {
  onClose: () => void;
  initialTab?: 'login' | 'register' | 'invite' | 'forgot';
  initialInviteToken?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, initialTab = 'login', initialInviteToken = '' }) => {
  const { userProfile, refreshUserSession } = useAuth();
  const { t } = useLocalization();

  const [tab, setTab] = useState<'login' | 'register' | 'invite' | 'forgot'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Self-Registration form state (Company + Tenant + SUPER_ADMIN)
  const [regFullName, setRegFullName] = useState('');
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Invitation acceptance form state
  const [inviteToken, setInviteToken] = useState(initialInviteToken);
  const [inviteFullName, setInviteFullName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { profile } = await loginUser(loginEmail, loginPassword);
      setSuccessMsg(`Authenticated successfully as ${profile.full_name} (${profile.role}).`);
      await refreshUserSession();
      setTimeout(() => onClose(), 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName || !regCompanyName || !regEmail || !regPassword) {
      setErrorMsg('Please complete all fields to register your company workspace.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { user, company } = await registerPublicCompany({
        fullName: regFullName,
        companyName: regCompanyName,
        email: regEmail,
        password: regPassword,
      });

      setSuccessMsg(`Company workspace "${company.name}" created successfully! Signed in as ${user.full_name} (SUPER_ADMIN).`);
      await refreshUserSession();
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration error');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken || !inviteFullName || !invitePassword) {
      setErrorMsg('Please provide token, full name, and password to accept invitation.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const profile = await acceptInvitation({
        token: inviteToken,
        fullName: inviteFullName,
        password: invitePassword,
      });

      setSuccessMsg(`Invitation accepted! Account activated as ${profile.full_name} (${profile.role}).`);
      await refreshUserSession();
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invitation acceptance failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await requestPasswordReset(forgotEmail);
      setSuccessMsg(`Password reset instructions sent to ${forgotEmail}. Please check your inbox.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await logoutUser(userProfile);
    await refreshUserSession();
    setSuccessMsg('Successfully signed out.');
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            <div>
              <h3 className="font-bold text-base tracking-wide">NextTransit Supabase Auth</h3>
              <p className="text-xs text-slate-400">Production Multi-Tenant Identity Provider</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => { setTab('login'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-3 text-center border-b-2 transition-colors cursor-pointer ${
              tab === 'login' ? 'border-indigo-600 text-indigo-700 bg-white font-bold' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => { setTab('register'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-3 text-center border-b-2 transition-colors cursor-pointer ${
              tab === 'register' ? 'border-indigo-600 text-indigo-700 bg-white font-bold' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            New Company
          </button>
          <button
            onClick={() => { setTab('invite'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-3 text-center border-b-2 transition-colors cursor-pointer ${
              tab === 'invite' ? 'border-indigo-600 text-indigo-700 bg-white font-bold' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Accept Invite
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs font-medium flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* User Logged In Card */}
          {userProfile && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-800">{userProfile.full_name}</span>
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">{userProfile.role}</span>
              </div>
              <p className="text-slate-500">{userProfile.email}</p>
              <div className="pt-2 border-t border-slate-200 flex justify-end">
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-medium text-xs hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {tab === 'login' && !userProfile && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="user@company.com"
                    className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setTab('forgot')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* TAB 2: PUBLIC SELF-REGISTRATION (COMPANY + SUPER_ADMIN) */}
          {tab === 'register' && !userProfile && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="Director Akram Farsi"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Company / Organization Name *</label>
                <input
                  type="text"
                  required
                  value={regCompanyName}
                  onChange={(e) => setRegCompanyName(e.target.value)}
                  placeholder="TransLogistics Enterprise"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="contact@translogistics.com"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 10 chars, 1 number, 1 symbol"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Policy: minimum 10 characters, at least 1 digit, 1 special symbol (!@#$).
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-900">
                Self-registration creates a new Company & Tenant workspace with role <strong>SUPER_ADMIN</strong>. All other operational roles require an invitation token.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Registering Workspace...' : 'Register Company Workspace'}
              </button>
            </form>
          )}

          {/* TAB 3: ACCEPT INVITATION */}
          {tab === 'invite' && !userProfile && (
            <form onSubmit={handleAcceptInvite} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Invitation Token *</label>
                <input
                  type="text"
                  required
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  placeholder="inv_tok_..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Create Password *</label>
                <input
                  type="password"
                  required
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="Min 10 chars, 1 number, 1 symbol"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Validating Token...' : 'Accept Invitation & Activate'}
              </button>
            </form>
          )}

          {/* TAB 4: FORGOT PASSWORD */}
          {tab === 'forgot' && !userProfile && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-xs text-slate-600">
                Enter your registered work email address. We will issue a secure password reset link to verify your identity.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="user@company.com"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Sending Request...' : 'Send Password Reset Request'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
