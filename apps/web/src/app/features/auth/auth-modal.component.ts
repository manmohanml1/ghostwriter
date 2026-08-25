import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { TreeStore } from '../../core/state/tree.store';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.css'
})
export class AuthModalComponent {
  readonly supabase = inject(SupabaseService);
  readonly store = inject(TreeStore);
  readonly closeModal = output<void>();

  authMode = signal<'SIGNIN' | 'SIGNUP' | 'CUSTOM_SUPABASE'>('SIGNIN');
  emailInput = '';
  passwordInput = '';
  customUrl = this.supabase.getCustomSupabaseUrl();
  customKey = this.supabase.getCustomSupabaseKey();

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

  async openCloudStory(id: string): Promise<void> {
    this.isSubmitting.set(true);
    this.statusMessage.set('Loading story from PostgreSQL Cloud...');
    const story = await this.supabase.loadStoryFromCloud(id);
    this.isSubmitting.set(false);
    if (story) {
      this.store.loadCloudStory(story);
      this.statusMessage.set(`Loaded "${story.title}"!`);
      setTimeout(() => this.closeModal.emit(), 600);
    } else {
      this.statusMessage.set('Failed to load story from cloud.');
      this.isError.set(true);
    }
  }

  async handleSignOut(): Promise<void> {
    await this.supabase.signOut();
    // Signing out must only end the cloud session. Resetting here overwrote the
    // active local draft with the demo story and made the user's work unrecoverable.
    this.statusMessage.set('Signed out successfully. Your local draft remains on this device.');
    setTimeout(() => this.closeModal.emit(), 600);
  }

  saveCustomBackend(): void {
    if (!this.customUrl || !this.customKey) {
      this.statusMessage.set('Please enter both Supabase URL and API Key to configure custom backend.');
      this.isError.set(true);
      return;
    }
    this.supabase.setCustomConfig(this.customUrl, this.customKey);
    this.statusMessage.set('Custom Supabase backend configured and active!');
    this.isError.set(false);
  }

  resetCustomBackend(): void {
    this.supabase.clearCustomConfig();
    this.customUrl = '';
    this.customKey = '';
    this.statusMessage.set('Reverted to Ghostwriter Default Cloud backend!');
    this.isError.set(false);
  }
}
