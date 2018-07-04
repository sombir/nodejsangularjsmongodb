import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminactivitiesComponent } from './adminactivities.component';

describe('AdminactivitiesComponent', () => {
  let component: AdminactivitiesComponent;
  let fixture: ComponentFixture<AdminactivitiesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AdminactivitiesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminactivitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
