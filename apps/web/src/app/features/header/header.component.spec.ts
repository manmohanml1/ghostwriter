import { TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { TreeStore } from '../../core/state/tree.store';
import { AIGeneratorService } from '../../core/services/ai-generator.service';
import { SupabaseService } from '../../core/services/supabase.service';

describe('HeaderComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [TreeStore, AIGeneratorService, SupabaseService]
    }).compileComponents();
  });

  it('should create header component', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should toggle story dropdown menu', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    const component = fixture.componentInstance;
    expect(component.showStoryMenu()).toBeFalse();
    component.toggleStoryMenu();
    expect(component.showStoryMenu()).toBeTrue();
  });
});
