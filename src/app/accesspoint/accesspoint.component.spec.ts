import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AccesspointComponent } from './accesspoint.component';

describe('AccesspointComponent', () => {
  let component: AccesspointComponent;
  let fixture: ComponentFixture<AccesspointComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AccesspointComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AccesspointComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
