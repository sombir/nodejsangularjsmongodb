import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddaccesspointComponent } from './addaccesspoint.component';

describe('AddaccesspointComponent', () => {
  let component: AddaccesspointComponent;
  let fixture: ComponentFixture<AddaccesspointComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddaccesspointComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddaccesspointComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
