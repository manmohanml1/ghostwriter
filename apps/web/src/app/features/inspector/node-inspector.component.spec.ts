import { TestBed } from '@angular/core/testing';
import { NodeInspectorComponent } from './node-inspector.component';
import { TreeStore } from '../../core/state/tree.store';
import { AIGeneratorService } from '../../core/services/ai-generator.service';
import { SupabaseService } from '../../core/services/supabase.service';

describe('NodeInspectorComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NodeInspectorComponent],
      providers: [TreeStore, AIGeneratorService, SupabaseService]
    }).compileComponents();
  });

  it('should create node inspector component', () => {
    const fixture = TestBed.createComponent(NodeInspectorComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should default to EDITOR tab', () => {
    const fixture = TestBed.createComponent(NodeInspectorComponent);
    const component = fixture.componentInstance;
    expect(component.activeTab()).toBe('EDITOR');
  });
});
