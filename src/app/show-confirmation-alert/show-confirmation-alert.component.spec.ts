import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowConfirmationAlertComponent } from './show-confirmation-alert.component';

describe('ShowConfirmationAlertComponent', () => {
  let component: ShowConfirmationAlertComponent;
  let fixture: ComponentFixture<ShowConfirmationAlertComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ShowConfirmationAlertComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ShowConfirmationAlertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
