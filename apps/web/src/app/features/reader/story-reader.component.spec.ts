import { TestBed } from '@angular/core/testing';
import { StoryReaderComponent } from './story-reader.component';
import { TreeStore } from '../../core/state/tree.store';
import { AIGeneratorService } from '../../core/services/ai-generator.service';
import { SupabaseService } from '../../core/services/supabase.service';

describe('StoryReaderComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoryReaderComponent],
      providers: [TreeStore, AIGeneratorService, SupabaseService]
    }).compileComponents();
  });

  it('should create story reader component', () => {
    const fixture = TestBed.createComponent(StoryReaderComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should calculate word count accurately', () => {
    const fixture = TestBed.createComponent(StoryReaderComponent);
    const component = fixture.componentInstance;
    expect(component.getWordCount('Three words here')).toBe(3);
    expect(component.getWordCount('')).toBe(0);
  });
});
