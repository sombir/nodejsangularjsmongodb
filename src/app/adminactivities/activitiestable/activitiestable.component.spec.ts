import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivitiestableComponent } from './activitiestable.component';

describe('ActivitiestableComponent', () => {
  let component: ActivitiestableComponent;
  let fixture: ComponentFixture<ActivitiestableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ActivitiestableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivitiestableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
