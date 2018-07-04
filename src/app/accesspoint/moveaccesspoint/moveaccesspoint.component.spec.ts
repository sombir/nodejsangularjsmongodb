import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MoveaccesspointComponent } from './moveaccesspoint.component';

describe('MoveaccesspointComponent', () => {
  let component: MoveaccesspointComponent;
  let fixture: ComponentFixture<MoveaccesspointComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MoveaccesspointComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MoveaccesspointComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
