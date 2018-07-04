import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportApComponent } from './import-ap.component';

describe('ImportApComponent', () => {
  let component: ImportApComponent;
  let fixture: ComponentFixture<ImportApComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImportApComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportApComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
