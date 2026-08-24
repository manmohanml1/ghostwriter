import { TestBed } from '@angular/core/testing';
import { AuthModalComponent } from './auth-modal.component';
import { TreeStore } from '../../core/state/tree.store';
import { AIGeneratorService } from '../../core/services/ai-generator.service';
import { SupabaseService } from '../../core/services/supabase.service';

describe('AuthModalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthModalComponent],
      providers: [TreeStore, AIGeneratorService, SupabaseService]
    }).compileComponents();
  });

  it('should create auth modal component', () => {
    const fixture = TestBed.createComponent(AuthModalComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should default to SIGNIN mode', () => {
    const fixture = TestBed.createComponent(AuthModalComponent);
    const component = fixture.componentInstance;
    expect(component.authMode()).toBe('SIGNIN');
  });
});
