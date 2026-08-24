import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { TreeStore } from './core/state/tree.store';
import { AIGeneratorService } from './core/services/ai-generator.service';
import { SupabaseService } from './core/services/supabase.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [TreeStore, AIGeneratorService, SupabaseService]
    }).compileComponents();
  });

  it('should create the application root component', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should toggle AI settings modal state', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.showSettingsModal()).toBeFalse();
    app.openSettingsModal();
    expect(app.showSettingsModal()).toBeTrue();
  });
});
