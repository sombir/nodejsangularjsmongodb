import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BackupTableComponent } from './backup-table.component';

describe('BackupTableComponent', () => {
  let component: BackupTableComponent;
  let fixture: ComponentFixture<BackupTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BackupTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BackupTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
