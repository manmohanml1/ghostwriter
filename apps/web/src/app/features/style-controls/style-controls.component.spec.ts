import { TestBed } from '@angular/core/testing';
import { StyleControlsComponent } from './style-controls.component';
import { TreeStore } from '../../core/state/tree.store';
import { AIGeneratorService } from '../../core/services/ai-generator.service';
import { SupabaseService } from '../../core/services/supabase.service';

describe('StyleControlsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StyleControlsComponent],
      providers: [TreeStore, AIGeneratorService, SupabaseService]
    }).compileComponents();
  });

  it('should create style controls component', () => {
    const fixture = TestBed.createComponent(StyleControlsComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should update genre in store', () => {
    const fixture = TestBed.createComponent(StyleControlsComponent);
    const component = fixture.componentInstance;
    component.updateGenre('Hard Sci-Fi');
    expect(component.store.styleConfig().genre).toBe('Hard Sci-Fi');
  });
});
