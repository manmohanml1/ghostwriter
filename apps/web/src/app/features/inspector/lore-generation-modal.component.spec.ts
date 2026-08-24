import { TestBed } from '@angular/core/testing';
import { LoreGenerationModalComponent } from './lore-generation-modal.component';
import { TreeStore } from '../../core/state/tree.store';
import { AIGeneratorService } from '../../core/services/ai-generator.service';
import { SupabaseService } from '../../core/services/supabase.service';

describe('LoreGenerationModalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoreGenerationModalComponent],
      providers: [TreeStore, AIGeneratorService, SupabaseService]
    }).compileComponents();
  });

  it('should create the lore generation modal component', () => {
    const fixture = TestBed.createComponent(LoreGenerationModalComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should allow adding custom blank entity', () => {
    const fixture = TestBed.createComponent(LoreGenerationModalComponent);
    const component = fixture.componentInstance;
    component.addNewBlankEntity();
    expect(component.entities().length).toBe(1);
    expect(component.entities()[0].selected).toBeTrue();
  });
});
