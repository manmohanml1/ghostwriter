import { TestBed } from '@angular/core/testing';
import { LoreBibleComponent } from './lore-bible.component';
import { TreeStore } from '../../core/state/tree.store';
import { AIGeneratorService } from '../../core/services/ai-generator.service';
import { SupabaseService } from '../../core/services/supabase.service';

describe('LoreBibleComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoreBibleComponent],
      providers: [TreeStore, AIGeneratorService, SupabaseService]
    }).compileComponents();
  });

  it('should create lore bible component', () => {
    const fixture = TestBed.createComponent(LoreBibleComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should format category emoji correctly', () => {
    const fixture = TestBed.createComponent(LoreBibleComponent);
    const component = fixture.componentInstance;
    expect(component.getCategoryEmoji('CHARACTER')).toBe('👤');
    expect(component.getCategoryEmoji('LOCATION')).toBe('📍');
    expect(component.getCategoryEmoji('ITEM')).toBe('🗝');
    expect(component.getCategoryEmoji('FACTION')).toBe('🛡');
  });
});
