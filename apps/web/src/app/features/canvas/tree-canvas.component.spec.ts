import { TestBed } from '@angular/core/testing';
import { TreeCanvasComponent } from './tree-canvas.component';
import { TreeStore } from '../../core/state/tree.store';
import { AIGeneratorService } from '../../core/services/ai-generator.service';
import { SupabaseService } from '../../core/services/supabase.service';

describe('TreeCanvasComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreeCanvasComponent],
      providers: [TreeStore, AIGeneratorService, SupabaseService]
    }).compileComponents();
  });

  it('should create tree canvas component', () => {
    const fixture = TestBed.createComponent(TreeCanvasComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should calculate layout nodes from current story tree', () => {
    const fixture = TestBed.createComponent(TreeCanvasComponent);
    const component = fixture.componentInstance;
    expect(component.computedNodes().length).toBeGreaterThan(0);
  });
});
