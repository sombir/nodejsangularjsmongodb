import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagedApComponent } from './managed-ap.component';

describe('ManagedApComponent', () => {
  let component: ManagedApComponent;
  let fixture: ComponentFixture<ManagedApComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ManagedApComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ManagedApComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
