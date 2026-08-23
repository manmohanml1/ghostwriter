import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { TreeStore } from '../../core/state/tree.store';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-modal-backdrop" (click)="closeModal.emit()">
      <div class="auth-modal-box" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="flex items-center gap-2">
            <span class="auth-icon">☁️</span>
            <div>
              <h3 class="modal-title">Ghostwriter Cloud Account</h3>
              <p class="modal-subtitle">Sync your branching stories, characters, and lore across devices.</p>
            </div>
          </div>
          <button class="btn-close" (click)="closeModal.emit()">✕</button>
        </div>

        @if (supabase.isAuthenticated()) {
          <!-- USER LOGGED IN VIEW -->
          <div class="logged-in-view">
            <div class="user-profile-badge">
              <div class="user-avatar">
                {{ (supabase.currentUser()?.email || 'U')[0].toUpperCase() }}
              </div>
              <div class="user-details">
                <span class="user-email">{{ supabase.currentUser()?.email }}</span>
                <span class="sync-badge">
                  @if (supabase.syncStatus() === 'SYNCED_CLOUD') { 🟢 Cloud Sync Active }
                  @else if (supabase.syncStatus() === 'SYNCING') { ⏳ Syncing... }
                  @else { 🟡 Local Cache Mode }
                </span>
              </div>
            </div>

            @if (supabase.lastSyncTime()) {
              <p class="last-sync-text">Last cloud snapshot: {{ supabase.lastSyncTime() }}</p>
            }

            <div class="cloud-actions">
              <button class="btn-sync-now" (click)="manualSync()">
                ☁️ Sync Current Story to Cloud
              </button>
              <button class="btn-signout" (click)="handleSignOut()">
                🚪 Sign Out
              </button>
            </div>
          </div>
        } @else {
          <!-- AUTHENTICATION FORM -->
          <div class="auth-body">
            <!-- Mode Switcher -->
            <div class="auth-tabs">
              <button 
                class="tab-btn" 
                [class.active]="authMode() === 'SIGNIN'"
                (click)="authMode.set('SIGNIN')"
              >
                Sign In
              </button>
              <button 
                class="tab-btn" 
                [class.active]="authMode() === 'SIGNUP'"
                (click)="authMode.set('SIGNUP')"
              >
                Create Account
              </button>
              <button 
                class="tab-btn" 
                [class.active]="authMode() === 'CUSTOM_SUPABASE'"
                (click)="authMode.set('CUSTOM_SUPABASE')"
              >
                ⚙️ Custom Backend
              </button>
            </div>

            @if (authMode() === 'CUSTOM_SUPABASE') {
              <!-- Custom Supabase Project Settings -->
              <div class="custom-backend-form">
                <p class="text-xs text-slate-300 mb-2">
                  Connect your own private Supabase instance or local Docker container:
                </p>
                <div class="form-group">
                  <label class="form-label">Supabase Project URL</label>
                  <input 
                    type="text" 
                    [(ngModel)]="customUrl" 
                    placeholder="https://xyzcompany.supabase.co" 
                    class="auth-input"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Anon / Public API Key</label>
                  <input 
                    type="password" 
                    [(ngModel)]="customKey" 
                    placeholder="eyJhbGciOi..." 
                    class="auth-input"
                  />
                </div>
                <button class="btn-primary mt-2" (click)="saveCustomBackend()">Save Custom Backend</button>
              </div>
            } @else {
              <!-- OAuth Providers -->
              <div class="oauth-buttons">
                <button class="btn-oauth btn-google" (click)="signInOAuth('google')">
                  <svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/><path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"/><path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"/></svg>
                  Continue with Google
                </button>

                <button class="btn-oauth btn-github" (click)="signInOAuth('github')">
                  <svg class="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  Continue with GitHub
                </button>
              </div>

              <div class="divider">
                <span>or with email</span>
              </div>

              <!-- Email Form -->
              <div class="email-form">
                <div class="form-group">
                  <label class="form-label">Email Address</label>
                  <input 
                    type="email" 
                    [(ngModel)]="emailInput" 
                    placeholder="author@domain.com" 
                    class="auth-input"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Password</label>
                  <input 
                    type="password" 
                    [(ngModel)]="passwordInput" 
                    placeholder="••••••••••••" 
                    class="auth-input"
                  />
                </div>

                @if (statusMessage()) {
                  <p class="status-msg" [class.error]="isError()">{{ statusMessage() }}</p>
                }

                <button 
                  class="btn-submit"
                  [disabled]="isSubmitting()"
                  (click)="submitAuth()"
                >
                  @if (isSubmitting()) { ⏳ Connecting... }
                  @else if (authMode() === 'SIGNIN') { 🔐 Sign In with Email }
                  @else { ✨ Create Free Author Account }
                </button>
              </div>
            }
          </div>
        }

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn-guest" (click)="closeModal.emit()">
            Continue in Guest Mode (Offline Only)
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      padding: 20px;
    }

    .auth-modal-box {
      background: #0f172a;
      border: 1px solid rgba(168, 85, 247, 0.5);
      border-radius: 18px;
      width: 480px;
      max-width: 95vw;
      padding: 28px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(168, 85, 247, 0.25);
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 14px;
    }

    .auth-icon {
      font-size: 24px;
    }

    .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: #f8fafc;
      margin: 0;
    }

    .modal-subtitle {
      font-size: 11px;
      color: #94a3b8;
      margin: 2px 0 0 0;
    }

    .btn-close {
      background: #1e293b;
      border: 1px solid #334155;
      color: #94a3b8;
      font-size: 14px;
      cursor: pointer;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-close:hover {
      background: #334155;
      color: #fff;
    }

    .auth-tabs {
      display: flex;
      background: #0b1120;
      padding: 3px;
      border-radius: 10px;
      border: 1px solid #1e293b;
      gap: 4px;
      margin-bottom: 14px;
    }

    .tab-btn {
      flex: 1;
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 600;
      padding: 6px 10px;
      border-radius: 7px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .tab-btn.active {
      background: #7c3aed;
      color: #fff;
    }

    .oauth-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .btn-oauth {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: #1e293b;
      border: 1px solid #334155;
      color: #f8fafc;
      padding: 10px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-oauth:hover {
      background: #334155;
      border-color: #475569;
    }

    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 12px 0;
      color: #475569;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .divider::before, .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid #1e293b;
    }

    .divider span {
      padding: 0 10px;
    }

    .email-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-label {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
    }

    .auth-input {
      background: #070a12;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 10px 12px;
      color: #f8fafc;
      font-size: 12px;
      outline: none;
    }

    .auth-input:focus {
      border-color: #a855f7;
    }

    .btn-submit {
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      color: #fff;
      border: none;
      padding: 11px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4);
      margin-top: 6px;
    }

    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .status-msg {
      font-size: 11px;
      color: #4ade80;
      margin: 2px 0;
    }

    .status-msg.error {
      color: #f87171;
    }

    .logged-in-view {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .user-profile-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #0b1120;
      border: 1px solid #1e293b;
      padding: 14px;
      border-radius: 12px;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 16px;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .user-email {
      font-size: 13px;
      font-weight: 700;
      color: #f8fafc;
    }

    .sync-badge {
      font-size: 10px;
      color: #94a3b8;
    }

    .last-sync-text {
      font-size: 11px;
      color: #64748b;
      font-family: 'JetBrains Mono', monospace;
    }

    .cloud-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .btn-sync-now {
      background: #7c3aed;
      color: #fff;
      border: none;
      padding: 10px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    .btn-signout {
      background: #1e293b;
      border: 1px solid #334155;
      color: #fca5a5;
      padding: 8px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-quick-connect {
      width: 100%;
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
      color: #fff;
      border: 1px solid rgba(168, 85, 247, 0.6);
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(168, 85, 247, 0.35);
      transition: all 0.15s ease;
    }

    .btn-quick-connect:hover {
      filter: brightness(1.1);
      box-shadow: 0 4px 20px rgba(168, 85, 247, 0.5);
    }

    .modal-footer {
      border-top: 1px solid #1e293b;
      padding-top: 12px;
      display: flex;
      justify-content: center;
    }

    .btn-guest {
      background: transparent;
      border: none;
      color: #64748b;
      font-size: 11px;
      cursor: pointer;
    }

    .btn-guest:hover {
      color: #94a3b8;
    }

    .w-4 { width: 16px; }
    .h-4 { height: 16px; }
  `]
})
export class AuthModalComponent {
  readonly supabase = inject(SupabaseService);
  readonly store = inject(TreeStore);
  readonly closeModal = output<void>();

  authMode = signal<'SIGNIN' | 'SIGNUP' | 'CUSTOM_SUPABASE'>('SIGNIN');
  emailInput = '';
  passwordInput = '';
  customUrl = this.supabase.getSupabaseUrl();
  customKey = this.supabase.getSupabaseKey();

  isSubmitting = signal<boolean>(false);
  statusMessage = signal<string>('');
  isError = signal<boolean>(false);

  async submitAuth(): Promise<void> {
    if (!this.emailInput || !this.passwordInput) {
      this.statusMessage.set('Please enter both email and password.');
      this.isError.set(true);
      return;
    }

    this.isSubmitting.set(true);
    this.statusMessage.set('');

    const res = this.authMode() === 'SIGNIN'
      ? await this.supabase.signIn(this.emailInput, this.passwordInput)
      : await this.supabase.signUp(this.emailInput, this.passwordInput);

    this.isSubmitting.set(false);
    this.statusMessage.set(res.message);
    this.isError.set(!res.success);

    if (res.success) {
      setTimeout(() => this.closeModal.emit(), 1200);
    }
  }

  async signInOAuth(provider: 'google' | 'github'): Promise<void> {
    this.statusMessage.set('');
    this.isError.set(false);
    this.isSubmitting.set(true);

    const res = await this.supabase.signInWithOAuth(provider);
    this.isSubmitting.set(false);

    if (res.success) {
      this.statusMessage.set(res.message);
      setTimeout(() => this.closeModal.emit(), 1000);
    } else {
      const errLower = (res.message || '').toLowerCase();
      if (errLower.includes('not enabled') || errLower.includes('unsupported provider') || errLower.includes('400')) {
        this.statusMessage.set(`⚠️ ${provider === 'google' ? 'Google' : 'GitHub'} OAuth is not configured on this Supabase project. Use Email / Password below or click ⚡ 1-Click Instant Cloud Connect!`);
      } else {
        this.statusMessage.set(res.message);
      }
      this.isError.set(true);
    }
  }

  async manualSync(): Promise<void> {
    this.isSubmitting.set(true);
    this.statusMessage.set('');
    this.isError.set(false);
    const res = await this.supabase.syncStoryToCloud(this.store.currentTree());
    this.isSubmitting.set(false);
    this.statusMessage.set(res.message);
    this.isError.set(!res.success);
  }

  async handleSignOut(): Promise<void> {
    await this.supabase.signOut();
    this.store.resetToDemoStory();
    this.statusMessage.set('Signed out successfully.');
    setTimeout(() => this.closeModal.emit(), 600);
  }

  saveCustomBackend(): void {
    this.supabase.setCustomConfig(this.customUrl, this.customKey);
    this.statusMessage.set('Custom Supabase backend configured!');
    this.isError.set(false);
  }
}
